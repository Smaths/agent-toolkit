import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateDecision, formatReply, mountDecisionCard } from './decision-card.mjs';
import { renderDecision, scriptJSON, MAX_HTML_BYTES } from './build.mjs';

const fixture = JSON.parse(await readFile(new URL('example.json', import.meta.url), 'utf8'));
const schema = JSON.parse(await readFile(new URL('decision.schema.json', import.meta.url), 'utf8'));
const clone = () => structuredClone(fixture);
const builder = new URL('build.mjs', import.meta.url);

// Minimal DOM contract, not a browser emulator. Real layout, focus, keyboard,
// screen-reader behavior and Orca sandbox checks remain manual (see README).
class Element {
  constructor(tag = 'div') {
    this.tagName = tag;
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.hidden = false;
    this.textContent = '';
    this.classList = { add: (name) => { this.className = `${this.className ?? ''} ${name}`; } };
  }
  set innerHTML(_) { throw new Error('Untrusted HTML insertion'); }
  append(...children) { this.children.push(...children); }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(name, handler) { (this.listeners[name] ??= []).push(handler); }
  async dispatch(name) { for (const handler of this.listeners[name] ?? []) await handler(); }
  focus() { this.focused = true; }
  select() { this.selected = true; }
}
function fakeDocument(clipboard) {
  const nodes = new Map();
  const created = [];
  return {
    nodes, created,
    defaultView: { navigator: { clipboard } },
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, new Element());
      return nodes.get(id);
    },
    createElement(tag) {
      const element = new Element(tag);
      created.push(element);
      return element;
    }
  };
}
function setup(clipboard) {
  const doc = fakeDocument(clipboard);
  mountDecisionCard(doc, clone(), schema);
  const get = (id) => doc.getElementById(id);
  const radios = [...doc.created.filter((node) => node.type === 'radio'), get('other')];
  const choose = async (index) => {
    radios.forEach((radio, i) => { radio.checked = i === index; });
    await radios[index].dispatch('change');
  };
  return { doc, get, radios, choose };
}

test('example satisfies schema and semantic constraints', () => {
  assert.deepEqual(validateDecision(fixture, schema), []);
});

const invalidCases = [
  ['two options', (d) => d.options.pop()],
  ['four options', (d) => d.options.push(d.options[0])],
  ['duplicate IDs', (d) => { d.options[1].id = d.options[0].id; }],
  ['dangling recommendation', (d) => { d.recommendation.optionId = 'absent'; }],
  ['missing explanation', (d) => { delete d.recommendation.reason; }],
  ['empty tradeoffs', (d) => { d.options[0].tradeoffs = []; }],
  ['empty benefits', (d) => { d.options[0].benefits = []; }],
  ['unknown effort', (d) => { d.options[0].effort = 'tiny'; }],
  ['unknown version', (d) => { d.schemaVersion = '2.0'; }],
  ['whitespace question', (d) => { d.question = '  \n '; }],
  ['long question', (d) => { d.question = 'a'.repeat(201); }],
  ['duplicate criteria', (d) => { d.criteria = ['same', 'same']; }],
  ['no criteria', (d) => { d.criteria = []; }],
  ['invalid ID', (d) => { d.id = '../elsewhere'; }],
  ['wrong type', (d) => { d.options = null; }],
  ['extra top-level field', (d) => { d.execute = 'something'; }],
  ['extra option field', (d) => { d.options[0].html = '<b>no</b>'; }],
  ['prototype-like field', (d) => { Object.defineProperty(d, '__proto__', { enumerable: true, value: {} }); }]
];
for (const [label, mutate] of invalidCases) {
  test(`rejects ${label}`, () => {
    const data = clone();
    mutate(data);
    assert.ok(validateDecision(data, schema).length > 0);
  });
}

test('rejects root values that are not objects', () => {
  for (const data of [null, [], 'x', 2, false]) assert.ok(validateDecision(data, schema).length);
});
test('uses Unicode code points for text length', () => {
  const data = clone();
  data.question = '🦊'.repeat(200);
  assert.deepEqual(validateDecision(data, schema), []);
});
test('fails closed when schema adds an unsupported keyword', () => {
  assert.throws(() => validateDecision(fixture, { ...schema, allOf: [] }), /Unsupported schema keyword/);
});

test('no preference or incomplete Other yields no reply', () => {
  assert.equal(formatReply(fixture, null), '');
  assert.equal(formatReply(fixture, '__other__', '   '), '');
  assert.throws(() => formatReply(fixture, 'unknown'), /Unknown option/);
});
test('reply identifies decision and chosen option, includes notes, and grants no execution', () => {
  const reply = formatReply(fixture, 'hosted-search', '  Compare recurring costs first.  ');
  assert.match(reply, /Decision: example-documentation-search/);
  assert.match(reply, /option: hosted-search/);
  assert.match(reply, /Conditions \/ changes: Compare recurring costs first\./);
  assert.match(reply, /does not authorize execution/);
});
test('Other expresses a revision rather than accepting the recommendation', () => {
  const reply = formatReply(fixture, '__other__', 'Include a no-search option.');
  assert.match(reply, /different or modified options/);
  assert.doesNotMatch(reply, /I prefer/);
});

