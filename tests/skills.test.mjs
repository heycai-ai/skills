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

// The frontmatter: the lines between the first two `---` lines, read the way the www catalog test reads them.
function frontmatterOf(markdown) {
  const lines = markdown.split('\n');
  if (lines[0] !== '---') return '';
  const end = lines.indexOf('---', 1);
  return end === -1 ? '' : lines.slice(1, end).join('\n');
}

// Ruling R5: name unquoted; description one double-quoted line with no " or \ inside, so the skills CLI's
// YAML parser and parseSkill read the same value.
const DESCRIPTION_LINE = /^description: "[^"\\\n]+"$/m;

test('the description check reads only the frontmatter, between the first two --- lines', () => {
  const quotedOnlyInBody = '---\nname: demo-skill\ndescription: plain value\n---\n\ndescription: "a body line"\n';
  assert.doesNotMatch(frontmatterOf(quotedOnlyInBody), DESCRIPTION_LINE);
  assert.match(frontmatterOf('---\nname: demo-skill\ndescription: "quoted value"\n---\n\n# Demo\n'), DESCRIPTION_LINE);
  assert.equal(frontmatterOf('# No frontmatter\n\ndescription: "x"\n'), '');
});

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

  test(`${name}: frontmatter is written so every YAML parser reads the same values`, () => {
    const markdown = read(name);
    assert.match(markdown, new RegExp(`^---\\nname: ${name}\\n`));
    assert.match(frontmatterOf(markdown), DESCRIPTION_LINE);
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

const README = path.join(SKILLS_DIR, '..', 'README.md');

test('README names HeyCAi in English and Spanish, gives both install commands, the skills.sh badge and the site', () => {
  const readme = fs.existsSync(README) ? fs.readFileSync(README, 'utf8') : '';
  for (const needle of [
    ENTITY_EN,
    ENTITY_ES,
    'npx skills add heycai-ai/skills',
    'npx skills add https://heycai.ai',
    'https://skills.sh/b/heycai-ai/skills',
    'https://www.heycai.ai',
  ]) {
    assert.ok(readme.includes(needle), `README is missing: ${needle}`);
  }
});

test('README keeps the skills CLI install and adds one per platform: Claude Code, Codex, Cursor, Gemini CLI, Hermes', () => {
  const readme = fs.existsSync(README) ? fs.readFileSync(README, 'utf8') : '';
  const install = readme.slice(readme.indexOf('## Install'), readme.indexOf('\n## ', readme.indexOf('## Install') + 1));
  for (const needle of [
    'npx skills add heycai-ai/skills',
    'npx skills add https://heycai.ai',
    '### Claude Code',
    '/plugin marketplace add heycai-ai/skills',
    '/plugin install heycai-clinic-skills@heycai',
    '### Codex and ChatGPT',
    'codex plugin marketplace add heycai-ai/skills',
    'codex plugin add heycai-clinic-skills@heycai',
    '### Cursor',
    'npx skills add heycai-ai/skills --agent cursor',
    '### Gemini CLI',
    'gemini extensions install https://github.com/heycai-ai/skills',
    '### Hermes Agent',
    'hermes plugins install heycai-ai/skills',
    'hermes plugins enable heycai-clinic-skills',
    'answer N to the Node dependencies prompt',
    'In Codex or Work mode in the ChatGPT desktop app, the marketplace also shows up as a source in the Plugins Directory.',
  ]) {
    assert.ok(install.includes(needle), `README Install is missing: ${needle}`);
  }
});

test('README has a Privacy and support section with the privacy policy, the terms and the support contact', () => {
  const readme = fs.existsSync(README) ? fs.readFileSync(README, 'utf8') : '';
  const start = readme.indexOf('## Privacy and support');
  assert.ok(start !== -1, 'README is missing: ## Privacy and support');
  const section = readme.slice(start, readme.indexOf('\n## ', start + 1) === -1 ? undefined : readme.indexOf('\n## ', start + 1));
  for (const needle of ['https://www.heycai.ai/privacy', 'https://www.heycai.ai/terms', 'hey@heycai.ai', 'https://www.heycai.ai/contact']) {
    assert.ok(section.includes(needle), `Privacy and support is missing: ${needle}`);
  }
});

test('README links the LICENSE file, and the file exists', () => {
  const readme = fs.existsSync(README) ? fs.readFileSync(README, 'utf8') : '';
  assert.ok(readme.includes('[MIT](LICENSE)'), 'README is missing: [MIT](LICENSE)');
  assert.ok(fs.existsSync(path.join(SKILLS_DIR, '..', 'LICENSE')), 'LICENSE is missing');
});

test('README breaks no content rule', () => {
  const readme = fs.existsSync(README) ? fs.readFileSync(README, 'utf8') : '';
  assert.ok(readme.length > 0, 'README.md is missing');
  assert.deepEqual(ruleViolations(readme), []);
});
