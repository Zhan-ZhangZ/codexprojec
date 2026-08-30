# Contributing Guide

Thank you for your interest in contributing to ComfyUI Skills OpenClaw!

This document covers the design principles and practical guidelines for contributing to this project. Please read it before submitting a PR.

## Architecture Overview

This project follows a **Skills + CLI** architecture:

```
SKILL.md (Agent contract)      — Tells the agent WHEN and WHY
    ↓
comfyui-skill CLI (PyPI)       — Provides the HOW (commands)
    ↓
ComfyUI Server (HTTP API)      — Does the actual work
```

- **This repo** (ComfyUI_Skills_OpenClaw) owns the Skill definition (`SKILL.md`), the Web UI, shared scripts, and workflow storage.
- **CLI repo** ([ComfyUI_Skill_CLI](https://github.com/HuangYuChuh/ComfyUI_Skill_CLI)) owns the CLI tool published to PyPI.

## Design Philosophy

### 1. Restraint Principle

Every new feature must pass this checklist before being added:

- [ ] **Is it an atomic primitive?** — Can it be broken down further? If yes, don't add it.
- [ ] **Is there no workaround?** — Can existing commands be combined to achieve this? If yes, don't add it.
- [ ] **Does a real scenario require it?** — Will an agent or user actually get stuck without this? If not, don't add it.

Good examples:
- `cancel` — No way to stop a running job without it. Atomic, no workaround.
- `free` — No way to release GPU memory without it. Atomic, no workaround.

Bad examples:
- `batch-run` — Can be achieved by calling `submit` multiple times.
- `schema-edit` — Can be done by editing `schema.json` directly.
- `workflow-rename` — Can be done with `mv` on the directory.

### 2. Three-Layer Documentation Strategy

To prevent SKILL.md from growing out of control as CLI features increase, we use a three-layer approach:

```
Layer 1: description (in frontmatter)
  → Agent reads this to decide whether to load the skill.
  → Keep it short and trigger-focused.

Layer 2: SKILL.md body (loaded into agent context)
  → Only write WHEN and WHY, not HOW.
  → Decision routing, special behavior patterns, gotchas.
  → This is the most expensive layer (consumes context window).

Layer 3: cliHelp + --help + references/ (on-demand discovery)
  → Agent runs `comfyui-skill --help` to discover commands.
  → Agent runs `comfyui-skill <cmd> --help` for syntax details.
  → Detailed docs live in references/ and are read only when needed.
```

**Key rule: SKILL.md growth should be logarithmic, not linear.**

Adding a standard command (like `cancel` or `free`) should only require one line in the Quick Decision section. Only commands that require **special agent behavior** (like the polling pattern for `submit` + `status`) deserve detailed documentation in SKILL.md.

### What belongs in SKILL.md

| Content | Example | Belongs? |
|---------|---------|----------|
| Decision routing | "User says X → use command Y" | Yes |
| Special agent behavior | Polling pattern, parameter assembly | Yes |
| Gotchas and pitfalls | Directory sensitivity, API key setup | Yes |
| Command syntax and parameters | `--args`, `--repos` flags | No (use `--help`) |
| Return value JSON format | Full JSON response examples | No (JSON is self-describing) |
| Standard CRUD operations | cancel, free, queue list | No (command name + `--help` is enough) |

### 3. CLI Command Design

When adding a CLI command:

- **Self-documenting**: Command name, `--help` text, and JSON output should be clear enough that an agent can use it without reading SKILL.md.
- **JSON-first**: All commands must support `--json` output. Agents rely on structured output.
- **Error hints**: When a command encounters a common failure, include a `hint` field in the error response with actionable guidance. Don't just pass through raw error messages.
- **Consistent patterns**: Follow existing conventions — use `output_result()` for success, `output_error()` for failure, same server resolution logic.

## Contribution Workflow

### PR Process

1. **Fork and branch** — Create a feature branch from `main`. Never push directly to `main`.
2. **Write tests** — New features need unit tests. Test files go in `tests/`.
3. **Run tests** — Ensure all tests pass before submitting: `python -m unittest discover -s tests -p "test_*.py"`
4. **Submit PR** — Open a PR against `main` with a clear description of what and why.
5. **CI must pass** — Wait for CI checks to complete.

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add cancel command for interrupting running jobs
fix: handle timeout in dependency check
docs: update SKILL.md quick decision section
chore: update .gitignore patterns
```

### Updating SKILL.md

When a new CLI command is added:

1. **Always**: Add a one-liner to the Quick Decision section (if the command maps to a user intent).
2. **Always**: Add the command to the Command Reference table.
3. **Only if needed**: Add detailed documentation when the command requires special agent behavior that isn't obvious from `--help`.
4. **Never**: Document command syntax or parameter details that `--help` already covers.

### Adding Error Hints

When you identify a common error pattern from ComfyUI:

1. Add the pattern to `error_hints.py` in the CLI repo.
2. Include an actionable message — tell the user exactly what to do, not just what went wrong.
3. Add a unit test for the pattern match.

## Testing Standards

### Unit Tests (required for CLI changes)

- Test client API methods with mocked HTTP responses.
- Test error hint pattern matching with real error message strings.
- Tests should not depend on `typer` or other CLI framework imports (keep them isolated).

### Real ComfyUI Tests (recommended)

Before submitting a PR with new ComfyUI API interactions:

- Test against a real ComfyUI instance if possible.
- Verify both success and error paths.
- Document test results in the PR description.

## Questions?

Open an issue at [GitHub Issues](https://github.com/HuangYuChuh/ComfyUI_Skills_OpenClaw/issues) or reach out to the maintainers.
