# Polywave Codex Roadmap

## Purpose

This roadmap is the implementation control document for the Codex port of Polywave.

Current provisional execution conclusion: Polywave is viable on Codex with out-of-session `codex exec` workers, while the pure in-session wave-worker model remains blocked in the tested runtime. This should be treated as current evidence, not a permanent platform claim. The current blessed UX is a one-terminal sequential flow: in-session scout, then CLI wave launcher.
Official Codex config docs are consistent with that reading: writable roots are configurable, agent concurrency/depth are configurable, and the advanced config docs warn that some environments still keep `.git/` and `.codex/` read-only in `workspace-write` mode.

It separates:

- implementation work
- hardening work
- parity work

That separation is intentional. The hook proof work established the current mutation boundary and the operational constraints that implementation must preserve. This roadmap keeps those constraints visible while the Codex implementation moves forward.

## Current Baseline

Implementation status as of 2026-05-12:

- hook package and install surface are in place
- `polywave` skill is installed by the repo installer
- direct Codex ports of the current Claude agent prompts are installed:
  - `polywave-scout`
  - `polywave-wave-agent`
  - `polywave-planner`
  - `polywave-scaffold-agent`
  - `polywave-critic-agent`
  - `polywave-integration-agent`
- `scripts/verify-codex-install` validates the installed skill, agent files, hook package, config references, and trust-state presence
- the active Codex CLI loop via `$polywave` is the intended primary execution surface
- progressive-disclosure references and injector scripts are now ported into the Codex skill install surface
- live-loop scout proof now reaches manifest creation plus successful `finalize-scout`
- fallback wave launcher proof now completes end to end in a clean repo, including both prepared agents and successful `finalize-wave`
- deterministic prompt builders now unify live-loop and fallback agent prompt assembly
- full in-loop scout/wave orchestration flow is still not wired end to end; both tested primary-path wave worker-launch models are currently blocked by Codex runtime behavior

The current proven enforcement boundary is:

- `Bash`: audited and deny-enforced
- `apply_patch`: audited and deny-enforced
- LSP direct text edit family: audited and deny-enforced
  - `safe_edit`
  - `apply_edit`
  - `safe_apply_edit`
- LSP symbol rewrite family: audited and deny-enforced
  - `replace_symbol_body`
  - `safe_delete_symbol`
- LSP simulation family: audited and deny-enforced
  - `simulate_edit`
  - `commit_session(apply=true)` denied conservatively because its hook payload does not expose file paths

Open hardening item:

- fail-open characterization for crashing, timing-out, or malformed hooks

## Proof-Linked Constraints

These are not optional implementation preferences. They are constraints established by proof work.

1. Matcher expansions require re-trust
- Any hook matcher expansion changes the effective hook definition.
- Fresh-process runtime proof is not meaningful until the updated hook is trusted again.

2. `simulate_edit` is a real mutation path
- It must remain inside the shared LSP file-mutation matcher.
- It cannot be treated as harmless in-memory-only behavior.

3. `commit_session(apply=true)` is payload-limited
- Current hook payload exposes `session_id`, `apply`, and `target`, not file paths.
- Path-scoped enforcement is impossible at commit time with the current schema.
- Current defensible policy is blanket deny for `apply=true`.

4. `polywave-tools` remains authoritative
- Hook policy is enforcement and feedback.
- `polywave-tools prepare-wave`, `finalize-wave`, and related validation remain the protocol authority.

## Lane 1: Core Implementation

Goal: a usable first Codex Polywave implementation that stays inside the proven guardrails.

### Milestone 1: Install Surface

Status: complete

Completed:

- added `SKILL.md` implementation
- installed hook templates and config snippets
- installed direct Codex ports of the current Claude Polywave custom agents
- added `scripts/verify-codex-install`
- documented trust/re-trust requirements during install
- added uninstall symmetry for installed skill and agent artifacts

Exit criteria met:

- installer sets up the current hook package, skill, and custom agents
- user-facing docs point at one canonical install/verify flow

### Milestone 2: Minimal Scout Flow

Status: in progress

Completed:

- documented the exact scout invocation contract for repo root, feature text, and IMPL output path
- added repo/root AGENTS guidance strategy for target repos via `references/target-project-AGENTS.snippet.md` and `scripts/print-target-agents-snippet`
- added `scripts/run-polywave-scout` as a development/fallback Codex Scout launcher
- ported the progressive-disclosure reference pack and injector scripts from the Claude implementation into the Codex skill surface

Remaining:

- remove the remaining gap between live-loop wave orchestration and clean end-to-end finalization
- revalidate the updated live-loop wave path after the fixed multi-agent launcher stdin bug

Exit criteria:

- Codex can run the scout path end to end
- IMPL output is validated through `polywave-tools`

### Milestone 3: Minimal Wave Flow

Status: in progress

Completed:

- added `scripts/run-polywave-wave` as a development/fallback Codex wave launcher
- generate assigned-worktree instructions into agent launch context from `prepare-wave` output
- route setup and teardown through `polywave-tools prepare-wave` and `finalize-wave`
- fixed the multi-agent launcher stdin bug so both prepared agents execute
- proved one clean fallback wave end to end under Codex

Remaining:

- keep Bash policy and shared LSP file-mutation policy active in the primary live-loop product path
- determine whether any third primary-loop worker-launch mechanism exists that avoids both the child-agent git lock failure and the nested `codex exec` app-server failure

Exit criteria:

- one wave can be prepared, executed, and finalized under Codex
- implementation uses the proven mutation boundary rather than bypassing it

### Milestone 4: Installer Completion

Status: mostly complete

Remaining:

- decide whether installer should offer optional AGENTS snippet output for target repos
- decide whether `polywave-tools verify-install` should call through to `scripts/verify-codex-install` or absorb its checks

Exit criteria:

- install is repeatable
- uninstall removes only Polywave-managed artifacts
- verification path is stable between repo-local and `polywave-tools` entry points

## Lane 2: Hardening

Goal: tighten behavior around edge cases without blocking main implementation progress.

### Hardening A: Fail-Open Characterization

- Determine actual runtime behavior when a `PreToolUse` hook:
  - exits non-zero
  - times out
  - returns malformed output
- Record exact observed Codex behavior
- Decide whether extra mitigation is needed in install or docs

Status:

- still open

### Hardening B: Regression Fixture Expansion

- Add fixtures for:
  - shared LSP file-mutation matcher
  - `simulate_edit`
  - `commit_session(apply=true)` blanket deny
- Keep fixture suite aligned with runtime-proven surfaces

### Hardening C: Effective Inheritance Checks

- Reconfirm subagent sandbox/worktree inheritance in the real implementation flow
- Reconfirm agent launch assumptions once agent TOMLs are actively used by the product path

## Lane 3: Parity Backlog

Goal: close the gap with the Claude implementation after the minimal Codex flow exists.

### Agents

Status: base port complete

- installed direct Codex ports for `scaffold-agent`, `integration-agent`, `critic-agent`, and `planner`
- remaining parity work is behavioral: launch wiring, context injection, and any Codex-specific prompt adaptations needed after real execution

### User Flow

- command surface parity
- progressive disclosure references
- status / amend / bootstrap / interview / program paths as needed

### Observability

- event emission
- completion reporting
- implementation-facing diagnostics

### Docs

- QUICKSTART
- README cleanup after runnable flow exists
- install troubleshooting
- trust/re-trust troubleshooting

## Suggested Order

Work in this order unless new evidence changes the risk profile:

1. Minimal scout flow
2. Minimal wave flow
3. unify repo-local install verification with `polywave-tools verify-install`
4. fail-open hardening
5. parity polish

## Definition of “Ready to Claim”

Criteria for claiming a usable Codex Polywave implementation:

- [x] install path is documented and repeatable
- [x] scout flow works (in-session, proven)
- [x] at least one real wave flow works (CLI launcher, proven end-to-end)
- [x] proven mutation surfaces remain inside enforcement coverage
- [x] `polywave-tools` gates are mandatory in the executed flow

**This bar is met as of 2026-05-12.** The implementation is usable in hybrid mode: scout in-session, wave via CLI launcher.

Remaining work is UX improvement (single-session wave, parity polish) and hardening (fail-open characterization), not viability.

Do not claim hardening is complete until fail-open behavior is explicitly characterized.
