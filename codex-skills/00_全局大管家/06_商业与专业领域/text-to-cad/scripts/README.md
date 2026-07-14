# Scripts

Use these durable entrypoints for normal work:

| Task | Command |
| ---- | ------- |
| Set up dev symlinks | `scripts/dev/setup-symlinks.sh` |
| Check dev symlinks | `scripts/dev/setup-symlinks.sh --check` |
| Bundle production outputs | `scripts/bundle/bundle.sh --clean` |
| Check production outputs are fresh | `scripts/bundle/bundle.sh --check` |
| Bundle one skill output | `scripts/bundle/bundle-skill.sh <skill-id>` |
| Run code tests | `scripts/test/test.sh` |
| Run docs checks | `scripts/test/test-docs.sh` |
| Check canonical release version | `scripts/release/check-version.sh` |
| Install local skills into agents | `scripts/install/install-skills.sh --agent codex` |
| Uninstall local skill links | `scripts/install/uninstall-skills.sh --agent codex` |

Lower-level scripts stay grouped by ownership:

- `bundle/`: production bundle wrapper, skill bundle router, skill runtime
  bundlers, and plugin package bundle/check scripts.
- `test/`: code test runner and targeted test subcommands.
- `github-workflows/`: release-layout and development-layout check entrypoints
  used by GitHub Actions.
- `dev/`: symlink layout setup and verification for development checkouts.
- `install/`: local skill install/uninstall scripts for agent skill folders.
- `utils/`: shared helper scripts used by durable repo commands.
- `release/`: version bumping, release commits, tags, and GitHub Releases.
- `viewer/`, `git-hooks/`: specialized repo tooling.

Root `tests/` contains repo-wide policy tests that are not owned by one package,
skill, or app runtime.

## Bundle

`scripts/bundle/bundle.sh` is the master production bundle script. It runs every
bundle-capable skill through the skill bundle router and then refreshes the plugin
package copy:

```text
scripts/bundle/bundle-skill.sh --all
scripts/bundle/bundle-plugin.sh
```

Use:

```bash
scripts/bundle/bundle.sh --clean
scripts/bundle/bundle.sh --check
scripts/bundle/bundle-skill.sh <skill-id> --check
```

`scripts/github-workflows/check-builds.sh` is the release-layout gate. It verifies
there are no symlinks under production runtime paths, then runs
`scripts/bundle/bundle.sh --check` by default. Use `--skip-bundle-check` only in
workflows that already ran `scripts/bundle/bundle.sh --clean` in the same
checkout. Plugin skill-copy
freshness and plugin metadata validation are part of
`scripts/bundle/bundle-plugin.sh --check`, which runs through the master bundle
check.

`skills/cad-viewer/scripts/viewer/dist/` is generated and ignored in source
layout, but the root `.gitignore` unignores that exact production-runtime path so
`Publish` can commit the bundled Viewer assets on `main`. On `develop`,
`scripts/dev/setup-symlinks.sh --check` requires `skills/cad-viewer/scripts/viewer`
to be the source symlink instead.

## Dev

`scripts/dev/setup-symlinks.sh` is the master development-layout script:

```bash
scripts/dev/setup-symlinks.sh
scripts/dev/setup-symlinks.sh --check
```

It links generated-copy targets back to their canonical source directories and
checks that those symlinks are present.

## Install

Use the install scripts for local agent links:

```bash
scripts/install/install-skills.sh --agent codex
scripts/install/uninstall-skills.sh --agent codex
```

They install or remove local development skill symlinks in agent-specific skill
directories.

## Test

`scripts/test/test.sh` is the broad code test runner for source/package tests.
Documentation checks are separate so CI can run them with production bundle
checks. Python tests live under `tests/python/`, grouped by tested surface, so
skill and package runtimes do not carry test-only modules. Production bundle
copy steps also exclude conventional test directories and `*.test.*` /
`*.spec.*` files as a safety net. Focused subcommands can be run directly for
smaller checks:

```bash
scripts/test/test-js.sh
scripts/test/test-docs.sh
scripts/test/test-python.sh
scripts/test/test-global.sh
```

## Version And Release

Use `scripts/release/check-version.sh` for CI/read-only checks:

```bash
scripts/release/check-version.sh
scripts/release/check-version.sh --incremented-from origin/main
```

Normal development branches should not bump `plugins/cad/VERSION`. Use the
`Release` GitHub Actions workflow to open and ship the release PR from
`develop`; use `scripts/release/bump-version.sh` only as a local fallback for
that release PR:

```bash
scripts/release/bump-version.sh patch --dry-run
scripts/release/bump-version.sh patch --no-commit
```

`plugins/cad/VERSION` is the only canonical release bump file. Duplicate
package, plugin, lockfile, and Python `pyproject.toml` versions are derived from
it; the `Release` workflow stamps them with `scripts/release/sync-version.mjs`,
and `scripts/bundle/bundle.sh` re-checks the same metadata before writing or
checking production outputs.

Use `scripts/release/publish-github-release.sh` only from the `Release`
workflow after a main production bundle, or as a manual production-branch
fallback. It creates the semver git tag from `plugins/cad/VERSION` and creates
a GitHub Release with generated notes; unlike the `Release` workflow, which
publishes the release by default, the script creates a draft unless
`--publish` is passed.
Use `scripts/release/check-publish-source.sh` to verify that a source ref
contains the previous release source before the publish job writes a new
generated target commit.
Use `scripts/github-workflows/deploy-vercel-app.sh` only from the `Deploy Docs`
and `Deploy Viewer` workflows; it configures Vercel Authentication for preview
deployments only, deploys one Vercel project to production, and verifies its
public URLs.
`scripts/release/create-github-release.sh` remains as a manual all-in-one
fallback, but the workflow path is preferred.

## CI

| Workflow | Branches/events | Purpose |
| -------- | --------------- | ------- |
| `test.yml` | pushes to `develop`; PRs to `develop`; manual dispatch | Checks `plugins/cad/VERSION` and derived metadata as a separate job so the test job still runs if release metadata is wrong. The test job checks the `develop` symlink layout, bundles temporary production outputs, checks that layout without rebuilding it, and runs docs and code tests against the generated output. Superseded PR runs are cancelled. |
| `release.yml` | manual dispatch | The single release workflow: release PR, production publish commit to the target branch, models upload, web-app deploys, semver tag, and GitHub Release in one run. See the Releases section in `CONTRIBUTING.md` for the full flow, CI/CD-testing, and resume options. |
| `deploy-docs.yml` | manual dispatch; called by `release.yml` | Deploys the docs app to Vercel production from a production-layout ref (default `main`): configures Vercel Authentication for preview deployments only, runs `vercel pull/build/deploy --prod`, and verifies the public production URLs. |
| `deploy-viewer.yml` | manual dispatch; called by `release.yml` | Deploys the demo viewer app to Vercel production from a production-layout ref (default `main`), with the same protection and public URL checks as `deploy-docs.yml`. |
| `upload-models.yml` | manual dispatch; called by `release.yml` | Uploads the `models/` catalog and CAD Viewer assets to Vercel Blob via `scripts/viewer/upload-viewer-models-catalog.sh`, skipping assets that already match remote and fetching only the missing LFS objects. Upload from a source ref (default `develop`); `main` does not contain `models/`. |

In short: use `release.yml` for releases, use `deploy-docs.yml` and
`deploy-viewer.yml` to redeploy the individual web apps from `main`, use
`upload-models.yml` to push new models to Vercel Blob from `develop`, treat
`develop` as the editable symlink branch, and keep `main` as the explicit
publish-only production branch for user clones and published releases.
