# Codex Hook Isolation and Enforcement Proof

**Version:** 0.1.0

This document records the proof procedure for a Codex-based Polywave implementation that uses Codex hooks as tool-boundary enforcement. It is an implementation proof, not a replacement for the protocol invariants in `invariants.md` or the worktree requirements in `execution-rules.md`.

## Current Status

The current proof state is:

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

Operational rule:

- Any matcher expansion changes the effective hook definition.
- Fresh-process runtime proof is not meaningful until that updated hook is trusted again.

Remaining hardening item:

- fail-open characterization for crashing, timing-out, or malformed hooks

## Running Log

### 2026-05-12

- Verified active Codex config with `hooks = true`, trusted `PreToolUse` entries, and trusted `PostToolUse` audit entry.
- Verified trusted audit hooks record `PreToolUse` and `PostToolUse` payloads for allowed `Bash` tool calls.
- Verified trusted `PreToolUse` Bash policy denies `git stash list` before execution.
- Verified denied `Bash` command audit pattern: `PreToolUse` exists and no successful matching `PostToolUse` exists for the same `tool_use_id`.
- Verified direct policy behavior for outside-worktree absolute-path writes when `assigned_worktree` is present in the hook payload.
- Observed wildcard audit coverage for non-Bash surfaces: `apply_patch`, `mcp__codebase_memory_mcp__list_projects`, `mcp__lsp__get_change_impact`, and `mcp__lsp__get_diagnostics`.
- Verified runtime audit pre/post pairs exist for `apply_patch` and at least one MCP tool.
- Established current boundary: non-Bash surfaces are audited, but the active deny policy only targets `Bash`.
- Added `scripts/verify-codex-hook-enforcement` as a repeatable verifier for config state, direct hook behavior, and runtime audit evidence.
- Added this document as the canonical running record for Codex isolation and enforcement proof status.
- Implemented an `apply_patch` `PreToolUse` policy in the Codex implementation repo that denies patch targets outside the assigned worktree.
- Verified fixture-level `apply_patch` enforcement: inside-worktree patch allowed, outside-worktree patch denied, full hook fixture suite passing.
- Verified live `apply_patch` deny enforcement in a fresh `codex exec` process: an out-of-scope patch target under `/private/tmp` was blocked before execution, the denied `PreToolUse` audit record was written, and no matching successful `PostToolUse` record existed.
- Observed session behavior difference: the already-running parent Codex session did not pick up the newly added `apply_patch` policy hook, but a fresh process did after trust.
- Probed `mcp__lsp__.safe_edit` as a mutation surface by updating this running log through the LSP tool path.
- Verified runtime audit pre/post pair for `mcp__lsp__safe_edit`, including payload fields `file_path`, `old_text`, and `new_text`.
- Verified subagent write confinement for `apply_patch`: a child agent created an in-repo file successfully, attempted an out-of-repo file under `/private/tmp`, and was blocked by `PreToolUse` before execution.
- Verified subagent audit pattern: child-session `PreToolUse` and `PostToolUse` existed for the allowed in-repo patch, while the denied out-of-repo patch produced a `PreToolUse` record with no matching successful `PostToolUse`.
- Verified live `mcp__lsp__safe_edit` deny enforcement in a fresh trusted process: an out-of-tree target `/private/tmp/polywave-safe-edit-proof-2.md` was blocked by `PreToolUse`, no file was created, and no matching successful `PostToolUse` record existed.
- Verified the consolidated proof harness after the `safe_edit` deny work: `scripts/verify-codex-hook-enforcement` completed with 21 checks and 0 warnings.
- Probed fail-open behavior in an isolated `CODEX_HOME` with a `PreToolUse` hook that intentionally exits non-zero.
- Observed the isolated `codex exec` process fail with `401 Unauthorized` before any tool invocation; no hook output directory or probe payload was created, so the fail-open result remains inconclusive and blocked on a runnable fresh process.
- Inventoried additional LSP mutation-capable tool surfaces from live tool metadata: `mcp__lsp__safe_apply_edit`, `mcp__lsp__apply_edit`, `mcp__lsp__replace_symbol_body`, `mcp__lsp__safe_delete_symbol`, and `mcp__lsp__commit_session` with `apply=true`.
- Updated the verifier and coverage document to treat those LSP mutation tools as remaining explicit proof targets rather than leaving them implicit.
- Re-ran the consolidated verifier after aligning it with the current config shape; `scripts/verify-codex-hook-enforcement` completed with 25 checks and 0 warnings.
- Probed `mcp__lsp__apply_edit` directly by updating this running log so the runtime audit can confirm that tool path is hook-visible.
- Verified runtime audit pre/post pair for `mcp__lsp__apply_edit`, including payload fields `file_path`, `old_text`, and `new_text`.
- Confirmed `mcp__lsp__apply_edit` is hook-visible and structurally gateable, but it still lacks a deny-policy proof and dedicated matcher.
- Probed `mcp__lsp__safe_apply_edit` directly by updating this running log so the runtime audit can confirm that tool path is hook-visible.
- Verified runtime audit pre/post pair for `mcp__lsp__safe_apply_edit`, including payload fields `file_path`, `old_text`, and `new_text`.
- Confirmed the LSP direct text edit family now shares one observed path-based payload shape across `safe_edit`, `apply_edit`, and `safe_apply_edit`.
- Extended the shared LSP text-edit hook matcher in the local Codex config and the `polywave-codex` templates so one policy now targets `mcp__lsp__safe_edit`, `mcp__lsp__apply_edit`, and `mcp__lsp__safe_apply_edit`.
- Verified direct hook behavior for out-of-tree `mcp__lsp__apply_edit` and `mcp__lsp__safe_apply_edit` payloads: both were denied before execution.
- Verified live fresh-process deny enforcement for `mcp__lsp__apply_edit` and `mcp__lsp__safe_apply_edit`: out-of-tree targets under `/private/tmp` were blocked by `PreToolUse`, no files were created, and no matching successful `PostToolUse` records existed.
- Verified runtime audit pre/post pair for `mcp__lsp__replace_symbol_body`, including payload fields `file_path`, `symbol_path`, and `new_body`.
- Verified runtime audit pre/post pair for `mcp__lsp__safe_delete_symbol`, including payload fields `file_path` and `symbol_path`.
- Extended the shared LSP file-mutation hook matcher in the local Codex config and the `polywave-codex` templates so one policy now targets `safe_edit`, `apply_edit`, `safe_apply_edit`, `replace_symbol_body`, and `safe_delete_symbol`.
- Verified direct hook behavior for out-of-tree `mcp__lsp__replace_symbol_body` and `mcp__lsp__safe_delete_symbol` payloads: both were denied before execution.
- Observed that the widened symbol matcher required renewed hook trust before fresh-process runtime enforcement took effect.
- Verified live fresh-process deny enforcement for `mcp__lsp__replace_symbol_body` and `mcp__lsp__safe_delete_symbol`: out-of-tree targets under `/private/tmp` were blocked by `PreToolUse`, and no matching successful `PostToolUse` records existed.
- Verified runtime audit pre/post pair for `mcp__lsp__simulate_edit`, including payload fields `session_id`, `file_path`, edit range, and `new_text`.
- Confirmed `mcp__lsp__simulate_edit` is a real mutation path: before it was hooked, it was sufficient to move `.tmp-lsp-commit-probe/commit.go` prior to the blocked `commit_session` call.
- Extended the shared LSP file-mutation hook matcher in the local Codex config and the `polywave-codex` templates so it also targets `mcp__lsp__simulate_edit`.
- Verified direct hook behavior for out-of-tree `mcp__lsp__simulate_edit` payloads: denied before execution.
- Verified live fresh-process deny enforcement for `mcp__lsp__simulate_edit`: an out-of-tree target under `/private/tmp` was blocked by `PreToolUse`, no matching successful `PostToolUse` record existed, and the file stayed unchanged on disk.
- Observed the current runtime audit surface set now includes `mcp__lsp__blast_radius`, `mcp__lsp__open_document`, and `mcp__lsp__start_lsp` in addition to the previously recorded tools.
- Re-ran the consolidated verifier after adding `mcp__lsp__apply_edit` runtime coverage; `scripts/verify-codex-hook-enforcement` completed with 26 checks and 0 warnings.
- Collapsed the remaining LSP proof backlog into mutation families rather than per-method checklists: direct text edits, symbol-structure rewrites, and simulation-session commits.
- Re-ran the verifier after the family-based reframing; `scripts/verify-codex-hook-enforcement` still completed with 26 checks and 0 warnings.
- Re-ran the consolidated verifier after shared LSP text-edit deny coverage for `apply_edit` and `safe_apply_edit`; `scripts/verify-codex-hook-enforcement` completed with 30 checks and 0 warnings.
- Re-ran the consolidated verifier after shared LSP file-mutation deny coverage for `replace_symbol_body` and `safe_delete_symbol`; `scripts/verify-codex-hook-enforcement` completed with 34 checks and 0 warnings.

