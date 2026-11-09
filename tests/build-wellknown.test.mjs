import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildIndex, isEntryPoint, WELL_KNOWN_TREES, writeAllWellKnown, writeWellKnown } from '../scripts/build-wellknown.mjs';

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

const SCRIPTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts');

test('isEntryPoint is true when the process was started with the module file, however the path is written', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heycai skills entry-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const script = path.join(dir, 'build.mjs');
  fs.writeFileSync(script, '');
  const url = pathToFileURL(script).href;

  assert.equal(isEntryPoint(url, script), true);
  assert.equal(isEntryPoint(url, path.relative(process.cwd(), script)), true);
  const link = path.join(dir, 'link.mjs');
  fs.symlinkSync(script, link);
  assert.equal(isEntryPoint(url, link), true);
});

test('isEntryPoint is false when the module is imported by another file, or there is no script', () => {
  const url = pathToFileURL(path.join(SCRIPTS_DIR, 'build-wellknown.mjs')).href;
  assert.equal(isEntryPoint(url, path.join(SCRIPTS_DIR, 'skill-lib.mjs')), false);
  assert.equal(isEntryPoint(url, path.join(SCRIPTS_DIR, 'missing.mjs')), false);
  assert.equal(isEntryPoint(url, undefined), false);
});

test('running the build script writes the catalog next to its skills folder', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'heycai skills build-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.cpSync(SCRIPTS_DIR, path.join(root, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(root, 'skills', 'demo-skill'), { recursive: true });
  fs.writeFileSync(path.join(root, 'skills', 'demo-skill', 'SKILL.md'), demoSkill('demo-skill'));

  const output = execFileSync(process.execPath, [path.join(root, 'scripts', 'build-wellknown.mjs')], { encoding: 'utf8' });

  assert.match(output, /Wrote 1 skill\(s\)/);
  const index = JSON.parse(fs.readFileSync(path.join(root, 'dist', '.well-known', 'agent-skills', 'index.json'), 'utf8'));
  assert.deepEqual(index.skills.map((s) => s.name), ['demo-skill']);
  const legacy = JSON.parse(fs.readFileSync(path.join(root, 'dist', '.well-known', 'skills', 'index.json'), 'utf8'));
  assert.deepEqual(legacy.skills.map((s) => s.url), ['/.well-known/skills/demo-skill/SKILL.md']);
  assert.equal(
    fs.readFileSync(path.join(root, 'dist', '.well-known', 'skills', 'demo-skill', 'SKILL.md'), 'utf8'),
    demoSkill('demo-skill'),
  );
});

// --- The legacy /.well-known/skills/ tree that Hermes' well-known source reads -----------------------------

test('the two trees are /.well-known/agent-skills and the legacy /.well-known/skills', () => {
  assert.deepEqual(WELL_KNOWN_TREES, [
    { dir: 'agent-skills', urlPrefix: '/.well-known/agent-skills' },
    { dir: 'skills', urlPrefix: '/.well-known/skills' },
  ]);
});

test('buildIndex points every url inside the URL prefix it is given', (t) => {
  const dir = makeSkillsDir({ 'demo-skill': demoSkill('demo-skill') });
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const { index } = buildIndex(dir, '/.well-known/skills');

  assert.equal(index.skills[0].url, '/.well-known/skills/demo-skill/SKILL.md');
  assert.deepEqual(buildIndex(dir).index.skills[0].url, '/.well-known/agent-skills/demo-skill/SKILL.md');
});

test('writeAllWellKnown writes both trees: same SKILL.md bytes, same index apart from the url prefix', (t) => {
  const skillsDir = makeSkillsDir({ 'zeta-skill': demoSkill('zeta-skill'), 'alpha-skill': demoSkill('alpha-skill') });
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'heycai-skills-wk-'));
  t.after(() => {
    fs.rmSync(skillsDir, { recursive: true, force: true });
    fs.rmSync(outRoot, { recursive: true, force: true });
  });

  const indexes = writeAllWellKnown(skillsDir, outRoot);

  assert.equal(indexes.length, 2);
  const read = (tree, file) => fs.readFileSync(path.join(outRoot, tree, file));
  for (const name of ['alpha-skill', 'zeta-skill']) {
    assert.ok(read('skills', `${name}/SKILL.md`).equals(read('agent-skills', `${name}/SKILL.md`)), name);
  }
  const current = JSON.parse(read('agent-skills', 'index.json'));
  const legacy = JSON.parse(read('skills', 'index.json'));
  const moved = current.skills.map((s) => ({ ...s, url: s.url.replace('/.well-known/agent-skills/', '/.well-known/skills/') }));
  assert.deepEqual(legacy, { ...current, skills: moved });
});

test('the real skills: the legacy tree matches the agent-skills tree and the source byte for byte', (t) => {
  const skillsDir = path.join(SCRIPTS_DIR, '..', 'skills');
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'heycai-skills-real-'));
  t.after(() => fs.rmSync(outRoot, { recursive: true, force: true }));

  writeAllWellKnown(skillsDir, outRoot);

  const names = JSON.parse(fs.readFileSync(path.join(outRoot, 'skills', 'index.json'), 'utf8')).skills.map((s) => s.name);
  assert.deepEqual(names, ['clinic-front-desk-audit', 'clinic-website-ai-search']);
  for (const name of names) {
    const source = fs.readFileSync(path.join(skillsDir, name, 'SKILL.md'));
    assert.ok(fs.readFileSync(path.join(outRoot, 'agent-skills', name, 'SKILL.md')).equals(source), `agent-skills ${name}`);
    assert.ok(fs.readFileSync(path.join(outRoot, 'skills', name, 'SKILL.md')).equals(source), `skills ${name}`);
  }
});
