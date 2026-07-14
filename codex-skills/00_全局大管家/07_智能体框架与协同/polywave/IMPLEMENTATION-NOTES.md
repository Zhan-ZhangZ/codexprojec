# Polywave Codex Implementation Notes

## Overview

This is the OpenAI Codex CLI implementation of the Polywave protocol. It provides the same coordination model as the Claude Code implementation, adapted for Codex's skill, hook, sandbox, and subagent systems.

Primary execution surface:
- the active Codex CLI loop via the installed `$polywave` skill

Secondary surfaces:
- repo-local launcher scripts for development and wave execution

Implementation decisions should optimize for the in-loop `$polywave` path where it is proven. The current blessed wave path is the shell launcher, not the fully in-session loop.

## Provisional Conclusion

Based on current runtime proof, the Polywave parallel execution model is provisionally viable on Codex when prepared workers run as separate out-of-session `codex exec` processes.

The stricter model where one active Codex CLI session both orchestrates and directly hosts all wave workers is not yet viable in the tested runtime:
- in-session spawned workers hit git worktree metadata write failures
- nested `codex exec` launched from inside the active loop fails before worker start

This conclusion is provisional and subject to revision if future Codex runtime behavior changes or a third viable in-loop worker-launch mechanism is found.

## Why Codex Is a UX Downgrade From Claude Code

The Polywave protocol is platform-agnostic. The safety properties (disjoint file ownership, worktree isolation, deterministic merge gates) are identical on both platforms. What differs is the interaction model for wave execution, and the reasons are architectural.

### What Claude Code provides that enables single-session waves

Claude Code's `Agent` tool with `isolation: "worktree"` gives each spawned subagent:
- Its own git worktree as the working directory
- Full filesystem write access within that worktree (including `.git/worktrees/<name>/` metadata)
- An independent process that can `git add`, `git commit`, and write completion reports
- Lifecycle hooks (SubagentStart, SubagentStop) that inject environment variables, validate isolation, and verify completion before the agent exits

The orchestrator stays in-session, spawns N agents in parallel via the Agent tool, waits for all to complete, then runs finalize. One session, one command, fully automated.

### What Codex provides (and where it diverges)

| Capability | Claude Code | Codex | Impact on Polywave |
|-----------|-------------|-------|-------------------|
| Spawn subagent with isolated filesystem | `isolation: "worktree"` gives full write to worktree + its `.git/` metadata | Subagents inherit parent sandbox; `.git/` directories are read-only in `workspace-write` mode | Wave agents cannot `git commit` from inside a parent session |
| Nested process launch | N/A (agents are in-process) | `codex exec` inside active session fails with `Operation not permitted` | Cannot spawn workers as child processes from the orchestrator session |
| Subagent lifecycle hooks | SubagentStart, SubagentStop (7 hooks depend on these) | Not available | Cannot inject env vars or validate isolation at lifecycle boundaries |
| Command rewriting | `updatedInput` in PreToolUse rewrites bash commands | Not available | Cannot auto-prepend `cd $WORKTREE &&` to commands |
| Per-agent working directory | Set via `isolation: "worktree"` | `codex exec --cd <path>` (top-level only) | Works for out-of-session workers, not for in-session subagents |

### The resulting constraint

The single-session Claude Code wave experience depends on two capabilities Codex does not provide:
1. **Writable `.git/` metadata for child agents** (needed for `git commit`)
2. **Spawning isolated processes from within a session** (either via subagent isolation or nested exec)