## What This Proves

The procedure proves three runtime properties:

- Codex hook configuration is loaded with hooks enabled.
- Trusted hooks run for Bash tool calls and write audit records.
- A trusted `PreToolUse` Bash policy can deny execution before the command runs.
- Trusted `PreToolUse` policies for `apply_patch` and `mcp__lsp__safe_edit` can deny out-of-tree mutations before the write occurs when exercised in a fresh trusted process.

The procedure also directly verifies policy logic for two Polywave-relevant controls:

- `git stash` is denied because it can hide work from ownership and completion gates.
- Mutating commands that reference absolute paths outside an assigned worktree are denied when `assigned_worktree` is present in the hook payload.

## Runtime Components

The verified Codex setup uses:

- `~/.codex/config.toml`
- `~/.codex/polywave/hooks/pre_tool_use_audit`
- `~/.codex/polywave/hooks/pre_tool_use_bash_policy`
- `~/.codex/polywave/hooks/pre_tool_use_apply_patch_policy`
- `~/.codex/polywave/hooks/pre_tool_use_safe_edit_policy`
- `~/.codex/polywave/audit`

The active config must include:

```toml
[features]
hooks = true

[[hooks.PreToolUse]]
matcher = "^Bash$"

[[hooks.PreToolUse.hooks]]
type = "command"
command = "${CODEX_HOME:-$HOME/.codex}/polywave/hooks/pre_tool_use_bash_policy"
timeout = 10
statusMessage = "Checking Polywave Bash policy"

[[hooks.PreToolUse]]
matcher = "*"

[[hooks.PreToolUse.hooks]]
type = "command"
command = "${CODEX_HOME:-$HOME/.codex}/polywave/hooks/pre_tool_use_audit"
timeout = 5
statusMessage = "Recording Polywave hook payload"

[[hooks.PreToolUse]]
matcher = "^apply_patch$"

[[hooks.PreToolUse.hooks]]
type = "command"
command = "${CODEX_HOME:-$HOME/.codex}/polywave/hooks/pre_tool_use_apply_patch_policy"
timeout = 10
statusMessage = "Checking Polywave apply_patch policy"

[[hooks.PreToolUse]]
matcher = "^mcp__lsp__safe_edit$"

[[hooks.PreToolUse.hooks]]
type = "command"
command = "${CODEX_HOME:-$HOME/.codex}/polywave/hooks/pre_tool_use_safe_edit_policy"
timeout = 10
statusMessage = "Checking Polywave safe_edit policy"

[[hooks.PostToolUse]]
matcher = "*"

[[hooks.PostToolUse.hooks]]
type = "command"
command = "${CODEX_HOME:-$HOME/.codex}/polywave/hooks/pre_tool_use_audit"
timeout = 5
statusMessage = "Recording Polywave hook payload"
```

