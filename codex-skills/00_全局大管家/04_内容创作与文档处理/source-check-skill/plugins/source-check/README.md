# source-check (plugin)

Cowork-compatible Claude Code plugin wrapping the [source-check skill](https://github.com/Mercer8964/source-check-skill).

## What it does

When your draft answer contains an external claim — a citation, a time-sensitive number, a "latest" claim, a subjective comparison, a future prediction, user-supplied private data, or a scientific assertion — this skill auto-triggers, spawning an independent verifier subagent that fetches live sources and tags each claim ✅ / ⚠️ / ❌ / 🔵 / 🔒 / 🔓.

Designed to catch the two most common ways AI agents lie:
- **Citation fabrication** — frontier models still invent plausible-looking DOIs and authors (Claude Opus 4.7 = 36%, GPT-5.5 = 86% on AA-Omniscience, April-May 2026)
- **Silently stale info** — agents answer time-sensitive questions from training memory without signaling

Validated with pre-registered n=13 test (13/13 cases behaved correctly). See the [main repo](https://github.com/Mercer8964/source-check-skill) and [experiments/v8-validation.md](https://github.com/Mercer8964/source-check-skill/blob/main/experiments/v8-validation.md).

## Install in Cowork

Add the marketplace, then install the plugin:

```bash
/plugin marketplace add Mercer8964/source-check-skill
/plugin install source-check@source-check-skill
```

After install, the skill auto-triggers on relevant claims — no command to remember.

## License

MIT.