Without either, wave workers must run as top-level `codex exec` processes. The orchestrator cannot host them. This forces the sequential two-step flow:
- Scout: in-session (works because scout doesn't commit to a worktree branch)
- Wave: out-of-session (workers need commit access that only top-level processes get)

### What would close the gap

Any of these Codex changes would enable single-session wave execution:
- `.git/worktrees/<name>/` made writable for child agents when the parent worktree root is in `writable_roots`
- A per-agent `sandbox_mode` or `writable_roots` override that actually takes effect for spawned subagents
- Support for `codex exec` launched from within an active session (nested exec)
- A SubagentStart hook or agent config option that sets the child's working directory with full write access

Until then, the hybrid model (scout in-session, wave from shell) is the correct design, not a workaround.

### Different trust models, different capability surfaces

This gap is not Polywave-specific. Any orchestration pattern that needs "spawn N workers, each commits to its own branch, orchestrator merges" hits the same wall on Codex. The constraint is architectural: Codex's sandbox protects `.git/` metadata from child processes.

Claude Code's `isolation: "worktree"` was purpose-built for this pattern. Anthropic designed the Agent tool with "workers need to commit independently" as a first-class use case. The trust model assumes: the parent orchestrator is trusted to decide what workers can do, workers are scoped to their worktree by the platform, and commits are how work is reported.

Codex's sandbox was designed for a different trust model: protect the user's repo from a single agent that might do something wrong. The sandbox boundary is "one agent, one repo, limited writes." Multi-agent parallel commits were not a design target.

Neither trust model is wrong. They serve different use cases. But for Polywave-style parallel agent orchestration, Claude Code's model is a better fit today.

## Current Recommended Usage

Use one terminal, sequentially:

1. Run scout in-session with `$polywave scout ...` or as a one-shot `codex exec` command.
2. Run wave execution from the shell with `scripts/run-polywave-wave <impl> --wave <N> --repo-dir <repo>`.

This is the current blessed user path. It does not require two terminal windows, and it does not require the user to keep one persistent Codex session open through wave execution.

## Relevant Codex Config Evidence

Official Codex configuration docs support several parts of the current interpretation:

- `sandbox_workspace_write.writable_roots` provides additional writable roots in `workspace-write` mode. That is consistent with the out-of-session worker model where the prepared worktree plus manifest repo root are made writable.
- `agents.max_depth` and `agents.max_threads` confirm that Codex exposes subagent nesting/concurrency controls, but these are capacity controls, not guarantees that child workers can safely commit inside git worktrees.
- The advanced config docs explicitly warn that in `workspace-write` mode, some environments keep `.git/` and `.codex/` read-only even when the rest of the workspace is writable. The docs specifically note that commands like `git commit` may still require approval to run outside the sandbox.

Taken together, these docs do not contradict our runtime results. They strengthen the current provisional reading:
- Codex is compatible with a multi-process worker model under configured writable roots.
- The docs do not guarantee that in-session spawned workers or nested `codex exec` launches are viable for git worktree commits.

Primary sources:
- https://developers.openai.com/codex/config-reference
- https://developers.openai.com/codex/config-advanced

The Codex implementation is not a hook-for-hook port. Codex hooks are best treated as a policy engine and feedback loop. The hard safety model must combine:

1. Codex workspace / sandbox scoping for worktree isolation
2. Codex hooks for command policy and protocol feedback
3. `polywave-tools` for deterministic ownership, completion, and merge gates

Hooks should deny unsafe operations when they see them, but they are fail-open by design and must not be the only enforcement boundary.

### Progressive Disclosure

> **Platform note:** Codex does not expose Claude Code's automatic custom-agent prompt rewrite surface. There is no direct equivalent to relying on `validate_agent_launch` plus `updatedInput` to splice conditional references into a child agent launch. In Codex, the orchestrator must call the injector scripts itself and prepend the returned content before delegation.

The Codex port now mirrors the Claude-side progressive disclosure architecture as far as the platform allows:

- `SKILL.md` remains the orchestrator core
- protocol reference files are installed under `~/.codex/skills/polywave/references/`
- `scripts/inject-context` ports the orchestrator-side routing logic
- `scripts/inject-agent-context` ports the conditional subagent reference routing

Important limit: Codex still lacks Claude's agent-launch prompt rewrite surface. That means the orchestrator must call `inject-agent-context` explicitly and prepend its output before delegating to a custom agent. This is a real behavioral difference, not just documentation.

The current procedural contract for this explicit orchestration path is documented in `references/live-loop-playbook.md`.

Latest runtime proof status:
- Live-loop scout path: proven to skill activation, manifest creation, and successful `polywave-tools finalize-scout`.
- Shell wave launcher path: now proven end to end in a clean proof repo. `prepare-wave` succeeded, both prepared agents ran, both completion reports were written, and `finalize-wave` completed successfully.
- Live-loop wave path: prepare/delegate/finalize orchestration is partially proven, but neither tested worker-launch mechanism is fully viable yet inside the active Codex loop. One primary-path proof run prepared correctly, agent A completed, and agent B failed to create `.git/worktrees/.../index.lock`, causing `status: blocked` and an expected `finalize-wave` refusal under E7. A second primary-path proof used explicit nested `codex exec --cd <worktree>` worker launches from inside the live loop; both launches failed immediately with `failed to initialize in-process app-server client: Operation not permitted`.

Prompt assembly status:
- The Codex implementation now ships deterministic prompt builders for `polywave-scout` and `polywave-wave-agent`.
- Those builders centralize prompt construction plus conditional reference injection so the live loop and fallback wrappers do not drift.
- The remaining primary-path problem is no longer prompt construction; it is clean orchestration through finalization.

Concrete defects discovered during wave proof:
1. Relative `apply_patch` paths inside prepared worktrees were denied by the current path policy, while absolute paths succeeded. Fixed: the path policy now canonicalizes relative targets against the allowed worktree root.
2. The direct agent instructions and fallback launcher used `polywave-tools set-completion --repo`, but the installed CLI expects the global flag `--repo-dir`. Fixed in agent guidance and fallback launcher prompts.
3. `scripts/run-polywave-wave` assumed pure JSON from `prepare-wave --json-only`, but real output can include hook chatter before the JSON payload. Fixed: the launcher now extracts the JSON payload from mixed output before parsing.
4. The old live `$polywave wave` prompt assembly path re-read too much local state before delegation. Mitigated: deterministic prompt builders now centralize prompt assembly for the primary loop and fallback wrappers.
5. `run-polywave-wave` originally launched only the first prepared agent because `codex exec` consumed the loop stdin and ate the remaining TSV rows. Fixed: the launcher now reads the agent list on a dedicated file descriptor and runs each `codex exec` with stdin redirected from `/dev/null`.
6. Revalidation on the fixed launcher succeeded: both prepared agents executed, both commits were verified, both completion reports were written, merge/finalize succeeded, and cleanup removed both worktrees.
7. During the clean proof run, the expected Polywave env vars were empty inside direct shell inspection within the prepared agents. This did not block execution because the launcher passes explicit worktree, branch, agent id, and repo-root context in the generated prompt, but it remains a hardening follow-up for the live-loop path.
8. Primary live-loop proof with in-session spawned workers exposed one blocker: agent B failed to commit because git could not create `/private/tmp/polywave-live-loop-wave-proof-live1/.git/worktrees/wave1-agent-B/index.lock` under the child-agent sandbox.
9. Primary live-loop proof with explicit nested `codex exec --cd <worktree>` worker launches exposed a second blocker: both worker launches failed before execution with `failed to initialize in-process app-server client: Operation not permitted`. This indicates that nested `codex exec` inside an active Codex session is not currently a viable worker-launch mechanism in this runtime.
10. Current defensible execution boundary: the fallback/out-of-session `codex exec` worker model is proven; the fully in-loop wave worker model is still blocked by Codex runtime behavior rather than Polywave orchestration logic.

## Platform Mapping

### Skills

| Claude Code | Codex CLI |
|---|---|
| `~/.claude/skills/polywave/SKILL.md` | `~/.codex/skills/polywave/SKILL.md` or project-scoped Codex skill location after verification |
| Invocation: `/polywave scout` | Invocation: `$polywave` or explicit mention |
| Progressive disclosure via hooks | Progressive disclosure native (Codex loads SKILL.md on activation) |

Codex uses the same Agent Skills standard (SKILL.md format). The skill content needs adaptation for Codex-specific tool names and invocation patterns.

### AGENTS.md Instruction Layer

AGENTS.md is a Codex instruction-discovery layer, not the Polywave skill itself. Codex reads AGENTS.md files before work starts, building a chain from global scope (`~/.codex/AGENTS.md` or `AGENTS.override.md`) and then from the project root down to the current directory. Later, more-local files override earlier guidance. Codex reads at most one instruction file per directory, preferring `AGENTS.override.md` over `AGENTS.md`, and only loads fallback names when configured.

Polywave should use AGENTS.md for stable repository and protocol guidance:

- This repo should include a root `AGENTS.md` for contributors implementing the Codex port.
- The installer should not silently overwrite a target project's AGENTS.md.
- The installer can offer an opt-in snippet or generated `AGENTS.polywave.md` plus config instructions for `project_doc_fallback_filenames`.
- Project AGENTS.md guidance should be short: point Codex at the installed Polywave skill, require `polywave-tools` gates, and state that wave agents must stay inside assigned worktrees.
- Dynamic per-wave context does not belong in AGENTS.md because Codex builds the instruction chain once per run/session. Use generated agent TOML, hook feedback, and `polywave-tools` outputs for per-wave data.

This layer partially replaces Claude's always-on skill-context injection, but it does not replace hooks, subagents, or deterministic gates.

### Agent Definitions

| Claude Code | Codex CLI |
|---|---|
| `.md` files in `~/.claude/agents/` or `~/.claude/skills/polywave/agents/` | `.toml` files in `~/.codex/agents/` or `.codex/agents/` |
| Fields: markdown body with YAML frontmatter | Fields: `name`, `description`, `developer_instructions` (TOML) |
| `subagent_type: scout` | Codex spawns by agent name from custom agent definitions |

Each Claude Code agent prompt (scout.md, wave-agent.md, scaffold-agent.md, integration-agent.md, critic-agent.md, planner.md) needs conversion to a TOML agent definition with `developer_instructions` containing the prompt content.

Codex subagents are enabled by default in current releases. Built-in agents include `default`, `worker`, and `explorer`. Project-scoped custom agents live under `.codex/agents/`; personal custom agents live under `~/.codex/agents/`. Each TOML file defines one custom agent and must include:

- `name`
- `description`
- `developer_instructions`

Optional custom-agent fields inherit from the parent session when omitted. Relevant fields for Polywave include `model`, `model_reasoning_effort`, `sandbox_mode`, `mcp_servers`, and `skills.config`.

Important inheritance behavior: subagents inherit the parent session's sandbox policy and live runtime overrides. A custom agent can set `sandbox_mode`, but parent turn overrides can still be reapplied when Codex spawns the child. Polywave must verify the effective sandbox/workspace behavior in real execution before relying on custom-agent config for isolation.

Global subagent settings live under `[agents]` in Codex config:

```toml
[agents]
max_threads = 6
max_depth = 1
```

`max_threads` defaults to 6. `max_depth` defaults to 1, which allows direct child agents but prevents deeper recursive fan-out.

### Hooks

| Event | Claude Code | Codex CLI | Status |
|---|---|---|---|
| SessionStart | Supported | Supported | Direct port |
| PreToolUse | Supported, matcher on tool name | Supported, primarily Bash command policy | Adapted port |
| PostToolUse | Supported | Supported, Bash feedback/audit | Adapted port |
| UserPromptSubmit | Supported, `additionalContext` | Supported, `additionalContext` | Direct port |
| Stop | Supported | Supported | Direct port |
| **SubagentStart** | **Supported** | **Not available** | Gap: see below |
| **SubagentStop** | **Supported** | **Not available** | Gap: see below |

**Hook config location:** `~/.codex/hooks.json` or `~/.codex/config.toml` (not `settings.json`)

**Feature flag required:** `hooks = true` in `config.toml`

`codex_hooks = true` was used in older docs/builds, but Codex CLI 0.130.0 reports it as deprecated. Use `hooks = true` for current Codex versions and keep compatibility checks in `verify-install`.

**Key difference:** Codex `PreToolUse` is the primary policy gate for shell commands. Current Codex CLI hook docs describe `tool_name` as `Bash` with command details under `tool_input.command`. Treat this as command-policy enforcement first; do not assume every file mutation path is visible unless verified in the target Codex runtime.

**Preferred deny output for `PreToolUse`:**

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Blocked: command writes outside the assigned Polywave worktree"
  }
}
```

Exit code `2` with a reason on stderr is also acceptable for simple shell hooks.

### Configuration

| Claude Code | Codex CLI |
|---|---|
| `~/.claude/settings.json` | `~/.codex/config.toml` |
| `polywave.config.json` (project) | `polywave.config.json` (project, same) |
| Permissions in `settings.json` | Sandbox mode and exec policy in `config.toml` |

## Enforcement Gaps and Workarounds

### Gap 1: No SubagentStart/SubagentStop hooks

**Impact:** Cannot mechanically inject environment variables or validate worktree isolation at subagent lifecycle boundaries.

**Claude Code hooks affected:**
- `inject_worktree_env` (SubagentStart): sets POLYWAVE_AGENT_WORKTREE, POLYWAVE_AGENT_ID, POLYWAVE_WAVE_NUMBER, POLYWAVE_IMPL_PATH, POLYWAVE_BRANCH
- `validate_agent_isolation` (SubagentStart): verifies agent is in correct worktree
- `validate_worktree_isolation` (SubagentStart): verifies worktree directory exists
- `validate_agent_completion` (SubagentStop): blocks if protocol obligations unfulfilled
- `emit_agent_completion` (SubagentStop): observability events
- `verify_worktree_compliance` (SubagentStop): verifies completion report and commits
- `polywave_critic_impl_commit` (SubagentStop): commits IMPL doc before critic stops

**Workaround:** 
- Env vars: bake worktree path, agent ID, wave number into the custom agent's `developer_instructions` at launch time (orchestrator constructs the TOML dynamically or uses polywave-tools to generate agent configs)
- Isolation validation: use PreToolUse on first Bash command to verify cwd is the correct worktree; also launch the agent with the worktree as its working root whenever Codex supports that
- Completion validation: use Stop hook to check completion report exists
- Observability: use Stop hook for event emission
- Critic commit: include explicit "commit IMPL doc before stopping" instruction in critic agent definition

### Gap 2: No updatedInput support

**Impact:** Cannot mechanically rewrite bash commands to prepend `cd $WORKTREE &&`.

**Claude Code hook affected:** `inject_bash_cd` (PreToolUse:Bash)

**Workaround:** 
- Cooperative: include explicit "always cd to your worktree before running commands" in wave agent `developer_instructions`
- Defensive: PreToolUse hook checks if the Bash command runs in or targets the correct worktree; deny with reason if not (can't rewrite, but can block and explain)
- Alternative: set the custom agent's working directory in its config if Codex supports per-agent cwd

### Gap 3: No additionalContext in PreToolUse

**Impact:** Cannot inject conditional references into agent prompts at launch time.

**Claude Code hook affected:** `validate_agent_launch` (PreToolUse:Agent, uses `updatedInput` for conditional reference injection)

**Workaround:**
- Pre-bake conditional references into the custom agent definition
- Use polywave-tools to generate agent TOML with all necessary context embedded

### Gap 4: Hooks fail open

**Impact:** A crashed hook, timed-out hook, invalid JSON response, or unsupported response field does not block execution.

**Workaround:**
- Keep hooks small and deterministic.
- Prefer exit code `2` for simple deny/feedback hooks.
- Validate hook behavior with fixture payloads before installing.
- Treat `polywave-tools prepare-wave` and `finalize-wave` as the protocol authority.
- Do not claim hard Polywave safety until sandbox/worktree scoping prevents writes outside the agent's assigned worktree.

### Gap 5: File-write visibility must be proven

**Impact:** If Codex can mutate files through a non-Bash path that does not trigger `PreToolUse`, a Bash-only hook cannot enforce I1 by itself.

**Workaround:**
- First implementation milestone should explicitly test whether Codex file edits, patch application, and MCP writes trigger hook events.
- If they do not, require sandbox/workspace scoping per wave agent and use hooks only for shell-command policy.
- Keep `polywave-tools` validation gates mandatory before merge.

## File Structure

```
polywave-codex/
├── AGENTS.md                   # Contributor instructions for this Codex port
├── SKILL.md                    # Agent Skill (same format as Claude Code)
├── references/                 # On-demand reference docs
├── agents/                     # Custom agent definitions (TOML)
│   ├── scout.toml
│   ├── wave-agent.toml
│   ├── scaffold-agent.toml
│   ├── integration-agent.toml
│   ├── critic-agent.toml
│   └── planner.toml
├── hooks/                      # Enforcement hooks (bash/python scripts)
│   ├── hooks.json              # Hook registration config
│   ├── codex-config.toml       # Inline config.toml snippet
│   ├── audit-hooks.json        # Optional raw payload capture config
│   ├── audit-codex-config.toml # Optional raw payload capture TOML
│   ├── pre_tool_use_bash_policy
│   ├── pre_tool_use_audit
│   ├── check_scout_boundaries
│   ├── check_wave_ownership
│   ├── validate_write_paths
│   ├── check_branch_drift
│   ├── warn_stubs
│   └── ...
├── fixtures/                   # Hook payload fixtures
│   └── hooks/
├── scripts/                    # Utility scripts
│   ├── print-codex-config
│   └── run-hook-fixtures
├── install.sh                  # Installer
├── uninstall.sh                # Removes installed hook artifacts
├── README.md
├── QUICKSTART.md
└── IMPLEMENTATION-NOTES.md     # This file
```

## Implementation Priority

Active execution plan:
- see [ROADMAP.md](ROADMAP.md) for the current implementation, hardening, and parity lanes
- use this file for design constraints and mapping details

### Phase 1: Verify Codex Enforcement Primitives
1. Confirm skill location and activation path for this Codex version
2. Confirm custom subagent definition format and install location (`~/.codex/agents/` and `.codex/agents/`)
3. Confirm hook config location and feature flag behavior
4. Build fixture tests for hook payloads and fail-open behavior
5. Verify which operations trigger hooks: Bash, file edits, patch application, MCP tools
6. Verify effective subagent inheritance for `sandbox_mode`, parent runtime overrides, approvals, and writable roots
7. Verify whether Codex can launch subagents with per-agent cwd / workspace scope
8. Verify AGENTS.md discovery behavior, override precedence, fallback filenames, and `project_doc_max_bytes` limits in the supported Codex versions

Current status: live Codex runtime proof now covers the full mutation boundary we have observed so far:
- `Bash`
- `apply_patch`
- LSP direct text edits: `safe_edit`, `apply_edit`, `safe_apply_edit`
- LSP symbol rewrites: `replace_symbol_body`, `safe_delete_symbol`
- LSP simulation edits: `simulate_edit`
- `mcp__lsp__commit_session` with `apply=true`, denied conservatively because its hook payload exposes only `session_id`, `apply`, and `target`, not file paths

The shared LSP file-mutation matcher currently targets:
`^mcp__lsp__(safe_edit|apply_edit|safe_apply_edit|simulate_edit|replace_symbol_body|safe_delete_symbol|commit_session)$`

Operational guidance from the proof work:
- Any matcher expansion changes the effective hook definition and requires the hook to be trusted again before fresh-process runtime proof is meaningful.
- `simulate_edit` is a real mutation path and must be treated as enforcement-relevant, not just as an in-memory helper.
- `commit_session(apply=true)` cannot be safely path-scoped with the current hook payload, so blanket deny is the defensible policy until Codex exposes richer context or external session-to-path tracking is added.

Open hardening item:
- fail-open characterization for crashing, timing-out, or malformed hooks is still unresolved and should remain tracked separately from mutation-surface coverage.

Current live-loop blocker discovered in runtime proof:
- A fresh `$polywave scout` run in Codex loaded the skill and disclosure scripts correctly, but the actual delegation to the custom scout agent did not complete. The runtime emitted: `Full-history forked agents inherit the parent agent type, model, and reasoning effort; omit agent_type, model, and reasoning_effort, or spawn without a full-history fork.` No IMPL file was written.
- This means the remaining gap is the concrete custom-agent launch contract inside the active Codex loop. The skill/disclosure layer is installed, but the product path still needs an implementation that maps Polywave custom-agent delegation onto Codex's actual spawn semantics.

### Phase 2: Minimal Viable Scout
9. SKILL.md adapted for Codex invocation patterns
10. Scout agent definition (TOML)
11. Root AGENTS.md for this repo plus an optional target-project AGENTS.md snippet
12. Install script (symlinks skill files and agent definitions)
13. Basic hooks.json with SessionStart and UserPromptSubmit context injection
14. `$polywave scout` can produce and validate an IMPL manifest

Current implementation status:
- direct Codex port of the scout agent is installed
- `SKILL.md` now defines the minimal scout invocation contract: explicit repo root, explicit feature text, explicit IMPL output path
- `references/target-project-AGENTS.snippet.md` is the canonical target-repo guidance snippet
- `scripts/print-target-agents-snippet` prints that snippet for copy/merge into a target repo
- end-to-end scout execution still needs actual orchestrator wiring and a real `polywave-tools` validation handoff path

### Phase 3: Bash Policy and Defensive Hooks
15. PreToolUse Bash policy hook: block dangerous commands, `git stash`, direct main commits, and commands outside assigned worktree
16. PostToolUse hook: audit command output and surface build/test feedback
17. Stop hook: require completion report, commit, and verification before allowing wave agents to finish
18. UserPromptSubmit hook: inject active IMPL/wave context when present
19. Fixture tests for all hook deny/feedback paths

### Phase 4: Wave Execution With Scoped Worktrees
20. Wave agent definition (TOML)
21. Scaffold agent definition (TOML)
22. Agent launch uses assigned worktree as cwd / workspace root where supported
23. Worktree isolation enforcement combines sandbox scoping, Bash policy hooks, and `polywave-tools prepare-wave`
24. Full wave lifecycle works only after isolation proof passes

### Phase 5: Full Parity and Polish
25. Integration agent, critic agent, planner agent definitions
26. Observability event emission
27. Progressive disclosure references
28. QUICKSTART with Codex-specific walkthrough
29. Installer handles hook config and feature flag setup
30. `polywave-tools verify-install` support for Codex
31. Test with real Codex execution

## Claude Implementation Parity Checklist

The Claude implementation under `../polywave/implementations/claude-code` is the parity source until the Codex port has executable coverage.

### Skill and Commands

- Port `prompts/polywave-skill.md` to Codex `SKILL.md`.
- Preserve the command surface: `scout`, `wave`, `auto`, `status`, `bootstrap`, `interview`, `program`, and `amend`.
- Preserve I6 role separation: the parent Codex session orchestrates, but scout/wave/scaffold/critic/integration work happens in subagents.
- Adapt Claude slash-command wording (`/polywave scout`) to Codex skill invocation (`$polywave scout` or explicit skill mention).
- Keep all `polywave-tools` gates authoritative: `init`, `validate`, `prepare-wave`, `finalize-wave`, `close-impl`, and `verify-install`.

### Agents

- Convert all six Claude agent prompts to Codex TOML: `scout`, `wave-agent`, `scaffold-agent`, `integration-agent`, `critic-agent`, and `planner`.
- Move YAML frontmatter fields into TOML where supported; put the markdown prompt body in `developer_instructions`.
- Replace Claude `tools:` allowlists with Codex-compatible instructions and sandbox/config validation.
- For wave agents, generate or parameterize instructions with assigned worktree, owned paths, forbidden paths, wave number, IMPL path, and branch.
- Verify built-in `worker`/`explorer` agents are insufficient before relying on them; Polywave-specific custom agents remain the default design.

### References and Prompt Scripts

- Port all Claude reference docs from `prompts/references/`.
- Port or replace `prompts/scripts/inject-context` and `inject-agent-context`.
- Where Claude injected context through hooks, Codex should use a mix of AGENTS.md static guidance, UserPromptSubmit context, generated agent TOML, and explicit `polywave-tools` reads.

### Hooks

- Direct/adapted ports: `block_git_stash`, `check_branch_drift`, `check_git_ownership`, `check_scout_boundaries`, `check_wave_ownership`, `polywave_orchestrator_stop`, `validate_impl_on_write`, `validate_write_paths`, and `warn_stubs`.
- Needs Codex-specific redesign: `inject_bash_cd`, `inject_skill_context`, `inject_worktree_env`, `validate_agent_launch`, `validate_agent_completion`, `validate_agent_isolation`, `validate_worktree_isolation`, `verify_worktree_compliance`, `emit_agent_completion`, and `polywave_critic_impl_commit`.
- Nice-to-have or low-risk ports: `auto_commit_on_write`, `auto_format_polywave_agent_names`, and `polywave_agent_name`.
- Do not claim parity for any hook until fixture tests cover Codex payload shape, deny output, timeout/fail-open behavior, and unsupported fields.

### Installer and Verification

- Match Claude installer behavior in Codex terms: install skill, agents, references, scripts, hooks, feature flag, and verification checks.
- Do not ship README install instructions until `install.sh` exists and is idempotent.
- Add `polywave-tools verify-install` checks for Codex-specific paths: skill, agents, hooks config, `hooks = true`, AGENTS.md snippet state, and required hook executables.
- Keep target-project AGENTS.md modification opt-in and reversible.

## Open Questions

1. Does Codex support per-subagent working directory? If so, we can set cwd to the worktree in the agent config instead of relying on cd injection.
2. Can custom agent TOML files be generated dynamically at runtime? The orchestrator needs to inject worktree paths and agent IDs into developer_instructions at wave prep time.
3. How does Codex handle subagent file writes? Do all write paths trigger hooks, or only Bash commands?
4. Does Codex support `isolation: "worktree"` or equivalent per-agent isolation parameter?
5. Can subagents be launched with a restricted writable root that excludes the parent repository?
6. Can the parent orchestrator reliably override `sandbox_mode` per wave agent, or do parent runtime overrides always dominate?
7. What is the correct project-scoped skill install location for the supported Codex release, and should this repo prefer global `~/.codex/skills/polywave` or project-local skill discovery?