The Codex trust state must contain trusted entries for each configured hook. When hook order changes, trust entries are index-sensitive and must be refreshed.

## Observed Runtime Tool Surfaces

The wildcard audit hook records more than Bash. In the observed runtime audit, these tool names appeared:

- `Bash`
- `apply_patch`
- `mcp__codebase_memory_mcp__list_projects`
- `mcp__lsp__get_change_impact`
- `mcp__lsp__get_diagnostics`
- `mcp__lsp__apply_edit`
- `mcp__lsp__safe_edit`

That distinction matters:

- The current deny policy is attached to `matcher = "^Bash$"`, `matcher = "^apply_patch$"`, and `matcher = "^mcp__lsp__safe_edit$"`.
- The audit hook records all tool names matched by `matcher = "*"`.
- Non-Bash tools are visible in audit logs even when no dedicated deny policy exists for them.
- `apply_patch` and `mcp__lsp__safe_edit` now have dedicated local policies with live deny proof, but live enforcement still depends on the hook being trusted and loaded by the active process.

## Mutation Families Still To Prove

Observed runtime audit shows some tool surfaces directly. Live tool metadata also shows additional write-capable LSP paths that remain outside the current proof set. The proof target is not every method name. The proof target is every distinct mutation mechanism.

The remaining LSP write surface groups are:

