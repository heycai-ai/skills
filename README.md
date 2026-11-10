# HeyCAi agent skills

[![skills.sh](https://skills.sh/b/heycai-ai/skills)](https://skills.sh/heycai-ai/skills)

> HeyCAi is an AI receptionist for health clinics: it answers calls and WhatsApp messages and books appointments in the clinic's practice software.
>
> HeyCAi es una recepcionista con IA para clínicas de salud: contesta las llamadas y los mensajes de WhatsApp y reserva las citas en el programa de gestión de la clínica.

Agent skills for people who work with health clinics of any specialty: physiotherapy, dentistry, chiropractic, osteopathy, psychology, podiatry, aesthetics or general medicine. They work with Claude Code, Cursor, Codex and the other coding agents the `skills` CLI supports, in English and Spanish.

## Install

### Any agent, with the skills CLI

From GitHub:

```sh
npx skills add heycai-ai/skills
```

From the HeyCAi website:

```sh
npx skills add https://heycai.ai
```

Both commands install the same skills. To see them first without installing anything, add `--list`; to install only one, add `--skill <name>`, for example `--skill clinic-front-desk-audit`.

The repository is also packaged as a plugin, `heycai-clinic-skills`, with both skills. These are the commands for each agent.

### Claude Code

In Claude Code:

```text
/plugin marketplace add heycai-ai/skills
/plugin install heycai-clinic-skills@heycai
```

From a terminal, the same two steps are `claude plugin marketplace add heycai-ai/skills` and `claude plugin install heycai-clinic-skills@heycai`.

### Codex and ChatGPT

```sh
codex plugin marketplace add heycai-ai/skills
codex plugin add heycai-clinic-skills@heycai
```

In Codex or Work mode in the ChatGPT desktop app, the marketplace also shows up as a source in the Plugins Directory.

### Cursor

```sh
npx skills add heycai-ai/skills --agent cursor
```

The repository root also holds a `plugin.json` in the open Agent Plugins format, which Cursor reads.

### Gemini CLI

```sh
gemini extensions install https://github.com/heycai-ai/skills
```

### Hermes Agent

```sh
hermes plugins install heycai-ai/skills --no-enable
hermes plugins enable heycai-clinic-skills
```

## Skills

| Skill | For | What it does |
| --- | --- | --- |
| [`clinic-front-desk-audit`](skills/clinic-front-desk-audit/SKILL.md) | Agencies and consultants that work with clinics, clinic owners and practice managers | Estimates how much revenue a clinic loses each month to unanswered calls, WhatsApp messages answered late or not at all, and no-shows, using only the clinic's own numbers. Then it ranks what to fix or automate first and lists the options to close the gap: process fixes, more staff, an answering service or an AI receptionist. |
| [`clinic-website-ai-search`](skills/clinic-website-ai-search/SKILL.md) | Web developers, agencies and clinic owners working with a coding agent, with or without the site's code | Audits a clinic's website and fixes what keeps it from ranking on Google and from being read and cited by AI search engines such as ChatGPT, Perplexity, Gemini, Google AI Overviews, Microsoft Copilot and Claude: crawling and indexing, AI crawlers, llms.txt, schema.org JSON-LD, local SEO, quotable answers and one-tap contact. Every finding cites a page of the site and comes with the fix and the code. |

Once a skill is installed, ask your agent in your own words, for example «how much does this clinic lose to missed calls?» or «¿por qué mi clínica no aparece en ChatGPT?».

## Privacy and support

The skills are plain instructions in `SKILL.md` files. They bundle no scripts or MCP servers, ask for no credentials and send nothing to HeyCAi. The front-desk audit works only from the numbers you give your agent. The website audit asks your agent to read the clinic's public pages with its own tools. Neither skill needs patient data, so don't paste any into the chat. Maintainers build and test this repository with private tooling; the plugin itself is only the files you see here.

- Privacy policy: https://www.heycai.ai/privacy
- Terms: https://www.heycai.ai/terms
- Support: hey@heycai.ai, or https://www.heycai.ai/contact

## About HeyCAi

The skills are published by HeyCAi: https://www.heycai.ai

## License

[MIT](LICENSE)
