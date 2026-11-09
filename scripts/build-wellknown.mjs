// Builds the agent-skills discovery catalog served from https://www.heycai.ai/.well-known/agent-skills/, plus the
// same catalog under the legacy /.well-known/skills/ path, which Hermes Agent's `well-known` skills source reads.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseSkill } from './skill-lib.mjs';

const SCHEMA = 'https://schemas.agentskills.io/discovery/0.2.0/schema.json';

// Each tree is written to dist/.well-known/<dir>/, and its index points at files under <urlPrefix>/.
export const WELL_KNOWN_TREES = [
  { dir: 'agent-skills', urlPrefix: '/.well-known/agent-skills' },
  { dir: 'skills', urlPrefix: '/.well-known/skills' },
];

// Every immediate subfolder of skillsDir that holds a SKILL.md is one skill, sorted by name.
export function buildIndex(skillsDir, urlPrefix = WELL_KNOWN_TREES[0].urlPrefix) {
  const folders = fs.existsSync(skillsDir)
    ? fs
        .readdirSync(skillsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(skillsDir, entry.name, 'SKILL.md')))
        .map((entry) => entry.name)
    : [];

  const skills = folders.map((folder) => {
    const content = fs.readFileSync(path.join(skillsDir, folder, 'SKILL.md'));
    const { name, description } = parseSkill(content.toString('utf8'));
    if (name !== folder) throw new Error(`skill "${name}" must live in a folder named "${name}", not "${folder}"`);
    return { name, description, content };
  });
  skills.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  return {
    index: {
      $schema: SCHEMA,
      skills: skills.map(({ name, description, content }) => ({
        name,
        type: 'skill-md',
        description,
        url: `${urlPrefix}/${name}/SKILL.md`,
        digest: `sha256:${createHash('sha256').update(content).digest('hex')}`,
        // Kept for skills CLI versions before 1.5.7 (vercel-labs/skills issue #985).
        files: ['SKILL.md'],
      })),
    },
    files: skills.map(({ name, content }) => ({ path: `${name}/SKILL.md`, content })),
  };
}

// Replaces outDir with index.json plus one <name>/SKILL.md per skill, so removed skills don't linger.
export function writeWellKnown(skillsDir, outDir, urlPrefix = WELL_KNOWN_TREES[0].urlPrefix) {
  const { index, files } = buildIndex(skillsDir, urlPrefix);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  for (const file of files) {
    const target = path.join(outDir, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.content);
  }
  return index;
}

// Writes every tree of WELL_KNOWN_TREES under wellKnownDir (dist/.well-known) and returns their indexes, in order.
export function writeAllWellKnown(skillsDir, wellKnownDir) {
  return WELL_KNOWN_TREES.map(({ dir, urlPrefix }) => writeWellKnown(skillsDir, path.join(wellKnownDir, dir), urlPrefix));
}

// True when the process was started with this module's file (`node scripts/build-wellknown.mjs`), false when
// it is imported. Works on every Node version, unlike import.meta.main (Node 24.2 and later only).
export function isEntryPoint(moduleUrl, scriptPath) {
  if (!scriptPath) return false;
  const realPath = (file) => {
    try {
      return fs.realpathSync(path.resolve(file));
    } catch {
      return null;
    }
  };
  const script = realPath(scriptPath);
  return script !== null && script === realPath(fileURLToPath(moduleUrl));
}

if (isEntryPoint(import.meta.url, process.argv[1])) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const wellKnownDir = path.join(root, 'dist', '.well-known');
  const [index] = writeAllWellKnown(path.join(root, 'skills'), wellKnownDir);
  const trees = WELL_KNOWN_TREES.map(({ dir }) => path.relative(root, path.join(wellKnownDir, dir))).join(' and ');
  console.log(`Wrote ${index.skills.length} skill(s) to ${trees}`);
}