1. Direct text edit family
   Tools:
   `mcp__lsp__safe_edit`, `mcp__lsp__apply_edit`, `mcp__lsp__safe_apply_edit`

   Current status:
   `safe_edit`, `apply_edit`, and `safe_apply_edit` all now have allow proof, matching payload-shape proof, and deny proof under the shared path-based policy.

   Rationale:
   The observed `safe_edit` and `apply_edit` audit payloads both expose `file_path`, `old_text`, and `new_text`, so they appear to be the same path-based mutation family for policy purposes.
   `safe_apply_edit` emits the same payload shape in runtime audit, so the family grouping is now backed by direct evidence rather than inference from tool docs alone.

2. Symbol rewrite family
   Tools:
   `mcp__lsp__replace_symbol_body`, `mcp__lsp__safe_delete_symbol`

   Current status:
   `replace_symbol_body` and `safe_delete_symbol` both now have allow proof, runtime hook visibility, and deny proof under the shared LSP file-mutation policy.

   Rationale:
   Even though they mutate through symbol resolution rather than direct text replacement, both observed payloads still expose `file_path`, which makes the same path-boundary policy workable.

3. Simulation commit family
   Tools:
   `mcp__lsp__simulate_edit`, `mcp__lsp__commit_session` with `apply=true`

   Current status:
   `simulate_edit` has allow proof, runtime hook visibility, and deny proof under the shared LSP file-mutation policy.
   `PreToolUse` audit shows that `commit_session` exposes only `session_id`, `apply`, and `target` in its payload, with no file paths.
   A conservative local/template policy now denies `commit_session` whenever `apply=true`, because path-based scoping is not possible from the current hook payload alone.
   Direct hook proof for that deny path is complete.
   Fresh-process runtime deny proof for `commit_session(apply=true)` is also complete after re-trust.

   Rationale:
   `simulate_edit` is the per-file mutation path within the simulation workflow and can be path-scoped because it exposes `file_path`.
   `commit_session` writes through a session object rather than a per-file payload, so it remains a distinct enforcement question even if upstream edits were simulated safely. Under the current payload schema, blanket deny is the only mechanically defensible hook policy.

Each family still needs the same proof pattern where applicable:

- confirmation that it emits `PreToolUse` and `PostToolUse`
- an allow proof inside the assigned tree
- a deny proof outside the assigned tree or equivalent forbidden boundary
- a policy matcher if the payload shape supports path-based gating

## Payload Shapes Seen In Audit

The audit evidence shows these payload patterns:

For Bash:

```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "bash -lc pwd"
  },
  "tool_use_id": "call_..."
}
```

For `apply_patch`:

```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "apply_patch",
  "tool_input": {
    "command": "*** Begin Patch\n..."
  },
  "tool_use_id": "call_..."
}
```

For MCP tools:

```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "mcp__codebase_memory_mcp__list_projects",
  "tool_input": {},
  "tool_use_id": "call_..."
}
```

