# Claude Code

Claude Code supports filesystem Agent Skills stored as a folder containing `SKILL.md` and optional supporting resources.

## Project installation

Place this repository at:

```text
<project>/.claude/skills/ru-listing-writer/
```

## Personal installation

Place it at:

```text
~/.claude/skills/ru-listing-writer/
```

Keep `SKILL.md`, `references/`, and `scripts/` together. Ask Claude Code to use `ru-listing-writer`, then attach the required images and state the target marketplace.

Example:

```text
Use ru-listing-writer. Generate a Russian title and description from the attached three keyword screenshots, one competitor-title screenshot, and ordered ecommerce image set. Target marketplace: WB.
```
