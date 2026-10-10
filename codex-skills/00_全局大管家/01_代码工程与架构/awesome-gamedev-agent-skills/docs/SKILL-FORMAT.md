# Skill authoring standard

This repository follows the current [Agent Skills specification](https://agentskills.io/specification)
and intentionally uses its smallest portable subset. Checked **2026-08-08**.

## Directory contract

Each skill is one directory whose name matches its frontmatter `name`:

```text
skills/<category>/<skill-name>/
├── SKILL.md                 # required
├── agents/openai.yaml       # optional Codex UI metadata
├── references/              # optional depth loaded on demand
├── scripts/                 # optional deterministic helpers
└── assets/                  # optional templates and starter files
```

The router follows the same contract at `router/`. Keep paths relative to the skill directory so
the whole folder can be copied without repair.

## Required frontmatter

Committed `SKILL.md` files contain exactly `name` and `description`:

```yaml
---
name: example-skill
description: >
  Do a specific job and produce a clear outcome. Use when the request mentions
  the matching task, files, APIs, failure mode, or desired result.
---
```

`name` must:

- be 1–64 characters;
- contain only lowercase ASCII letters, digits, and single hyphens;
- not start or end with a hyphen;
- equal the containing directory name;
- be unique across this repository.

`description` must:

- be non-empty and at most 1,024 characters;
- say both what the skill does and when it should be used;
- include concrete trigger language such as project files, APIs, task phrases, or symptoms;
- avoid angle brackets/XML-like notation and vague marketing language.

The open specification also defines optional `license`, `compatibility`, `metadata`, and
`allowed-tools` fields. This catalog omits them from `SKILL.md` to keep one source tree predictable
across clients. Put repository licensing in `LICENSE`, version support in
[`VERSION-SUPPORT.md`](VERSION-SUPPORT.md), and agent-specific presentation in `agents/`.

## Body design

A useful skill is an operational playbook, not an encyclopedia. Prefer this shape:

1. A one-paragraph outcome and current version target.
2. `When to use`, including nearby tasks it does not own.
3. A short ordered workflow that tells the agent what to inspect before editing.
4. A small number of correct patterns or examples.
5. Pitfalls written as symptom → likely cause → remedy.
6. Links to bundled resources and related skills.

Keep `SKILL.md` under 500 lines. If material is not needed on every activation, move it to one
directly linked reference. Avoid deep reference chains.

## Version-aware guidance

- Inspect the project's manifest, lockfile, and engine metadata before choosing APIs.
- Existing projects keep their pinned version unless the user asks for a migration.
- New projects use the baseline in [`VERSION-SUPPORT.md`](VERSION-SUPPORT.md).
- State meaningful major/minor migration hazards; do not pretend examples span incompatible
  releases.
- Verify unstable claims against primary engine or framework documentation.

## Bundled resources

### `references/`

Use references for API tables, long recipes, migration details, platform matrices, or material
needed only for one branch of the workflow. Link every reference directly from `SKILL.md` and say
when to read it.

### `scripts/`

Use scripts for repeatable work where deterministic execution beats prose: validation,
normalization, conversion, reports, or preview generation. Scripts must:

- have a clear CLI and useful `--help` output;
- fail non-zero on invalid input;
- avoid destructive defaults and network calls;
- write only to explicit output paths;
- be exercised locally before merge.

### `assets/`

Use assets for templates, schemas, starter files, palettes, or other inputs intended to be copied
or transformed. Do not hide documentation in assets.

### `agents/openai.yaml`

This optional file improves Codex discovery and UI presentation without changing the portable
skill body:

```yaml
interface:
  display_name: "Example Skill"
  short_description: "Do the focused job this skill owns"
  default_prompt: "Use $example-skill to complete this task."
```

Keep `short_description` between 25 and 64 characters. The default prompt should mention the
skill as `$skill-name`.

## Router and distribution wiring

A new skill is not complete until it is reachable:

1. Add its triggers and composition to `router/SKILL.md` and
   `router/references/routing-table.md`.
2. Add it to the complete and category bundles in `.claude-plugin/marketplace.json`.
3. Update the README catalog and count.
4. Add `agents/openai.yaml` when a useful display name and starter prompt can be defined.
5. Run repository validation and tests.

## Validation

```bash
python scripts/validate-skills.py
python -m unittest discover -s tests -v
```

The validator checks frontmatter, naming, file size, local links and bundled resource paths,
OpenAI UI metadata, JSON assets, router coverage, marketplace bundles, and
catalog counts.

## Review rubric

- The description selects the skill from realistic user phrasing.
- The workflow inspects project state before making version-sensitive changes.
- Examples are small, idiomatic, and internally consistent.
- The skill owns one coherent job and hands off adjacent work explicitly.
- Resource links resolve after copying the skill directory by itself.
- Generated or artistic assets have technical constraints, consistency gates, in-context QA, and
  provenance notes—not just a prompt.
- Validation and tests pass without warnings.

See [`CONTRIBUTING.md`](../CONTRIBUTING.md) for the pull-request workflow and
[`templates/SKILL.template.md`](../templates/SKILL.template.md) for a starting point.
