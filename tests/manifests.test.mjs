import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseSkill, ruleViolations } from '../scripts/skill-lib.mjs';
import { MANIFESTS, MARKETPLACE_NAME, PLUGIN, renderManifest } from '../scripts/manifests.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_SKILLS = ['clinic-front-desk-audit', 'clinic-website-ai-search'];
const PACKAGE_VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

// Every manifest this repo publishes, and the identity fields its format carries. A field listed here must be
// present and equal to PLUGIN's value; the marketplace entry carries no version because Claude Code warns when an
// entry repeats the version of a plugin.json.
const CARRIES = {
  '.claude-plugin/plugin.json': ['name', 'version', 'description', 'license', 'homepage', 'repository', 'author', 'keywords'],
  '.claude-plugin/marketplace.json': ['name', 'description'],
  'plugin.json': ['name', 'version', 'description', 'license', 'homepage', 'repository', 'author', 'keywords'],
  'gemini-extension.json': ['name', 'version', 'description'],
};
// Read by several vendors, so they never name one: the Agent Plugins manifest (Cursor, Kiro, Hermes, Codex,
// awesome-copilot) and the Gemini CLI extension.
const VENDOR_NEUTRAL = ['plugin.json', 'gemini-extension.json'];

const readText = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const readJson = (file) => JSON.parse(readText(file));
// The object whose identity fields a manifest exposes: the plugin's own entry for the marketplace.
const identityOf = (file) => (file === '.claude-plugin/marketplace.json' ? readJson(file).plugins[0] : readJson(file));

test('package.json has a semantic version', () => {
  assert.match(PACKAGE_VERSION ?? '', /^\d+\.\d+\.\d+$/);
});

test('the identity is the one decided for the directories', () => {
  assert.equal(PLUGIN.name, 'heycai-clinic-skills');
  assert.equal(PLUGIN.displayName, 'HeyCAi Clinic Skills');
  assert.equal(PLUGIN.version, PACKAGE_VERSION);
  assert.equal(PLUGIN.license, 'MIT');
  assert.equal(PLUGIN.homepage, 'https://www.heycai.ai');
  assert.equal(PLUGIN.repository, 'https://github.com/heycai-ai/skills');
  assert.deepEqual(PLUGIN.author, { name: 'HeyCAi', email: 'hey@heycai.ai', url: 'https://www.heycai.ai' });
  assert.equal(
    PLUGIN.description,
    "Two skills for people who work with health clinics: audit what a clinic's front desk loses to missed calls, WhatsApp and no-shows, and audit a clinic website for Google and AI search. By HeyCAi, the AI receptionist for health clinics.",
  );
  assert.deepEqual(PLUGIN.keywords, [
    'clinic', 'clinics', 'healthcare', 'ai-receptionist', 'front-desk', 'missed-calls',
    'no-shows', 'whatsapp', 'local-seo', 'ai-search', 'schema-org', 'geo',
  ]);
});

test('the repo publishes exactly the expected manifests', () => {
  assert.deepEqual(MANIFESTS.map((m) => m.path).sort(), Object.keys(CARRIES).sort());
});

for (const file of Object.keys(CARRIES)) {
  test(`${file}: exists and parses as a JSON object`, () => {
    assert.ok(fs.existsSync(path.join(ROOT, file)), `${file} is missing`);
    const value = readJson(file);
    assert.equal(typeof value, 'object');
    assert.ok(value !== null && !Array.isArray(value));
  });

  test(`${file}: is what npm run manifests writes (edit scripts/manifests.mjs, not the file)`, () => {
    const manifest = MANIFESTS.find((m) => m.path === file);
    assert.ok(manifest, `${file} is not in MANIFESTS`);
    assert.equal(readText(file), renderManifest(manifest));
  });

  test(`${file}: carries the shared identity unchanged`, () => {
    const identity = identityOf(file);
    for (const field of CARRIES[file]) {
      assert.deepEqual(identity[field], PLUGIN[field], `${file} ${field}`);
    }
  });

  test(`${file}: breaks no content rule`, () => {
    assert.deepEqual(ruleViolations(readText(file)), []);
  });
}

test('name, version, description, license, homepage and repository are identical wherever they appear', () => {
  for (const field of ['name', 'version', 'description', 'license', 'homepage', 'repository']) {
    const values = Object.keys(CARRIES)
      .filter((file) => CARRIES[file].includes(field))
      .map((file) => JSON.stringify(identityOf(file)[field]));
    assert.ok(values.length >= 2, `${field} appears in fewer than two manifests`);
    assert.equal(new Set(values).size, 1, `${field} differs: ${values.join(' | ')}`);
  }
});