test('script data serialization round-trips hostile text without script termination', () => {
  const value = { text: '</script><img src=x onerror=alert(1)> & $& $\' $` \u2028\u2029' };
  const escaped = scriptJSON(value);
  assert.doesNotMatch(escaped, /[<>&\u2028\u2029]/u);
  assert.deepEqual(JSON.parse(escaped), value);
});
test('build embeds schema, data and module exactly once with no external assets', async () => {
  const data = clone();
  data.question = '</script><img src=x onerror=alert(1)> $& $\' $`';
  const html = await renderDecision(data);
  const match = html.match(/<script id="decision-data" type="application\/json">([^]*?)<\/script>/);
  assert.deepEqual(JSON.parse(match[1]), data);
  assert.equal((html.match(/<script\b/g) ?? []).length, 3);
  assert.ok(Buffer.byteLength(html) < MAX_HTML_BYTES);
  assert.doesNotMatch(html, /<!-- DECISION_|<img src=x|<script[^>]+src=|<link[^>]+href=/);
  assert.doesNotMatch(html, /\bfetch\s*\(|\bXMLHttpRequest\b|\blocalStorage\b|\bpostMessage\s*\(/);
});
test('builder rejects invalid data before producing HTML', async () => {
  await assert.rejects(renderDecision({}), /Invalid decision/);
});

test('initial controls are empty and disabled; recommendation is not selected', () => {
  const { get, radios } = setup();
  assert.ok(radios.every((radio) => !radio.checked));
  assert.equal(get('reply').value, '');
  assert.equal(get('copy').disabled, true);
  assert.equal(get('select-reply').disabled, true);
  assert.equal(get('card').hidden, false);
});
test('selection, notes, Other, and clear update the reply', async () => {
  const { get, radios, choose } = setup();
  await choose(1);
  assert.match(get('reply').value, /option: hosted-search/);
  assert.equal(get('copy').disabled, false);
  get('notes').value = 'Check cost';
  await get('notes').dispatch('input');
  assert.match(get('reply').value, /Check cost/);
  await choose(3);
  assert.equal(get('notes').required, true);
  assert.match(get('reply').value, /modified options/);
  get('notes').value = '';
  await get('notes').dispatch('input');
  assert.equal(get('reply').value, '');
  assert.equal(get('copy').disabled, true);
  await get('clear').dispatch('click');
  assert.ok(radios.every((radio) => !radio.checked));
  assert.equal(get('notes').required, false);
  assert.equal(radios[0].focused, true);
});
test('all input content is inserted as text, not HTML', () => {
  const data = clone();
  data.options[0].summary = '<img src=x onerror=alert(1)>';
  const doc = fakeDocument();
  mountDecisionCard(doc, data, schema);
  assert.ok(doc.created.some((node) => node.textContent === data.options[0].summary));
});
test('clipboard absence or rejection falls back to selected text', async () => {
  for (const clipboard of [undefined, { writeText: async () => { throw new Error('Denied'); } }]) {
    const { get, choose } = setup(clipboard);
    await choose(0);
    await get('copy').dispatch('click');
    assert.equal(get('reply').selected, true);
    assert.match(get('status').textContent, /copy it manually/);
    assert.equal(get('copy').disabled, false);
  }
});
test('clipboard success only copies, and Select reply works separately', async () => {
  const copied = [];
  const { get, choose } = setup({ writeText: async (text) => { copied.push(text); } });
  await choose(2);
  await get('copy').dispatch('click');
  assert.deepEqual(copied, [get('reply').value]);
  assert.match(get('status').textContent, /Paste the reply into chat yourself/);
  await get('select-reply').dispatch('click');
  assert.equal(get('reply').selected, true);
});
test('late clipboard completion does not overwrite a newer decision status', async () => {
  let finish;
  const { get, choose } = setup({ writeText: () => new Promise((resolve) => { finish = resolve; }) });
  await choose(0);
  const pending = get('copy').dispatch('click');
  await get('clear').dispatch('click');
  finish();
  await pending;
  assert.equal(get('status').textContent, 'Choose an option to prepare a reply.');
  assert.equal(get('copy').disabled, true);
});

test('CLI checks, builds privately, refuses overwrites and handles errors', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'decision-card-test-'));
  try {
    const input = join(dir, 'input.json');
    const output = join(dir, 'output.html');
    await writeFile(input, JSON.stringify(fixture));
    const run = (...args) => spawnSync(process.execPath, [builder.pathname, ...args], { encoding: 'utf8' });
    assert.equal(run('--check', input).status, 0);
    assert.equal(run(input, output).status, 0);
    const first = await readFile(output, 'utf8');
    assert.equal(run(input, output).status, 1);
    assert.equal(await readFile(output, 'utf8'), first);
    assert.equal(run().status, 1);
    assert.equal(run(input, join(dir, 'bad.txt')).status, 1);
    await writeFile(input, '{not json');
    assert.equal(run('--check', input).status, 1);
    await writeFile(input, ' '.repeat(256 * 1024 + 1));
    assert.equal(run('--check', input).status, 1);
    await writeFile(input, Buffer.from([0xff]));
    assert.equal(run('--check', input).status, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