For `mcp__lsp__safe_edit`:

```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "mcp__lsp__safe_edit",
  "tool_input": {
    "file_path": "/abs/path/file",
    "old_text": "...",
    "new_text": "..."
  },
  "tool_use_id": "call_..."
}
```

For `mcp__lsp__apply_edit`:

```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "mcp__lsp__apply_edit",
  "tool_input": {
    "file_path": "/abs/path/file",
    "old_text": "...",
    "new_text": "..."
  },
  "tool_use_id": "call_..."
}
```

For `mcp__lsp__safe_apply_edit`:

```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "mcp__lsp__safe_apply_edit",
  "tool_input": {
    "file_path": "/abs/path/file",
    "old_text": "...",
    "new_text": "..."
  },
  "tool_use_id": "call_..."
}
```

For `mcp__lsp__replace_symbol_body`:

```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "mcp__lsp__replace_symbol_body",
  "tool_input": {
    "file_path": "/abs/path/file",
    "symbol_path": "Rewrite",
    "new_body": "..."
  },
  "tool_use_id": "call_..."
}
```

For `mcp__lsp__safe_delete_symbol`:

```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "mcp__lsp__safe_delete_symbol",
  "tool_input": {
    "file_path": "/abs/path/file",
    "symbol_path": "DeleteMe"
  },
  "tool_use_id": "call_..."
}
```

For `mcp__lsp__commit_session`:

```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "mcp__lsp__commit_session",
  "tool_input": {
    "session_id": "...",
    "apply": true,
    "target": "disk"
  },
  "tool_use_id": "call_..."
}
```

For `mcp__lsp__simulate_edit`:

```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "mcp__lsp__simulate_edit",
  "tool_input": {
    "session_id": "...",
    "file_path": "/abs/path/file",
    "start_line": 4,
    "start_column": 1,
    "end_line": 4,
    "end_column": 17,
    "new_text": "\treturn \"after\""
  },
  "tool_use_id": "call_..."
}
```

These examples are implementation evidence, not a stable cross-version schema guarantee. A Codex upgrade may change field names or payload structure.

## Manual Runtime Proof

1. Run an allowed Bash command from Codex:

```bash
bash -lc pwd
```

2. List the audit files:

```bash
find ~/.codex/polywave/audit -maxdepth 1 -type f | sort
```

3. Inspect the matching pre/post pair:

```bash
jq . ~/.codex/polywave/audit/*-PreToolUse-Bash-*.json
jq . ~/.codex/polywave/audit/*-PostToolUse-Bash-*.json
```

Expected evidence:

- `hook_event_name` is `PreToolUse` for the pre record.
- `hook_event_name` is `PostToolUse` for the post record.
- Both records have the same `tool_use_id`.
- `tool_name` is `Bash`.
- `tool_input.command` is the allowed command.
- The post record includes `tool_response`.

4. Run a command the policy denies:

```bash
git stash list
```

Expected Codex result:

```text
Command blocked by PreToolUse hook: Blocked: git stash hides work from Polywave ownership and completion gates. Command: git stash list
```

5. Inspect the audit files again.

Expected evidence:

- A `PreToolUse` audit record exists for `git stash list`.
- No successful `PostToolUse` record exists for the denied command's `tool_use_id`.

That final absence is important: it shows denial happened before command execution.

## Repeatable Verification Script

Run:

```bash
scripts/verify-codex-hook-enforcement
```

The script verifies:

- Required hook files exist and are executable.
- Codex hooks are enabled in the active config.
- The Bash policy hook and audit hook are installed in config.
- Hook trust-state entries exist for the current pre/post hook positions.
- Direct policy execution denies `git stash list`.
- Direct policy execution denies an outside-worktree mutating command when `assigned_worktree` is present.
- Direct policy execution allows a safe non-mutating command.
- The audit hook writes payloads to a configured audit directory.
- If runtime audit files are present, the audit trail contains an allowed Bash pre/post pair and a denied `git stash list` pre record without a matching post record.
- If runtime audit files are present, the audit trail also shows `apply_patch` and MCP tool pre/post pairs when those tools have been exercised in the session.
- If runtime audit files are present, the audit trail also shows `mcp__lsp__safe_edit`, `mcp__lsp__apply_edit`, `mcp__lsp__safe_apply_edit`, `mcp__lsp__replace_symbol_body`, and `mcp__lsp__safe_delete_symbol` pre/post pairs when those mutation surfaces have been exercised.

