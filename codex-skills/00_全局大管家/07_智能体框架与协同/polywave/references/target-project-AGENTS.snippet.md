# Polywave target-repo snippet

Use the installed `polywave` Codex skill for Polywave planning and execution work in this repository.

## Polywave Rules

- Run scout and wave flows through `polywave-tools`; do not replace them with ad hoc repo-local orchestration.
- Treat assigned worktree or file ownership boundaries as hard constraints.
- Keep IMPL manifests under `docs/IMPL/` unless the user explicitly chooses another path.
- For scout work, provide the repository root, feature description, and intended IMPL output path explicitly.
- For wave work, require `polywave-tools prepare-wave` before agent execution and `polywave-tools finalize-wave` after completion.
- Do not use `mcp__lsp__commit_session` with `apply=true`; the current Codex policy denies it conservatively.