test('every manifest that carries a version carries the package.json version', () => {
  for (const file of Object.keys(CARRIES).filter((f) => CARRIES[f].includes('version'))) {
    assert.equal(identityOf(file).version, PACKAGE_VERSION, file);
  }
});

for (const file of VENDOR_NEUTRAL) {
  test(`${file}: never mentions Claude`, () => {
    assert.doesNotMatch(readText(file), /claude/i);
  });
}

test('the shared description names no agent vendor and stays short', () => {
  assert.doesNotMatch(PLUGIN.description, /claude|anthropic|openai|cursor|gemini/i);
  assert.ok(PLUGIN.description.length <= 400, `length ${PLUGIN.description.length}`);
});

test('keywords are lowercase hyphenated tags, as awesome-copilot requires', () => {
  for (const keyword of PLUGIN.keywords) assert.match(keyword, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, keyword);
  assert.equal(new Set(PLUGIN.keywords).size, PLUGIN.keywords.length);
});

// --- Claude Code plugin manifest (also read by OpenAI's Claude upload, awesome-copilot and Grok Build) ---------

test('.claude-plugin/plugin.json: a name Claude Code and the Anthropic directory accept', () => {
  const { name } = readJson('.claude-plugin/plugin.json');
  assert.match(name, /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/);
  assert.doesNotMatch(name, /^(?:claude|anthropic|anthropics|cc-plugin)-|(?:^|-)(?:claude|anthropic|anthropics|official|plugin|mcp|test)(?:-|$)/);
});