The script also emits an explicit warning for the remaining unproven LSP mutation families.

The runtime audit checks depend on prior Codex tool calls. If the manual proof has not been run in the current audit directory, the script reports warnings for missing runtime evidence while still validating static config and direct hook behavior.

## Relationship to Polywave Isolation

This proof supports the execution-time enforcement layer around E4 worktree isolation. It does not replace worktrees, disjoint file ownership, or merge-time validation.

The relevant layers are:

- Worktrees isolate each agent's filesystem execution context.
- Disjoint file ownership prevents merge conflicts between agents in the same wave.
- `PreToolUse` hooks block dangerous or out-of-bound Bash commands before execution.
- `PostToolUse` audit records provide evidence of allowed tool execution.
- Missing post records for denied commands provide evidence that denial happened before execution completed.

Together, these checks show that Codex hooks can participate in Polywave's defense-in-depth model for isolation and enforcement.

## Coverage Matrix

Current evidence supports this matrix:

| Tool surface | Audited | Deny proof | Current note |
| --- | --- | --- | --- |
| `Bash` | Yes | Yes | `PreToolUse` policy blocks `git stash` and tested outside-worktree writes |
| `apply_patch` | Yes | Yes | Fixture suite proves deny logic; fresh trusted `codex exec` process proved live denial; stale sessions may require restart or re-trust |
| `mcp__lsp__safe_edit` | Yes | Yes | Audited pre/post on allowed edits; fresh trusted process proved live denial for out-of-tree target |
| LSP direct text edit family | Yes | Yes | `safe_edit`, `apply_edit`, and `safe_apply_edit` all have runtime hook visibility with matching path-based payloads and live deny proof under the shared text-edit policy |
| LSP symbol rewrite family | Yes | Yes | `replace_symbol_body` and `safe_delete_symbol` have runtime hook visibility, path-bearing payloads, and live deny proof under the shared file-mutation policy |
| LSP simulation commit family | Yes | Yes | `simulate_edit` is path-scoped and deny-proven; `commit_session(apply=true)` is hook-visible, payload-limited, and deny-proven via conservative blanket block |
| Other observed MCP tools | Yes | No | Read-only examples observed in audit with pre/post records; no mutation proof needed unless they can write |

The immediate implementation task for stronger isolation is to add policy hooks or equivalent enforcement for non-Bash mutation surfaces, then prove those deny paths with the same pre-without-post pattern used for Bash.

## Remaining Proof Targets

The next proof gates are ordered by risk:

1. Non-Bash mutation surface inventory
   Evidence needed:
   A complete list of Codex tool paths that can modify files, and whether each one emits hook events.

2. Fail-open characterization
   Evidence needed:
   An intentional hook failure or malformed hook response proving what Codex does when a policy hook crashes, times out, or returns invalid output.
   Current blocker:
   The isolated fresh-process probe currently fails at Codex API authentication before reaching tool execution, so it does not yet establish whether hook failure is fail-open or fail-closed.

3. Merge-gate backstop
   Evidence needed:
   `polywave-tools` validation remains authoritative even if hook enforcement is incomplete or bypassed.

## Limits

This proof does not show full protocol conformance by itself.

It does not prove:

- File ownership validation for non-Bash edit tools.
- Subagent-specific writable-root isolation.
- Correct wave planning or IMPL manifest validity.
- Merge-time enforcement of disjoint file ownership.
- Runtime behavior in Codex versions with different hook payload schemas.

Those must be covered by implementation-level tests in the Codex Polywave implementation and by protocol checks in `polywave-tools`.
