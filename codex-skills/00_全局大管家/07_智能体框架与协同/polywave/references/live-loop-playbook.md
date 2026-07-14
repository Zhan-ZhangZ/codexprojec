# Live Loop Playbook

This document defines the current proven Polywave execution paths for Codex CLI.

Current recommended usage is hybrid:
- active Codex loop with `$polywave scout` for scout
- shell execution of `scripts/run-polywave-wave` for wave

One terminal is enough. Run these sequentially.

## Constraint

Codex does not provide Claude Code's automatic custom-agent prompt rewrite path. The orchestrator must explicitly load progressive-disclosure references and prepend conditional agent reference blocks before delegating to a Polywave custom agent.

## Shared Setup

Set the installed skill path once per session when you need explicit shell calls:

```bash
POLYWAVE_SKILL_DIR="${POLYWAVE_SKILL_DIR:-$HOME/.codex/skills/polywave}"
```

## Scout Flow

Use this when the user wants an IMPL created or refreshed.

Required inputs:
- repository root
- feature description
- absolute IMPL output path

Procedure:
1. Load orchestrator references from the live request when needed:
   ```bash
   bash "$POLYWAVE_SKILL_DIR/scripts/inject-context" "$USER_REQUEST"
   ```
2. Build the full scout prompt with:
   ```bash
   bash "$POLYWAVE_SKILL_DIR/scripts/build-scout-prompt" \
     --repo-dir <repo-root> \
     --feature <feature-text> \
     --impl-output-path <absolute-impl-path>
   ```
3. Delegate to `polywave-scout` immediately with that generated prompt.
4. Do not perform broad repo analysis in the orchestrator first unless the scout launch is blocked on a missing prerequisite such as a missing repo root or IMPL output path.
5. Require the scout to write the manifest file, not just describe it.
6. Validate the produced IMPL with:
   ```bash
   polywave-tools finalize-scout <absolute-impl-path> --repo-dir <repo-root> --injection-method manual-fallback
   ```

Completion rule:
- The scout flow is not complete until the IMPL file exists and `finalize-scout` succeeds.
- Orchestrator-side repo browsing is not a substitute for a scout delegation.

## Wave Flow

Use this when the user wants a wave executed from an existing IMPL.

Required inputs:
- repository root
- absolute IMPL path
- wave number

Procedure:
1. Load orchestrator references from the live request when needed:
   ```bash
   bash "$POLYWAVE_SKILL_DIR/scripts/inject-context" "$USER_REQUEST"
   ```
2. Run:
   ```bash
   polywave-tools prepare-wave <impl-path> --wave <N> --repo-dir <repo-root> --json-only
   ```
3. For each prepared agent worktree, build the full wave-agent prompt with:
   ```bash
   bash "$POLYWAVE_SKILL_DIR/scripts/build-wave-agent-prompt" \
     --agent-id <agent-id> \
     --worktree-path <worktree> \
     --branch <branch> \
     --brief-path <brief-path> \
     --repo-dir <repo-root>
   ```
4. Current runtime evidence shows both obvious in-loop worker-launch paths are blocked: in-session spawned workers can fail at git worktree metadata writes, and nested `codex exec` worker launches can fail with `failed to initialize in-process app-server client: Operation not permitted` before the worker starts.
5. Because of that, the active `$polywave` loop is currently proven as an orchestration surface for prepare/state inspection, but not yet as a fully proven worker-execution surface for waves.
6. Require each agent to write completion via `polywave-tools set-completion`. When repository context must be explicit, use the global flag form: `polywave-tools --repo-dir <repo-root> set-completion ...`.
7. Finalize with:
   ```bash
   polywave-tools finalize-wave <impl-path> --wave <N> --repo-dir <repo-root>
   ```

Completion rule:
- The wave flow is not complete until `prepare-wave` succeeded, agent execution finished, and `finalize-wave` succeeded.

## Fallback Scripts

These scripts implement the same prompt assembly rules for debugging or external automation:
- `scripts/run-polywave-scout`
- `scripts/run-polywave-wave`

They are not the primary interface.