test('.claude-plugin/plugin.json: only fields the Claude Code reference lists, with the directory listing links', () => {
  const manifest = readJson('.claude-plugin/plugin.json');
  const known = [
    '$schema', 'name', 'displayName', 'version', 'description', 'author', 'homepage', 'repository', 'license',
    'keywords', 'metadata', 'icon', 'documentationUrl', 'supportUrl', 'privacyPolicyUrl', 'termsOfServiceUrl',
  ];
  for (const key of Object.keys(manifest)) assert.ok(known.includes(key), `unknown top-level field ${key}`);
  assert.equal(manifest.displayName, PLUGIN.displayName);
  assert.equal(manifest.privacyPolicyUrl, 'https://www.heycai.ai/privacy');
  assert.equal(manifest.termsOfServiceUrl, 'https://www.heycai.ai/terms');
  assert.equal(manifest.supportUrl, 'https://www.heycai.ai/contact');
  for (const key of ['documentationUrl', 'supportUrl', 'privacyPolicyUrl', 'termsOfServiceUrl', 'homepage']) {
    assert.match(manifest[key], /^https:\/\//, key);
  }
  // No component paths: Claude Code, OpenAI and Grok Build all scan the default skills/ folder.
  for (const key of ['skills', 'commands', 'agents', 'hooks', 'mcpServers', 'userConfig']) {
    assert.equal(manifest[key], undefined, key);
  }
});

test('.claude-plugin/marketplace.json: one entry, at the marketplace root, under an allowed name', () => {
  const marketplace = readJson('.claude-plugin/marketplace.json');
  assert.equal(marketplace.name, MARKETPLACE_NAME);
  assert.match(marketplace.name, /^[a-z0-9][a-z0-9._-]*$/);
  assert.doesNotMatch(marketplace.name, /\.\.|claude|anthropic|official|^(?:npm|pip|uv|cargo|github|gh|agent-skills|healthcare)$/);
  assert.deepEqual(marketplace.owner, PLUGIN.author);
  assert.equal(marketplace.description, PLUGIN.description);
  assert.equal(marketplace.plugins.length, 1);
  const [entry] = marketplace.plugins;
  assert.equal(entry.source, './');
  assert.equal(entry.version, undefined, 'plugin.json owns the version');
});

// --- Agent Plugins v1 manifest (Cursor, Kiro, Hermes, Codex, awesome-copilot) -----------------------------

const AGENT_PLUGINS_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';

test('plugin.json: conforms to the closed Agent Plugins 1.0.0 schema', () => {
  const manifest = readJson('plugin.json');
  const allowed = ['$schema', 'name', 'version', 'description', 'author', 'homepage', 'repository', 'license', 'keywords', 'extensions'];
  for (const key of Object.keys(manifest)) assert.ok(allowed.includes(key), `unknown top-level field ${key}`);
  assert.equal(manifest.$schema, AGENT_PLUGINS_SCHEMA);
  assert.ok(manifest.name.length >= 1 && manifest.name.length <= 64);
  assert.match(manifest.name, /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/);
  for (const key of ['version', 'description', 'homepage', 'repository', 'license']) {
    assert.equal(typeof manifest[key], 'string', key);
  }
  for (const [key, value] of Object.entries(manifest.author)) {
    assert.ok(['name', 'email', 'url'].includes(key), `author.${key}`);
    assert.equal(typeof value, 'string');
  }
  assert.ok(manifest.keywords.every((k) => typeof k === 'string'));
  for (const [namespace, value] of Object.entries(manifest.extensions ?? {})) {
    assert.match(namespace, /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/, `extension namespace ${namespace}`);
    assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${namespace} must be an object`);
  }
});

test('plugin.json: the OpenAI listing block fits the plugin directory limits', () => {
  const ui = readJson('plugin.json').extensions['com.openai'].interface;
  assert.equal(ui.displayName, PLUGIN.displayName);
  assert.ok(ui.displayName.length <= 30);
  assert.ok(ui.shortDescription.length >= 1 && ui.shortDescription.length <= 30, ui.shortDescription);
  assert.ok(ui.longDescription.length >= 1 && ui.longDescription.length <= 4000);
  assert.equal(ui.developerName, 'HeyCAi');
  assert.equal(typeof ui.category, 'string');
  assert.equal(ui.websiteURL, 'https://www.heycai.ai');
  assert.equal(ui.privacyPolicyURL, 'https://www.heycai.ai/privacy');
  assert.equal(ui.termsOfServiceURL, 'https://www.heycai.ai/terms');
  assert.equal(ui.supportURL, 'https://www.heycai.ai/contact');
  assert.ok(Array.isArray(ui.defaultPrompt) && ui.defaultPrompt.length >= 1 && ui.defaultPrompt.length <= 3);
  for (const prompt of ui.defaultPrompt) assert.ok(prompt.length <= 128 && !prompt.includes('@'), prompt);
  assert.equal(new Set(ui.defaultPrompt).size, ui.defaultPrompt.length);
  assert.match(ui.brandColor, /^#[0-9A-F]{6}$/i);
  // Icons are added in the dashboard: a path here to a missing file would fail the upload.
  for (const key of ['logo', 'logoDark', 'composerIcon', 'composerIconDark']) assert.equal(ui[key], undefined, key);
});

test('no Hermes plugin.yaml next to plugin.json: Hermes would load it as a native plugin and skip the skills', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'plugin.yaml')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'plugin.yml')), false);
});

// --- Gemini CLI extension --------------------------------------------------------------------------------

test('gemini-extension.json: only the documented fields, and a name that can be the extension folder', () => {
  const manifest = readJson('gemini-extension.json');
  assert.deepEqual(Object.keys(manifest).sort(), ['description', 'name', 'version']);
  assert.match(manifest.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});

// --- The skills every format bundles ---------------------------------------------------------------------

test('no manifest declares its own skill paths, so every format bundles the skills/ folder', () => {
  for (const file of Object.keys(CARRIES)) {
    const value = readJson(file);
    assert.equal(value.skills, undefined, `${file} skills`);
    for (const entry of value.plugins ?? []) assert.equal(entry.skills, undefined, `${file} entry skills`);
  }
});

test('the bundled skills/ folder holds exactly the expected skills, each a valid Agent Skill', () => {
  const marketplaceRoot = path.resolve(ROOT, readJson('.claude-plugin/marketplace.json').plugins[0].source);
  assert.equal(marketplaceRoot, path.resolve(ROOT));
  assert.ok(fs.existsSync(path.join(marketplaceRoot, '.claude-plugin', 'plugin.json')));
  const skillsDir = path.join(marketplaceRoot, 'skills');
  const found = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(skillsDir, entry.name, 'SKILL.md')))
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(found, EXPECTED_SKILLS);
  for (const name of found) {
    const skill = parseSkill(fs.readFileSync(path.join(skillsDir, name, 'SKILL.md'), 'utf8'));
    assert.equal(skill.name, name);
    assert.match(skill.name, /^(?!.*--)[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(skill.description.length >= 1 && skill.description.length <= 1024);
  }
});

// --- npm run manifests ------------------------------------------------------------------------------------

test('running the manifests script writes every manifest under the given root', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'heycai manifests-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.cpSync(path.join(ROOT, 'scripts'), path.join(root, 'scripts'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(root, 'package.json'));

  const output = execFileSync(process.execPath, [path.join(root, 'scripts', 'manifests.mjs')], { encoding: 'utf8' });

  assert.match(output, /Wrote 4 manifest\(s\)/);
  for (const manifest of MANIFESTS) {
    assert.equal(fs.readFileSync(path.join(root, manifest.path), 'utf8'), renderManifest(manifest), manifest.path);
  }
});
