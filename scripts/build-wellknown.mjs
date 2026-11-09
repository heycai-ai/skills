// Builds the agent-skills discovery catalog served from https://www.heycai.ai/.well-known/agent-skills/.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseSkill } from './skill-lib.mjs';

const SCHEMA = 'https://schemas.agentskills.io/discovery/0.2.0/schema.json';
const URL_PREFIX = '/.well-known/agent-skills';

// Every immediate subfolder of skillsDir that holds a SKILL.md is one skill, sorted by name.
export function buildIndex(skillsDir) {
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
        url: `${URL_PREFIX}/${name}/SKILL.md`,
        digest: `sha256:${createHash('sha256').update(content).digest('hex')}`,
        // Kept for skills CLI versions before 1.5.7 (vercel-labs/skills issue #985).
        files: ['SKILL.md'],
      })),
    },
    files: skills.map(({ name, content }) => ({ path: `${name}/SKILL.md`, content })),
  };
}

// Replaces outDir with index.json plus one <name>/SKILL.md per skill, so removed skills don't linger.
export function writeWellKnown(skillsDir, outDir) {
  const { index, files } = buildIndex(skillsDir);
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

if (import.meta.main) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const outDir = path.join(root, 'dist', '.well-known', 'agent-skills');
  const index = writeWellKnown(path.join(root, 'skills'), outDir);
  console.log(`Wrote ${index.skills.length} skill(s) to ${path.relative(root, outDir)}`);
}
