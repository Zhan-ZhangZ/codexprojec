# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout

This is a single-context repo.

Before exploring, read these if they exist:

- `CONTEXT.md` at the repo root
- `docs/adr/` for architectural decisions that touch the area being changed

If these files do not exist, proceed silently. Do not suggest creating them upfront. Producer skills create them lazily when terms or decisions actually get resolved.

## Expected file structure

```text
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-example-decision.md
│   └── 0002-example-decision.md
└── src/
```

## Use the glossary's vocabulary

When output names a domain concept in an issue title, refactor proposal, hypothesis, or test name, use the term as defined in `CONTEXT.md`. Do not drift to synonyms the glossary explicitly avoids.

If the concept is not in the glossary yet, that is a signal: either the language is being invented and should be reconsidered, or there is a real gap to resolve with a domain-doc workflow.

## Flag ADR conflicts

If output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 - but worth reopening because..._
