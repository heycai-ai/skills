import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { buildIndex, writeWellKnown } from '../scripts/build-wellknown.mjs';

const SCHEMA = 'https://schemas.agentskills.io/discovery/0.2.0/schema.json';
const DESCRIPTION = 'Demo skill for the catalog tests. Use when testing the builder.';

function demoSkill(name, description = DESCRIPTION) {
  return `---\nname: ${name}\ndescription: "${description}"\n---\n\n# ${name}\n\nBody.\n`;
}

function makeSkillsDir(skills) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heycai-skills-test-'));
  for (const [folder, markdown] of Object.entries(skills)) {
    fs.mkdirSync(path.join(dir, folder));
    fs.writeFileSync(path.join(dir, folder, 'SKILL.md'), markdown);
  }
  return dir;
}

const sha256 = (data) => createHash('sha256').update(data).digest('hex');

test('buildIndex returns the discovery index and the files for one skill', (t) => {
  const markdown = demoSkill('demo-skill');
  const dir = makeSkillsDir({ 'demo-skill': markdown });
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const { index, files } = buildIndex(dir);

  assert.deepEqual(index, {
    $schema: SCHEMA,
    skills: [
      {
        name: 'demo-skill',
        type: 'skill-md',
        description: DESCRIPTION,
        url: '/.well-known/agent-skills/demo-skill/SKILL.md',
        digest: `sha256:${sha256(fs.readFileSync(path.join(dir, 'demo-skill', 'SKILL.md')))}`,
        files: ['SKILL.md'],
      },
    ],
  });
  assert.deepEqual(Object.keys(index), ['$schema', 'skills']);
  assert.deepEqual(Object.keys(index.skills[0]), ['name', 'type', 'description', 'url', 'digest', 'files']);
  assert.equal(files.length, 1);
  assert.equal(files[0].path, 'demo-skill/SKILL.md');
  assert.ok(Buffer.isBuffer(files[0].content));
  assert.equal(files[0].content.toString('utf8'), markdown);
});

test('buildIndex sorts skills by name and ignores folders without SKILL.md', (t) => {
  const dir = makeSkillsDir({ 'zeta-skill': demoSkill('zeta-skill'), 'alpha-skill': demoSkill('alpha-skill') });
  fs.mkdirSync(path.join(dir, 'not-a-skill'));
  fs.writeFileSync(path.join(dir, 'README.md'), '# not a skill\n');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const { index, files } = buildIndex(dir);

  assert.deepEqual(index.skills.map((s) => s.name), ['alpha-skill', 'zeta-skill']);
  assert.deepEqual(files.map((f) => f.path), ['alpha-skill/SKILL.md', 'zeta-skill/SKILL.md']);
});

test('buildIndex throws when a skill name differs from its folder', (t) => {
  const dir = makeSkillsDir({ 'demo-skill': demoSkill('other-name') });
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  assert.throws(() => buildIndex(dir), /other-name/);
});

test('buildIndex returns an empty catalog when the skills folder does not exist', () => {
  const missing = path.join(os.tmpdir(), `heycai-skills-missing-${process.pid}-${Date.now()}`);
  assert.deepEqual(buildIndex(missing), { index: { $schema: SCHEMA, skills: [] }, files: [] });
});

test('writeWellKnown writes index.json and the SKILL.md files, wiping stale output', (t) => {
  const markdown = demoSkill('demo-skill');
  const skillsDir = makeSkillsDir({ 'demo-skill': markdown });
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heycai-skills-out-'));
  t.after(() => {
    fs.rmSync(skillsDir, { recursive: true, force: true });
    fs.rmSync(outDir, { recursive: true, force: true });
  });
  fs.mkdirSync(path.join(outDir, 'removed-skill'));
  fs.writeFileSync(path.join(outDir, 'removed-skill', 'SKILL.md'), 'stale');

  writeWellKnown(skillsDir, outDir);

  const indexText = fs.readFileSync(path.join(outDir, 'index.json'), 'utf8');
  assert.equal(indexText, `${JSON.stringify(buildIndex(skillsDir).index, null, 2)}\n`);
  assert.equal(fs.readFileSync(path.join(outDir, 'demo-skill', 'SKILL.md'), 'utf8'), markdown);
  assert.equal(fs.existsSync(path.join(outDir, 'removed-skill')), false);
});
