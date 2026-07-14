<h1 align="center">Polywave for Codex CLI</h1>

<p align="center">
  <img src="https://raw.githubusercontent.com/blackwell-systems/polywave-protocol/main/assets/logo.png" alt="Polywave" width="600" />
</p>

<p align="center">
  <a href="https://github.com/blackwell-systems"><img src="https://raw.githubusercontent.com/blackwell-systems/blackwell-docs-theme/main/badge-trademark.svg" alt="Blackwell Systems" /></a>
  <a href="https://buymeacoffee.com/blackwellsystems"><img src="https://img.shields.io/badge/buy%20me%20a%20coffee-donate-yellow.svg" alt="Buy Me A Coffee" /></a>
</p>

<p align="center"><strong>Parallel AI agents that don't break each other's code.</strong> Now on <a href="https://github.com/openai/codex">Codex CLI</a>.</p>

> **Status:** Usable alpha. The current blessed flow is hybrid: run scout in-session with `$polywave scout`, then run wave execution from your shell with `scripts/run-polywave-wave`. The single-session `$polywave wave` experience is not yet viable in the tested Codex runtime. See [IMPLEMENTATION-NOTES.md](IMPLEMENTATION-NOTES.md) for the current runtime evidence.

## What is this?

This repo provides the Codex CLI implementation of the [Polywave protocol](https://github.com/blackwell-systems/polywave-protocol): a Codex skill, custom agent definitions, and enforcement hooks that let Codex coordinate parallel agents with disjoint file ownership and worktree isolation.

## Repositories

| Repository | Purpose |
|-----------|---------|
| [polywave-protocol](https://github.com/blackwell-systems/polywave-protocol) | Protocol specification |
| [polywave](https://github.com/blackwell-systems/polywave) | Claude Code implementation |
| **polywave-codex** (this repo) | Codex CLI implementation |
| [polywave-go](https://github.com/blackwell-systems/polywave-go) | Go engine and `polywave-tools` CLI |
| [polywave-web](https://github.com/blackwell-systems/polywave-web) | Web UI (optional) |

> **Using Claude Code?** Start at [polywave](https://github.com/blackwell-systems/polywave).

## Prerequisites

- [Codex CLI](https://github.com/openai/codex) installed
- Git 2.20+
- jq 1.6+
- `polywave-tools` CLI

Install `polywave-tools` with one of:

```bash
brew install blackwell-systems/tap/polywave-tools
go install github.com/blackwell-systems/polywave-go/cmd/polywave-tools@latest
```

## Quick Start

Use one terminal. The current blessed flow is sequential.

1. Install Polywave Codex artifacts:

```bash
./install.sh
```

2. Merge the printed hook configuration into your Codex config, then restart Codex.

3. Verify the install:

```bash
./scripts/verify-codex-install
```

4. Initialize your target project if needed:

```bash
cd your-project
polywave-tools init
```

5. Run scout in Codex:

```
$polywave scout "add a caching layer to the API client"
```

6. Run the wave launcher from your shell:

```bash
scripts/run-polywave-wave docs/IMPL/IMPL-caching.yaml --wave 1 --repo-dir "$PWD"
```

A shorter version of the same flow lives in [QUICKSTART.md](QUICKSTART.md).

## Installation Notes

The installer installs:
- the hook package
- the `polywave` skill
- progressive-disclosure references and injector scripts
- prompt builders for scout and wave execution
- direct Codex ports of the current Polywave custom agents

```bash
./install.sh
```

Use `--write-user-hooks` only if `~/.codex/hooks.json` does not already exist and you want the installer to create it.

Important: `install.sh` does **not** finish the job by itself. You must:
- merge the printed hook config into `~/.codex/config.toml` or `~/.codex/hooks.json`
- restart Codex
- run `./scripts/verify-codex-install`

To remove installed hook artifacts:

```bash
./uninstall.sh
```

## How to Use Polywave on Codex

**Scout (blessed in-session path):** Start Codex and invoke the skill directly:

```
$polywave scout "add a caching layer to the API client"
```

The orchestrator delegates to `polywave-scout`, which writes an IMPL manifest validated through `polywave-tools`.

**Wave (blessed shell path):** After reviewing the IMPL, run the wave launcher:

```bash
scripts/run-polywave-wave docs/IMPL/IMPL-caching.yaml --wave 1 --repo-dir "$PWD"
```

This prepares worktrees, launches each agent as a parallel `codex exec` process, and finalizes (merge + verify + cleanup). Disjoint file ownership is enforced through `polywave-tools`, and worktree isolation comes from per-process sandbox scoping.

**Why the split?** Codex runtime behavior currently blocks the ideal single-session wave UX:
- in-session spawned workers can fail on git worktree metadata writes
- nested `codex exec` from inside an active session can fail before worker start

The shell launcher avoids both constraints by running each worker as its own top-level process.

## Progressive Disclosure

> **Codex limitation:** Codex does not support Claude Code's automatic subagent prompt rewrite path (`updatedInput` on agent launch), so progressive disclosure references must be loaded explicitly by the `$polywave` orchestrator or the shell launchers.

The Codex port carries the same basic disclosure structure as the Claude implementation:
- core orchestrator skill in `SKILL.md`
- on-demand protocol references in `references/`
- deterministic routing scripts in `scripts/inject-context` and `scripts/inject-agent-context`
- deterministic prompt builders in `scripts/build-scout-prompt` and `scripts/build-wave-agent-prompt`

The exact in-session procedure is documented in `references/live-loop-playbook.md`.

## Current Proven Paths

- `$polywave scout` in-session: proven
- `scripts/run-polywave-wave`: proven end to end
- fully in-session `$polywave wave`: not yet a proven production path

## Development

Run the hook fixture suite with:

```bash
scripts/run-hook-fixtures
```

To capture real Codex hook payloads, temporarily add the optional audit snippet printed by:

```bash
scripts/print-codex-config
```

Payloads are written under `${CODEX_HOME:-$HOME/.codex}/polywave/audit`.

## License

[MIT OR Apache-2.0](LICENSE)
