# AGENTS.md

## Repository Expectations

- Treat this repository as the Codex implementation of Polywave, not the protocol spec or Claude Code implementation.
- Keep behavior aligned with `../polywave/implementations/claude-code` unless Codex platform differences require an explicit redesign.
- Do not claim installability until `install.sh`, Codex skill files, custom agents, hook config, and verification checks exist.
- Hooks are defensive policy and feedback only. Do not rely on hooks as the sole boundary for worktree isolation because Codex hooks can fail open.
- Prefer deterministic checks through `polywave-tools` for ownership, completion, and merge gates.
- Keep target-project `AGENTS.md` changes opt-in and reversible.

## Verification

- Run `scripts/run-hook-fixtures` after changing hook scripts or hook fixtures.
- Fixture coverage should grow before hook behavior is broadened.
- When adding a Codex parity feature, update `IMPLEMENTATION-NOTES.md` with the Claude source artifact and any Codex-specific gap.
