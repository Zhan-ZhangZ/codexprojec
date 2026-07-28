# SKILL.md Frontmatter Spec

This document is the **authoritative** schema for `SKILL.md` frontmatter across
all 1,150 skills in `skills/`. `scripts/build-skill-audit.py` will lint against
this spec once the audit is wired in; in the meantime, all new skills should
match it by hand.

## Why this exists

A scan of the existing 1,150 SKILL.md files turned up **at least five
incompatible frontmatter shapes** in active use:

| Style | Example | Where it lives |
|---|---|---|
| `description:` block, no `triggers:` | `00-Full-empirical-analysis-skill_StatsPAI/SKILL.md` | most flagship skills |
| `description:` single-line quoted, `version: 1.0.0` | `10-Jill0099-causal-inference-mixtape/SKILL.md` | vendored thirds-party |
| `description: >` YAML fold + `allowed-tools:` | `69-Paper-WorkFlow/SKILL.md` | the meta-orchestrator |
| Nested directory hierarchy, no outer `SKILL.md` | `03-K-Dense-AI-claude-scientific-skills/` | a few large vendored packs |
| Body-derived description (frontmatter absent) | (4 skills) | vendored edge cases |

The current breadth of styles makes IDE auto-triggering flaky: some IDEs treat
`description:` as the trigger key, some weight `triggers:` more, and none
respect a `version:` field uniformly. Pinning the shape here is the lowest-cost
fix.

## Required fields

Every `SKILL.md` frontmatter block must declare:

```yaml
---
name: <string>                # human-readable, kebab-case, matches the directory name
description: <one short paragraph, <= 240 chars>
---
```

### `name`

- Required.
- Lower-kebab-case ASCII, e.g. `paper-workflow`, `causal-inference-mixtape`.
- Must match the directory name under `skills/` (one `name` per directory).
- Used by some IDEs as the skill's display name in picker menus.

### `description`

- Required.
- One short paragraph, no more than ~240 characters.
- Plain prose, no Markdown.
- Must start with an action verb in the present tense ("Build…", "Analyse…",
  "Replicate…") so the trigger engine can latch onto it.
- Must mention the **method**, the **language/framework**, and the
  **artefact it produces** if those are non-obvious.

## Recommended fields

```yaml
triggers: [a short list of invocation phrases]
allowed-tools: [a whitelist of Bash / Read / Write glob patterns, if any]
argument-hint: <placeholder, if the skill takes a single string argument>
```

### `triggers`

- Recommended for **any** non-trivial skill.
- Short, exact phrases an agent would say to invoke the skill.
- Example: `triggers: ["replicate Card 1995", "Card-Krueger 1994 replication", "newspaper DID"]`.
- Do not list more than 8 phrases; longer lists dilute the trigger signal.

### `allowed-tools`

- **Required** if the skill uses `Bash`, `Read`, `Write`, or `WebFetch` against
  patterns that aren't standard.
- One whitelist per line. Example:

  ```yaml
  allowed-tools:
    - Bash(python3 scripts/build_cf.py:*)
    - Read(skills/**)
  ```

- The exhaustive list of safe tool specifiers is in the upstream Skill
  standard; when in doubt, follow the system tool documentation.

### `argument-hint`

- Optional. A short placeholder shown in slash-command pickers. Example:
  `argument-hint: "<dataset.csv>"`.

## Discouraged fields

- `version:` -- the version of a vendored skill is tracked in `catalog/provenance.json`,
  not in the frontmatter. The 10-Jill… skill that ships with `version: 1.0.0` is
  the only outlier; new skills should drop it.
- `model:` -- never; Claude Code and the runtime pick a model, not the skill.
- `license:` -- put it in `catalog/provenance.json` (one source of truth).

## Minimal example

```yaml
---
name: causal-inference-mixtape
description: Estimate DiD / IV / RDD / SCM with code templates drawn from Cunningham's Causal Inference: The Mixtape. Python 3.
triggers:
  - "estimate a DiD with Cunningham's templates"
  - "replicate a mixtape chapter"
  - "build a synthetic control"
allowed-tools:
  - Bash(python3 scripts/*:*)
  - Read(eval-harness/**)
---
```

## Out of scope (do not put in frontmatter)

- Author name / email -> `catalog/provenance.json`.
- License -> `catalog/provenance.json`.
- Model choice -> runtime config, not skill metadata.
- Sample invocation output / worked example -> first body paragraph or
  `examples/` subdirectory, **never** the frontmatter.

## Linting

Until `scripts/build-skill-audit.py` is updated to enforce this schema
(see Top5#4 follow-ups), the cheapest way to validate a single skill
is to paste its frontmatter into a YAML linter and check by hand. A future
CI gate will call:

```
python3 -c "import yaml,sys; d=yaml.safe_load(open('SKILL.md').read().split('---',2)[1]); assert 'name' in d and 'description' in d"
```

across every `skills/**/SKILL.md`, failing the build on any drift.
