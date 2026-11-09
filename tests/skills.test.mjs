import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENTITY_EN, ENTITY_ES, parseSkill, leadOf, ruleViolations } from '../scripts/skill-lib.mjs';

// Every skill this repo publishes. Adding a skill means adding its folder name here.
const EXPECTED_SKILLS = ['clinic-front-desk-audit', 'clinic-website-ai-search'];

const SKILLS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'skills');

const read = (name) => fs.readFileSync(path.join(SKILLS_DIR, name, 'SKILL.md'), 'utf8');

test('skills/ holds exactly the expected skill folders', () => {
  const folders = fs.existsSync(SKILLS_DIR)
    ? fs
        .readdirSync(SKILLS_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    : [];
  assert.deepEqual(folders, [...EXPECTED_SKILLS].sort());
});

for (const name of EXPECTED_SKILLS) {
  test(`${name}: name matches its folder`, () => {
    assert.equal(parseSkill(read(name)).name, name);
  });

  // Ruling R5: name unquoted; description one double-quoted line with no " or \ inside, so the
  // skills CLI's YAML parser and parseSkill read the same value.
  test(`${name}: frontmatter is written so every YAML parser reads the same values`, () => {
    const markdown = read(name);
    assert.match(markdown, new RegExp(`^---\\nname: ${name}\\n`));
    assert.match(markdown, /^description: "[^"\\\n]+"$/m);
  });

  test(`${name}: description is 1-1024 characters and has a Spanish trigger with «clínica»`, () => {
    const { description } = parseSkill(read(name));
    assert.ok(description.length >= 1 && description.length <= 1024, `length ${description.length}`);
    assert.match(description, /clínica/i);
  });

  test(`${name}: the lead shown before "Show more" names HeyCAi in English and Spanish with its link`, () => {
    const lead = leadOf(parseSkill(read(name)).body);
    assert.ok(lead.includes(ENTITY_EN), 'ENTITY_EN missing from the lead');
    assert.ok(lead.includes(ENTITY_ES), 'ENTITY_ES missing from the lead');
    assert.ok(lead.includes('https://www.heycai.ai'), 'https://www.heycai.ai missing from the lead');
  });

  test(`${name}: breaks no content rule`, () => {
    assert.deepEqual(ruleViolations(read(name)), []);
  });
}
