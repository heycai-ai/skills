import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createZip, packageEntries, readZip, writePackage, ZIP_NAME } from '../scripts/package-plugin.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');

// What the Claude directory and OpenAI's "Skills only" upload read from a Claude plugin archive, and nothing else.
const EXPECTED_ENTRIES = [
  '.claude-plugin/plugin.json',
  'skills/clinic-front-desk-audit/SKILL.md',
  'skills/clinic-website-ai-search/SKILL.md',
  'README.md',
  'LICENSE',
];

const tmp = (t, prefix) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};

test('the archive is named after the plugin', () => {
  assert.equal(ZIP_NAME, 'heycai-clinic-skills.zip');
});

test('createZip and readZip round-trip names and bytes, compressed and stored', () => {
  const entries = [
    { name: 'a/long.txt', data: Buffer.from('repeat '.repeat(500)) },
    { name: 'b.bin', data: Buffer.from([0, 1, 2, 3, 250, 251]) },
    { name: 'empty.txt', data: Buffer.alloc(0) },
    { name: 'é/ünïcode.md', data: Buffer.from('ñ') },
  ];
  const zip = createZip(entries);
  assert.equal(zip.readUInt32LE(0), 0x04034b50, 'starts with a local file header');
  assert.deepEqual(
    readZip(zip).map(({ name, data }) => [name, data.toString('hex')]),
    entries.map(({ name, data }) => [name, data.toString('hex')]),
  );
});

test('createZip is deterministic: same entries, same bytes', () => {
  const entries = [{ name: 'x.txt', data: Buffer.from('same') }];
  assert.ok(createZip(entries).equals(createZip(entries)));
});

test('readZip rejects an entry whose bytes do not match its CRC-32', () => {
  const zip = createZip([{ name: 'x.txt', data: Buffer.from('stored payload') }]);
  const corrupt = Buffer.from(zip);
  const at = corrupt.indexOf(Buffer.from('x.txt')) + 'x.txt'.length; // first data byte after the local header name
  corrupt[at] ^= 0xff;
  assert.throws(() => readZip(corrupt), /CRC|invalid|inflate|incorrect/i);
});

test('packageEntries lists the Claude manifest, each skill, the README and the LICENSE, in that order', () => {
  assert.deepEqual(packageEntries(ROOT).map((e) => e.name), EXPECTED_ENTRIES);
});

test('writePackage writes exactly the expected entries with the bytes of the repo files', (t) => {
  const out = path.join(tmp(t, 'heycai-package-'), ZIP_NAME);

  writePackage(ROOT, out);

  const entries = readZip(fs.readFileSync(out));
  assert.deepEqual(entries.map((e) => e.name), EXPECTED_ENTRIES);
  for (const { name, data } of entries) {
    assert.ok(data.equals(fs.readFileSync(path.join(ROOT, name))), `${name} differs from the repo file`);
  }
  const manifest = JSON.parse(entries[0].data.toString('utf8'));
  assert.ok(manifest.description.length > 0, 'OpenAI requires a nonempty description');
});

test('the archive holds no directories, dot-files other than the manifest, or OS junk', (t) => {
  const out = path.join(tmp(t, 'heycai-package-'), ZIP_NAME);
  writePackage(ROOT, out);
  for (const { name } of readZip(fs.readFileSync(out))) {
    assert.ok(!name.endsWith('/'), `${name} is a directory entry`);
    assert.doesNotMatch(name, /(^|\/)(\.DS_Store|__MACOSX|Thumbs\.db|desktop\.ini)(\/|$)/);
    assert.doesNotMatch(name, /^\/|\.\.|\\/);
  }
});

test('running the package script writes dist/heycai-clinic-skills.zip next to its skills folder', (t) => {
  const root = tmp(t, 'heycai skills package-');
  fs.cpSync(SCRIPTS_DIR, path.join(root, 'scripts'), { recursive: true });
  for (const file of ['package.json', 'README.md', 'LICENSE']) fs.copyFileSync(path.join(ROOT, file), path.join(root, file));
  fs.cpSync(path.join(ROOT, '.claude-plugin'), path.join(root, '.claude-plugin'), { recursive: true });
  fs.mkdirSync(path.join(root, 'skills', 'demo-skill'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'skills', 'demo-skill', 'SKILL.md'),
    '---\nname: demo-skill\ndescription: "Demo skill. Use when testing the packager."\n---\n\n# Demo\n',
  );

  const output = execFileSync(process.execPath, [path.join(root, 'scripts', 'package-plugin.mjs')], { encoding: 'utf8' });

  assert.match(output, /Wrote dist\/heycai-clinic-skills\.zip with 4 file\(s\)/);
  const entries = readZip(fs.readFileSync(path.join(root, 'dist', ZIP_NAME)));
  assert.deepEqual(entries.map((e) => e.name), ['.claude-plugin/plugin.json', 'skills/demo-skill/SKILL.md', 'README.md', 'LICENSE']);
});

test('writePackage fails loudly when a required file is missing', (t) => {
  const root = tmp(t, 'heycai-package-missing-');
  fs.mkdirSync(path.join(root, 'skills', 'demo-skill'), { recursive: true });
  fs.writeFileSync(path.join(root, 'skills', 'demo-skill', 'SKILL.md'), '---\nname: demo-skill\ndescription: x\n---\n');
  assert.throws(() => writePackage(root, path.join(root, 'dist', ZIP_NAME)), /plugin\.json|README|LICENSE/);
});
