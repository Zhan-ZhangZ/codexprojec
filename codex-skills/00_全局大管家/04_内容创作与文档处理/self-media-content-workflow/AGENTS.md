# Repository instructions

## Scope

This repository contains a tool-agnostic self-media Skill suite. Keep reusable workflows in `SKILL.md`, detailed platform guidance in `references/`, and copyable output templates in `assets/`.

## Rules

- Keep every `SKILL.md` below 500 lines.
- Use only `name` and `description` in Skill frontmatter.
- Keep exact platform limits out of core instructions unless they are verified and time-stamped.
- Do not bind core Skills to a single model, browser, image provider, publisher, or analytics service.
- Do not add credentials, Cookie examples, private URLs, real user data, or secrets.
- Treat research tools as read-only by default.
- Require explicit user authorization before external write actions.
- Keep multi-platform outputs native to each platform.
- Add or update templates when a workflow introduces a required deliverable.

## Validation

Run:

```bash
python3 scripts/validate.py
```

Also run the system Skill validator when available.

## Commits

Use conventional commits with a clear module scope. Do not stage unrelated files.
