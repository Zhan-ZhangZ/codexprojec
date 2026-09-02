# 0002 — CLI command surface

**Status:** Accepted · 2026-07-02 · refreshed 2026-07-06 (commander adoption reversed by [0006](0006-close-style-backlog.md))

## Context

The bin ([`index.ts`](https://github.com/YosefHayim/ebay-mcp/blob/v1.15.0/src/index.ts)) hand-routes `setup` and `skills`, then falls through to
the MCP STDIO server. Setup uses `prompts`, `isTTY`, and shared CLI UI helpers
for its interactive flow. `diagnose` exists as an npm script and should be part
of the public bin surface.

ADR [0006](0006-close-style-backlog.md) removed `commander` because it was never
wired. The dual-mode CLI contract still stands; only the framework adoption was
reversed.

## Decision

Keep a small hand-written router. Do not add a CLI framework until command
complexity gives concrete evidence that the dependency earns its keep.

Command surface:

| Command            | Behavior                                     |
| ------------------ | -------------------------------------------- |
| `ebay-mcp`         | MCP stdio server (default, no subcommand)    |
| `ebay-mcp setup`   | OAuth/credential wizard (dual-mode)          |
| `ebay-mcp skills`  | Install agent skills (dual-mode)             |
| `ebay-mcp diagnose` | Config/connectivity check (non-interactive) |
| `--help` / `-h`    | Human-readable command help                  |

Every command is **dual-mode**: a bare invocation in a TTY opens the menu; flags
or a non-TTY defer and **never hang**; both routes call the same `run*` function.
Dev-only tooling (`sync`, `build-ui`, `test-endpoints`) stays behind `npm run`,
off the bin.

Command modules expose `run*({ argv, stdio })` functions so the bin, tests, and
npm scripts share the same path.

## Consequences

- No CLI framework dependency is added.
- `diagnose` becomes part of the target bin surface.
- Human CLI output may use stdout; MCP STDIO mode remains stdout-protocol-only.
- `getErrorMessage` remains the error path for command actions; migrated command
  code uses typed Effect errors and runs Effects only at the adapter boundary.
