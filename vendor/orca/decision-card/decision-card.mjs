// Shared by the builder, browser and tests. No dependencies or network access.
const OTHER = '__other__';
const KEYWORDS = new Set([
  '$schema', 'title', 'description', 'type', 'const', 'enum', 'pattern',
  'minLength', 'maxLength', 'minItems', 'maxItems', 'uniqueItems',
  'required', 'properties', 'additionalProperties', 'items'
]);

// Deliberately implements only the keywords used by decision.schema.json.
// Reject new keywords rather than silently accepting an unimplemented constraint.
function validateShape(value, schema, path, errors) {
  for (const key of Object.keys(schema)) {
    if (!KEYWORDS.has(key)) throw new Error(`Unsupported schema keyword: ${key}`);
  }
  if (Object.hasOwn(schema, 'const') && value !== schema.const) {
    errors.push(`${path}: must equal ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: must be one of ${schema.enum.join(', ')}`);
  }
  const matches = {
    string: typeof value === 'string',
    array: Array.isArray(value),
    object: value !== null && typeof value === 'object' && !Array.isArray(value)
  };
  if (schema.type && !matches[schema.type]) {
    errors.push(`${path}: expected ${schema.type}`);
    return;
  }
  if (schema.type === 'string') {
    const length = [...value].length; // JSON Schema counts Unicode code points.
    if (length < (schema.minLength ?? 0) || length > (schema.maxLength ?? Infinity)) {
      errors.push(`${path}: invalid text length`);
    }
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) {
      errors.push(`${path}: invalid text format`);
    }
  }
  if (schema.type === 'array') {
    if (value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? Infinity)) {
      errors.push(`${path}: invalid number of items`);
    }
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) {
      errors.push(`${path}: items must be unique`);
    }
    value.forEach((item, index) => validateShape(item, schema.items, `${path}[${index}]`, errors));
  }
  if (schema.type === 'object') {
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) errors.push(`${path}.${key}: required`);
    }
    for (const key of Object.keys(value)) {
      if (Object.hasOwn(schema.properties, key)) {
        validateShape(value[key], schema.properties[key], `${path}.${key}`, errors);
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}.${key}: unknown property`);
      }
    }
  }
}

export function validateDecision(data, schema) {
  const errors = [];
  validateShape(data, schema, '$', errors);
  if (errors.length) return errors;
  const ids = data.options.map((option) => option.id);
  if (new Set(ids).size !== ids.length) errors.push('$.options: IDs must be unique');
  if (!ids.includes(data.recommendation.optionId)) {
    errors.push('$.recommendation.optionId: must reference an option ID');
  }
  return errors;
}

export function formatReply(data, selection, notes = '') {
  const detail = notes.trim();
  if (!selection) return '';
  let preference;
  if (selection === OTHER) {
    if (!detail) return '';
    preference = 'I want different or modified options.';
  } else {
    const option = data.options.find((entry) => entry.id === selection);
    if (!option) throw new Error('Unknown option ID');
    preference = `I prefer ${option.title} (option: ${option.id}).`;
  }
  return [
    `Decision: ${data.id}`,
    `Question: ${data.question}`,
    preference,
    detail ? `Conditions / changes: ${detail}` : '',
    'Please discuss next steps. This card does not authorize execution.'
  ].filter(Boolean).join('\n');
}

export function mountDecisionCard(doc, data, schema) {
  const errors = validateDecision(data, schema);
  if (errors.length) throw new Error(errors.join('\n'));
  const byId = (id) => doc.getElementById(id);
  const element = (tag, text, className) => {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  byId('question').textContent = data.question;
  byId('context').textContent = data.context;
  byId('decision-id').textContent = data.id;
  doc.title = data.question;
  for (const criterion of data.criteria) {
    byId('criteria').append(element('li', criterion));
  }
  const recommended = data.options.find((option) => option.id === data.recommendation.optionId);
  byId('recommendation-title').textContent = `Suggested: ${recommended.title}`;
  byId('recommendation-reason').textContent = data.recommendation.reason;
  const radios = [];
  data.options.forEach((option, index) => {
    const card = element('article', undefined, 'option');
    const label = element('label', undefined, 'choice');
    const radio = element('input');
    radio.type = 'radio';
    radio.name = 'decision';
    radio.value = option.id;
    radio.id = `option-${index}`;
    radio.setAttribute('aria-describedby', `summary-${index}`);
    radios.push(radio);
    label.append(radio, element('span', `${String.fromCharCode(65 + index)} · ${option.title}`, 'option-title'));
    card.append(label);
    if (option.id === data.recommendation.optionId) {
      card.classList.add('recommended');
      const badge = element('p', 'Recommended', 'badge');
      badge.id = `recommended-${index}`;
      radio.setAttribute('aria-describedby', `summary-${index} recommended-${index}`);
      card.append(badge);
    }
    card.append(element('p', `Effort: ${option.effort}`, 'effort'));
    const summary = element('p', option.summary);
    summary.id = `summary-${index}`;
    card.append(summary);
    const details = element('details');
    details.append(element('summary', 'Benefits & trade-offs'));
    for (const [heading, entries] of [['Benefits', option.benefits], ['Trade-offs', option.tradeoffs]]) {
      details.append(element('h3', heading));
      const list = element('ul');
      for (const entry of entries) list.append(element('li', entry));
      details.append(list);
    }
    card.append(details);
    byId('options').append(card);
  });
  const other = byId('other');
  other.value = OTHER;
  radios.push(other);
  const notes = byId('notes');
  const reply = byId('reply');
  const copy = byId('copy');
  const status = byId('status');
  let selection = null;
  let revision = 0;
  let copying = false;
  const update = () => {
    revision += 1;
    selection = radios.find((radio) => radio.checked)?.value ?? null;
    reply.value = formatReply(data, selection, notes.value);
    notes.required = selection === OTHER;
    copy.disabled = !reply.value || copying;
    byId('select-reply').disabled = !reply.value;
    status.textContent = selection === OTHER && !notes.value.trim()
      ? 'Describe what you would change to prepare a reply.'
      : reply.value ? 'Reply prepared below. Nothing has been sent.' : 'Choose an option to prepare a reply.';
  };
  for (const radio of radios) radio.addEventListener('change', update);
  notes.addEventListener('input', update);
  const selectReply = () => {
    reply.focus();
    reply.select();
  };
  byId('select-reply').addEventListener('click', selectReply);
  copy.addEventListener('click', async () => {
    const text = reply.value;
    if (!text || copying) return;
    const startedAt = revision;
    copying = true;
    copy.disabled = true;
    try {
      // Clipboard is optional: Orca's sandbox or file:// may refuse it.
      const clipboard = doc.defaultView?.navigator.clipboard;
      if (!clipboard?.writeText) throw new Error('Clipboard unavailable');
      await clipboard.writeText(text);
      if (startedAt === revision) status.textContent = 'Copied. Paste the reply into chat yourself.';
    } catch {
      if (startedAt === revision) {
        selectReply();
        status.textContent = 'Clipboard unavailable. Reply selected; copy it manually and paste into chat.';
      }
    } finally {
      copying = false;
      copy.disabled = !reply.value;
    }
  });
  byId('clear').addEventListener('click', () => {
    for (const radio of radios) radio.checked = false;
    notes.value = '';
    update();
    radios[0].focus();
  });
  // Browsers may restore form state on reload. Every view starts unselected.
  for (const radio of radios) radio.checked = false;
  notes.value = '';
  byId('loading').hidden = true;
  byId('card').hidden = false;
  update();
}

if (typeof document !== 'undefined') {
  try {
    const data = JSON.parse(document.getElementById('decision-data').textContent);
    const schema = JSON.parse(document.getElementById('decision-schema').textContent);
    mountDecisionCard(document, data, schema);
  } catch (error) {
    document.getElementById('loading').textContent = `Unable to show decision card: ${error.message}`;
    document.getElementById('card').hidden = true;
  }
}
