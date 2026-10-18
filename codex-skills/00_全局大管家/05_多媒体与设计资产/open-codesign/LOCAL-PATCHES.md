# Local patches

- 2026-10-18 integration at upstream `a63feb563da94090778fc5bee67e9672fccd26a1`.
- Upstream had no `SKILL.md`; added a source-based entry for installation, source startup, and code navigation.
- Removed website/release/governance/IDE layers: `website/`, `packaging/`, `.github/`, `.Codex/`, `.claude/`, `.husky/`, `.vscode/`, `.changeset/`, `examples/`, development plan files, repository automation config, a stray screenshot, and 287 upstream test/spec files. The Electron workspace, production packages, lockfile, patches, product docs, and provider smoke scripts are retained so the app can still be installed from source.
