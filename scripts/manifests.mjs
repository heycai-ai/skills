// The plugin's identity, in one place, and every manifest built from it. To change a field or release a new
// version (bump "version" in package.json), edit this file or package.json and run `npm run manifests`; the tests
// fail while a committed manifest differs from what this file writes.
//
// Formats, as documented on 2026-11-09:
// - .claude-plugin/plugin.json: Claude Code plugin manifest (https://code.claude.com/docs/en/plugins-reference).
//   Also read by OpenAI's "Skills only" upload of a Claude archive, github/awesome-copilot and xAI Grok Build.
// - .claude-plugin/marketplace.json: Claude Code marketplace (https://code.claude.com/docs/en/plugins/marketplace-reference),
//   so `/plugin marketplace add heycai-ai/skills` works. Codex reads it as a legacy-compatible marketplace.
// - plugin.json: Agent Plugins 1.0.0 (https://agent-plugins.org/plugin-authors/manifest), read by Cursor, Kiro, Hermes,
//   Codex and awesome-copilot. OpenAI's listing fields go under extensions["com.openai"]
//   (https://developers.openai.com/plugins/deploy/submission#automatically-provide-submission-and-review-information).
// - gemini-extension.json: Gemini CLI extension (https://geminicli.com/docs/extensions/reference/); skills come from skills/.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isEntryPoint } from './build-wellknown.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

export const PLUGIN = {
  name: 'heycai-clinic-skills',
  displayName: 'HeyCAi Clinic Skills',
  version,
  description:
    "Two skills for people who work with health clinics: audit what a clinic's front desk loses to missed calls, WhatsApp and no-shows, and audit a clinic website for Google and AI search. By HeyCAi, the AI receptionist for health clinics.",
  author: { name: 'HeyCAi', email: 'hey@heycai.ai', url: 'https://www.heycai.ai' },
  homepage: 'https://www.heycai.ai',
  repository: 'https://github.com/heycai-ai/skills',
  license: 'MIT',
  keywords: [
    'clinic', 'clinics', 'healthcare', 'ai-receptionist', 'front-desk', 'missed-calls',
    'no-shows', 'whatsapp', 'local-seo', 'ai-search', 'schema-org', 'geo',
  ],
};

// The links the Anthropic and OpenAI directories show on the listing. The contact page lists hey@heycai.ai.
export const LINKS = {
  website: 'https://www.heycai.ai',
  privacyPolicy: 'https://www.heycai.ai/privacy',
  termsOfService: 'https://www.heycai.ai/terms',
  support: 'https://www.heycai.ai/contact',
  documentation: 'https://github.com/heycai-ai/skills#readme',
};

// Users install with `/plugin install heycai-clinic-skills@heycai` (Claude Code) or `codex plugin add ...@heycai`.
export const MARKETPLACE_NAME = 'heycai';

const AGENT_PLUGINS_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';

// OpenAI listing text: tasks, intended users and limits, with no prices, offers or comparisons.
const LONG_DESCRIPTION = [
  'Two skills for agencies, consultants, web developers, clinic owners and practice managers who work with health clinics of any specialty, in English and Spanish.',
  "Clinic front desk audit: estimates how much revenue a clinic loses each month to unanswered calls, WhatsApp messages answered late or not at all, and no-shows, using only the numbers the clinic gives. It ranks what to fix or automate first and lists the options to close the gap: process fixes, more staff, an answering service or an AI receptionist.",
  "Clinic website audit for Google and AI search: reviews a clinic's public website and fixes what keeps it from ranking on Google and from being cited by AI search engines: crawling and indexing, AI crawlers, llms.txt, schema.org JSON-LD, local SEO, quotable answers and one-tap contact. Every finding cites a page of the site and comes with the fix and the code.",
  "Limits: the skills are instructions only. They don't connect to the clinic's phones, calendar or practice software, and they need no patient data. The estimates are only as good as the numbers provided. The website audit reads public pages only; anything that needs other access goes on a list for the clinic.",
  'By HeyCAi, the AI receptionist for health clinics.',
].join('\n\n');

const identity = () => {
  const { name, version, description, author, homepage, repository, license, keywords } = PLUGIN;
  return { name, version, description, author, homepage, repository, license, keywords };
};

function claudePlugin() {
  const { name, ...rest } = identity();
  return {
    name,
    displayName: PLUGIN.displayName,
    ...rest,
    documentationUrl: LINKS.documentation,
    supportUrl: LINKS.support,
    privacyPolicyUrl: LINKS.privacyPolicy,
    termsOfServiceUrl: LINKS.termsOfService,
  };
}

function claudeMarketplace() {
  return {
    name: MARKETPLACE_NAME,
    owner: PLUGIN.author,
    description: PLUGIN.description,
    plugins: [{ name: PLUGIN.name, source: './', description: PLUGIN.description }],
  };
}

function agentPlugin() {
  return {
    $schema: AGENT_PLUGINS_SCHEMA,
    ...identity(),
    extensions: {
      'com.openai': {
        interface: {
          displayName: PLUGIN.displayName,
          shortDescription: 'Front desk and website audits',
          longDescription: LONG_DESCRIPTION,
          developerName: PLUGIN.author.name,
          category: 'Productivity',
          websiteURL: LINKS.website,
          supportURL: LINKS.support,
          privacyPolicyURL: LINKS.privacyPolicy,
          termsOfServiceURL: LINKS.termsOfService,
          defaultPrompt: [
            'How much does this clinic lose each month to missed calls, late WhatsApp replies and no-shows?',
            "Audit this clinic's website for Google and AI search and give me the fixes.",
            '¿Por qué mi clínica no aparece en ChatGPT?',
          ],
          brandColor: '#2D7D6F',
        },
      },
    },
  };
}

function geminiExtension() {
  const { name, version, description } = PLUGIN;
  return { name, version, description };
}

export const MANIFESTS = [
  { path: '.claude-plugin/plugin.json', build: claudePlugin },
  { path: '.claude-plugin/marketplace.json', build: claudeMarketplace },
  { path: 'plugin.json', build: agentPlugin },
  { path: 'gemini-extension.json', build: geminiExtension },
];

// The exact text of a manifest file: two-space JSON and a final newline.
export function renderManifest(manifest) {
  return `${JSON.stringify(manifest.build(), null, 2)}\n`;
}

// Writes every manifest under root and returns their paths.
export function writeManifests(root) {
  for (const manifest of MANIFESTS) {
    const target = path.join(root, manifest.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, renderManifest(manifest));
  }
  return MANIFESTS.map((m) => m.path);
}

if (isEntryPoint(import.meta.url, process.argv[1])) {
  const written = writeManifests(ROOT);
  console.log(`Wrote ${written.length} manifest(s): ${written.join(', ')}`);
}
