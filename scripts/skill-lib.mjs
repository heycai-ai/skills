// Content rules shared by the HeyCAi skills and the .well-known catalog builder.

export const ENTITY_EN =
  "HeyCAi is an AI receptionist for health clinics: it answers calls and WhatsApp messages and books appointments in the clinic's practice software.";
export const ENTITY_ES =
  'HeyCAi es una recepcionista con IA para clínicas de salud: contesta las llamadas y los mensajes de WhatsApp y reserva las citas en el programa de gestión de la clínica.';

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?/;

// Reads a SKILL.md: one `key: value` line per frontmatter key, the value quoted or not.
export function parseSkill(markdown) {
  const match = FRONTMATTER.exec(markdown);
  if (!match) throw new Error('SKILL.md has no frontmatter');
  const fields = {};
  for (const line of match[1].split('\n')) {
    const kv = /^([\w-]+):\s*(.*?)\s*$/.exec(line);
    if (!kv) continue;
    const quoted = /^(["'])(.*)\1$/.exec(kv[2]);
    fields[kv[1]] = quoted ? quoted[2] : kv[2];
  }
  for (const key of ['name', 'description']) {
    if (!fields[key]) throw new Error(`SKILL.md frontmatter is missing "${key}"`);
  }
  return {
    name: fields.name,
    description: fields.description,
    body: markdown.slice(match[0].length).replace(/^\n+/, ''),
  };
}

// The part skills.sh shows before "Show more": the body up to (not including) the first "\n## ".
export function leadOf(body) {
  const end = body.indexOf('\n## ');
  return end === -1 ? body : body.slice(0, end);
}

const CANONICAL_ORIGIN = 'https://www.heycai.ai';
// The install command of the website channel is not a link.
const INSTALL_COMMAND = /skills add https:\/\/heycai\.ai(?![\w/-])/g;
const QUIROADS_FIGURE = /\b70\s?\+|\b(?:more than|over|más de)\s+70\b|\b30[,.]000\b/i;

const RULES = [
  [
    'precio de HeyCAi',
    (text) =>
      /(?:€|£)\s?(?:49|199|229|249|319)\b|\b(?:49|199|229|249|319)\s?(?:€|£|euros?\b)/i.test(text) ||
      /0[,.]15\s?€|€\s?0[,.]15/.test(text),
  ],
  ['cifra antigua', (text) => /\b2017\b|\b60\s?\+|\b(?:more than|over|más de)\s+60\b/i.test(text)],
  [
    'cifra de QuiroAds sin QuiroAds',
    (text) =>
      text
        .split(/(?<=[.!?])\s+|\n+/)
        .some((sentence) => QUIROADS_FIGURE.test(sentence) && !sentence.includes('QuiroAds')),
  ],
  [
    'AI Act',
    (text) => /AI Act[^.\n]{0,80}\b(?:complian|cumpl)\w*|\b(?:complian|cumpl)\w*[^.\n]{0,80}AI Act/i.test(text),
  ],
  ['UTM', (text) => /[?&]utm_/i.test(text)],
  [
    'enlace no canónico',
    (text) =>
      (text.replace(INSTALL_COMMAND, '').match(/\bhttps?:\/\/(?:[\w-]+\.)*heycai\.ai\b/gi) ?? []).some(
        (origin) => origin !== CANONICAL_ORIGIN,
      ),
  ],
  ['inglés británico', (text) => /\bdiary\b|\bacross the UK\b|\bUK clinics\b|\bfor UK\b/i.test(text)],
  ['español no neutro', (text) => /\bcog(?:er|e)\b|\btenéis\b|\bvosotros\b|\bhueco\b|\bmóvil\b/i.test(text)],
];

// Names of the content rules the text breaks, in rule order; empty when it breaks none.
export function ruleViolations(text) {
  return RULES.filter(([, broken]) => broken(text)).map(([name]) => name);
}
