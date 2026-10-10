# Library Deactivate and Update Design

## Purpose

The neutral local library flow can install skills centrally and activate them into a provider scope, but it still needs two management operations to feel complete:

- remove an activation without deleting the central library copy
- refresh centrally installed skills from their recorded sources

This slice implements the first two open follow-ups from the local library activation spec. It intentionally does not implement dependency closure, presets, sandboxing, or bundle-style activation sets.

## Goals

- Add a safe `asm deactivate` command for removing provider activation symlinks.
- Add `asm library update` for refreshing one or all library skills from recorded source metadata.
- Preserve existing provider installs and links unless the user explicitly runs the new commands.
- Keep deactivation conservative: it removes ASM library symlinks only, never real provider directories.
- Reuse the source metadata already recorded in `library-lock.json`.

## Non-Goals

- Do not resolve dependencies for issue #247 yet.
- Do not implement presets, activation profiles, or sandbox commands.
- Do not update provider-visible copies created by regular `asm install`.
- Do not make `deactivate --force` remove real directories in this slice.

## Command Surface

### Deactivate

```sh
asm deactivate <skill-name> -p <tool> -s <global|project> [--json]
```

Deactivation removes the symlink created by `asm activate`.

Examples:

```sh
asm deactivate brainstorming -p codex -s project
asm deactivate sp-brainstorming -p claude -s global --json
```

`<skill-name>` is the activation directory name in the provider scope. This keeps the command predictable when activation used `--name <alias>`.

### Library Update

```sh
asm library update <skill-name> [--json]
asm library update --all [--json]
```

`<skill-name>` resolves the same way `asm activate` does: exact library directory name first, then frontmatter `name`.

## Data Flow

Deactivation:

1. Resolve provider and scope using the same provider config path logic as `asm activate`.
2. Resolve `<provider-scope-dir>/<skill-name>`.
3. If the path does not exist, return an actionable "not active" error.
4. If the path is not a symlink, refuse to remove it.
5. Resolve the symlink target.
6. If the target is not inside ASM's library skills directory, refuse to remove it.
7. Remove the symlink.
8. Return a human or JSON result with provider, scope, path, and target.

Library update:

1. Read `library-lock.json`.
2. Select one entry by directory/frontmatter name or all entries for `--all`.
3. Validate that each selected entry has enough metadata to re-fetch the source: `source`, `sourceType`, `skillPath`, `libraryPath`, and commit/ref information when relevant.
4. Resolve the source using existing install/update source helpers where possible.
5. Locate the recorded `skillPath` in the refreshed source.
6. Parse and validate the refreshed `SKILL.md`.
7. Copy into a temporary sibling directory under the library skills root.
8. Atomically replace the existing library directory after the refreshed skill is validated.
9. Update `library-lock.json` with the new version, commit hash, installed timestamp, and preserved source path metadata.
10. For `--all`, continue after per-skill failures and summarize successes and failures.

## Safety Rules

- `asm deactivate` is symlink-only. This slice does not add `deactivate --force`, and the command must not remove real directories.
- `asm deactivate` must only remove symlinks whose resolved target is inside the ASM library skills directory.
- `asm library update` must not leave a library entry half-replaced if source resolution or metadata parsing fails.
- `asm library update --all` must not stop the whole batch because one library entry is broken or missing metadata.
- Existing project/global provider installs remain outside this flow.

## Error Handling

- `asm deactivate <skill>` fails if scope is `both`; it requires `global` or `project`.
- Missing deactivation target: `Skill "<name>" is not active for <provider>/<scope>.`
- Real directory target: `Refusing to deactivate non-symlink target: <path>.`
- External symlink target: `Refusing to deactivate symlink outside the ASM library: <path>.`
- Unknown library update target suggests `asm library list`.
- Missing update metadata names the exact lock field that is unavailable.
- `library update --all --json` reports per-skill status instead of throwing away partial results.

## Testing

Add focused tests for:

- `parseArgs` recognizes `deactivate`.
- `asm deactivate <skill> -p codex -s project` removes a project activation symlink.
- `asm deactivate` refuses a real provider directory.
- `asm deactivate` refuses a symlink pointing outside the ASM library.
- `asm deactivate` reports a missing activation with an actionable message.
- `asm library update <skill>` updates a local-source library skill.
- `asm library update <skill>` uses recorded `skillPath`, not the source root.
- `asm library update --all --json` reports successes and failures independently.
- Existing library install/list/activate tests still pass.

## Open Follow-Ups

- Dependency closure resolution for issue #247.
- Sandbox or preset commands on top of library activations.
- Optional activation manifest tracking if future UX needs to distinguish ASM-created symlinks from manually-created symlinks that point into the library.
