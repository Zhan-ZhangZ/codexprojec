# Local Library Activation Design

## Purpose

ASM should support a neutral local skill library where skills can be installed once without becoming visible to Claude, Codex, or any other provider. Projects and tools should opt into individual skills by activation, preferably via symlinks, so the active skill set stays small and project-specific.

This is the next step toward issue #307's local/private skill management direction and prepares the source metadata needed for issue #247's dependency-aware installs. It builds on the lock metadata work that records install scope and repo-relative `skillPath`.

## Goals

- Install selected skills into an ASM-owned library path without exposing them to any provider.
- List centrally installed library skills.
- Activate a library skill into a provider and scope by creating a symlink.
- Preserve source metadata for future update and dependency-resolution work.
- Keep existing `asm install`, `asm link`, `asm update`, and provider behavior unchanged unless the user explicitly uses the new library flow.

## Non-Goals

- Do not resolve shared dependencies yet.
- Do not implement presets or sandbox mode yet.
- Do not copy library skills during activation in the first slice; activation is symlink-only.
- Do not change how provider-global installs work today.

## Command Surface

### Library Install

```sh
asm install <source> --library [--all] [--path <subdir>] [--name <name>] [-y]
```

`--library` reuses the existing install pipeline:

- source parsing and registry resolution
- git clone or local source handling
- subpath discovery
- duplicate target-name detection
- security warning preview and confirmation

Instead of installing into a selected provider path, it copies each selected skill into the ASM library root.

### Library List

```sh
asm library list [--json]
```

Lists skills installed in the central library. The human table should include name, version, source, skill path, installed date, and library path. JSON output should expose the same fields.

### Activate

```sh
asm activate <skill-name> -p <tool> -s <global|project> [--name <alias>] [--force] [--json]
```

Activation creates a symlink from the selected provider/scope folder to the library skill directory.

Examples:

```sh
asm install github:obra/superpowers --library --all -y
asm activate brainstorming -p codex -s project
asm activate brainstorming -p claude -s global --name sp-brainstorming
```

## Storage

Default paths:

```text
~/.config/agent-skill-manager/library/
  skills/
    <skill-dir-name>/
      SKILL.md
      ...
  library-lock.json
```

The first slice stores skills by install directory name. If two selected skills would map to the same library directory name, the same duplicate target-name protection used by provider installs should block the operation.

`library-lock.json` should be versioned and keyed by library directory name:

```json
{
  "version": 1,
  "skills": {
    "brainstorming": {
      "name": "brainstorming",
      "version": "1.0.0",
      "source": "github:obra/superpowers",
      "sourceType": "github",
      "commitHash": "abc123...",
      "ref": "main",
      "skillPath": "skills/brainstorming",
      "libraryPath": "/Users/example/.config/agent-skill-manager/library/skills/brainstorming",
      "installedAt": "2026-06-18T00:00:00.000Z"
    }
  }
}
```

## Data Flow

Library install:

1. Parse and resolve the source.
2. Discover/select skill directories using the existing install logic.
3. Build library install plans instead of provider install plans.
4. Copy selected skill directories to `library/skills/<skill-dir-name>`.
5. Write or update `library-lock.json` with source metadata, commit hash, and repo-relative `skillPath`.

Activation:

1. Load `library-lock.json`.
2. Resolve the requested library skill by directory name or frontmatter name.
3. Resolve the target provider and scope using existing provider config.
4. Create a symlink at `<provider-scope-dir>/<activation-name>` pointing to `libraryPath`.
5. Refuse to overwrite existing targets unless `--force` is provided.

## Error Handling

- `asm install --library` should fail with a clear error if selected skills collide on library directory name.
- `asm activate <skill>` should fail if the skill is not in the library, suggesting `asm library list`.
- Activation should refuse to overwrite real directories unless `--force` is used.
- Activation should replace existing symlinks when `--force` is used.
- Broken library entries should be shown by `asm library list` with a warning rather than crashing.
- Existing provider installs and links should continue using their current conflict behavior.

## Testing

Add focused tests for:

- `parseArgs` accepts `install --library`.
- `asm install <local multi-skill-dir> --library --all -y` creates library copies and does not create provider-visible skills.
- `asm library list --json` returns installed library skills.
- `asm activate <skill> -p codex -s project` creates a symlink into `.codex/skills`.
- Activation fails for unknown library skills with an actionable message.
- Activation refuses an existing target without `--force`.
- Activation with `--force` replaces an existing symlink.
- Existing install, link, and update tests still pass.

## Open Follow-Ups

- Add `asm deactivate` to remove activation symlinks.
- Add `asm library update` using the recorded source metadata.
- Add dependency closure resolution for issue #247.
- Add sandbox/preset commands on top of library activations.
