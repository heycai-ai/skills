import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENTITY_EN, ENTITY_ES, parseSkill, leadOf, ruleViolations } from '../scripts/skill-lib.mjs';

test('entity sentences are the literals from ORG_DESCRIPTION', () => {
  assert.equal(
    ENTITY_EN,
    "HeyCAi is an AI receptionist for health clinics: it answers calls and WhatsApp messages and books appointments in the clinic's practice software.",
  );
  assert.equal(
    ENTITY_ES,
    'HeyCAi es una recepcionista con IA para clínicas de salud: contesta las llamadas y los mensajes de WhatsApp y reserva las citas en el programa de gestión de la clínica.',
  );
});

test('parseSkill reads quoted frontmatter values', () => {
  const md = '---\nname: "demo-skill"\ndescription: "Does a thing: well. Use when asked."\n---\n\n# Demo\n\nBody text.\n';
  assert.deepEqual(parseSkill(md), {
    name: 'demo-skill',
    description: 'Does a thing: well. Use when asked.',
    body: '# Demo\n\nBody text.\n',
  });
});

test('parseSkill reads unquoted frontmatter values', () => {
  const md = '---\nname: demo-skill\ndescription: Does a thing: well. Use when asked.\n---\n# Demo\n';
  assert.deepEqual(parseSkill(md), {
    name: 'demo-skill',
    description: 'Does a thing: well. Use when asked.',
    body: '# Demo\n',
  });
});

test('parseSkill throws when name is missing', () => {
  assert.throws(() => parseSkill('---\ndescription: x\n---\n# T\n'), Error);
});

test('parseSkill throws when description is missing', () => {
  assert.throws(() => parseSkill('---\nname: x\n---\n# T\n'), Error);
});

test('parseSkill throws when there is no frontmatter', () => {
  assert.throws(() => parseSkill('# T\n'), Error);
});

test('leadOf returns the body up to the first level-2 heading', () => {
  assert.equal(leadOf('# T\n\n> a\n\n## S\nx'), '# T\n\n> a\n');
});

test('leadOf returns the whole body when there is no level-2 heading', () => {
  assert.equal(leadOf('# T\n\n> a\n'), '# T\n\n> a\n');
});

const cases = [
  ['precio de HeyCAi', 'from €229/month', 'a first visit worth €45'],
  ['precio de HeyCAi', 'only 0,15 € per minute', null],
  ['cifra antigua', 'since 2017', 'since 2020'],
  ['cifra antigua', 'more than 60 clinics', null],
  [
    'cifra de QuiroAds sin QuiroAds',
    '70+ clinics use HeyCAi.',
    'The QuiroAds team has worked with more than 70 clinics since 2020.',
  ],
  ['cifra de QuiroAds sin QuiroAds', 'QuiroAds runs ads. It has 30,000 patients.', null],
  ['AI Act', 'fully AI Act compliant', 'HeyCAi says it is an AI in every greeting.'],
  ['AI Act', 'cumple con el AI Act', null],
  ['UTM', 'https://www.heycai.ai/?utm_source=x', 'https://www.heycai.ai/?ref=x'],
  ['enlace no canónico', 'http://heycai.ai/pricing', 'https://www.heycai.ai/pricing'],
  ['enlace no canónico', 'https://heycai.ai/es/precios', 'npx skills add https://heycai.ai'],
  ['enlace no canónico', 'https://try.heycai.ai', null],
  ['enlace no canónico', 'npx skills add https://heycai.ai/pricing', null],
  ['inglés británico', 'check the diary', 'check the calendar'],
  ['inglés británico', 'clinics across the UK', null],
  ['español no neutro', 'coger el teléfono', 'contestar el teléfono'],
  ['español no neutro', 'si tenéis un hueco libre', null],
];

for (const [rule, bad, clean] of cases) {
  test(`ruleViolations flags "${bad}" as ${rule}`, () => {
    assert.deepEqual(ruleViolations(bad), [rule]);
  });
  if (clean !== null) {
    test(`ruleViolations accepts "${clean}"`, () => {
      assert.deepEqual(ruleViolations(clean), []);
    });
  }
}

test('ruleViolations lists every broken rule once', () => {
  assert.deepEqual(ruleViolations('from €229/month since 2017. Plans from €249.'), [
    'precio de HeyCAi',
    'cifra antigua',
  ]);
});
