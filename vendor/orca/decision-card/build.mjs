#!/usr/bin/env node
import { readFile, stat, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { validateDecision } from './decision-card.mjs';

const MAX_INPUT_BYTES = 256 * 1024;
export const MAX_HTML_BYTES = 512 * 1024;
const here = (name) => new URL(name, import.meta.url);

// JSON in a script data block still passes through the HTML parser. Escape the
// HTML-significant characters so even a literal closing script tag stays data.
export function scriptJSON(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (char) =>
    `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

export async function renderDecision(data) {
  const schema = JSON.parse(await readFile(here('decision.schema.json'), 'utf8'));
  const errors = validateDecision(data, schema);
  if (errors.length) throw new Error(`Invalid decision:\n${errors.join('\n')}`);
  let html = await readFile(here('decision-card.html'), 'utf8');
  const runtime = await readFile(here('decision-card.mjs'), 'utf8');
  if (/<\/script[\s>]/i.test(runtime)) throw new Error('Runtime contains an unsafe script terminator');
  for (const [name, replacement] of [
    ['SCHEMA', `<script id="decision-schema" type="application/json">${scriptJSON(schema)}</script>`],
    ['DATA', `<script id="decision-data" type="application/json">${scriptJSON(data)}</script>`],
    ['RUNTIME', `<script type="module">\n${runtime}\n</script>`]
  ]) {
    const marker = `<!-- DECISION_${name} -->`;
    if (html.split(marker).length !== 2) throw new Error(`Expected one ${name} marker`);
    // Function replacement prevents JSON containing $&, $' or $` becoming markup.
    html = html.replace(marker, () => replacement);
  }
  if (Buffer.byteLength(html, 'utf8') >= MAX_HTML_BYTES) {
    throw new Error('Generated page must be under 512 KiB');
  }
  return html;
}

export async function main(args) {
  const checkOnly = args[0] === '--check';
  const input = checkOnly ? args[1] : args[0];
  const output = checkOnly ? null : args[1];
  if (args.length !== 2 || !input || (!checkOnly && !output)) {
    throw new Error('Usage: node build.mjs INPUT.json OUTPUT.html\n       node build.mjs --check INPUT.json');
  }
  const info = await stat(input);
  if (!info.isFile() || info.size > MAX_INPUT_BYTES) {
    throw new Error('Input must be a regular JSON file no larger than 256 KiB');
  }
  const raw = await readFile(input);
  if (raw.length > MAX_INPUT_BYTES) throw new Error('Input exceeds 256 KiB');
  const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
  const html = await renderDecision(data);
  if (checkOnly) {
    console.log('PASS: schema, option IDs, recommendation reference, and generated page size');
  } else {
    if (!output.endsWith('.html')) throw new Error('Output must end in .html');
    // Do not overwrite templates, inputs, or an earlier decision by accident.
    await writeFile(output, html, { flag: 'wx', mode: 0o600 });
    console.log(`Created ${output} (${Buffer.byteLength(html, 'utf8')} bytes)`);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
