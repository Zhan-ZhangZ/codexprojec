# Paper-WorkFlow submodule: keep, demote, or eject?

> **Status:** assessment, 2026-07. This document is *not* a roadmap item
> yet; the goal is to lay out the options so the maintainer team can
> decide. The submodule is at `skills/69-Paper-WorkFlow/` and is
> governed by the top-level `.gitmodules`.

## Why this question is on the table

`skills/69-Paper-WorkFlow/` is a git submodule — `brycewang-stanford/Paper-WorkFlow`,
which carries its own `validate_skill.py` gate. The top-level
`Makefile` runs it via the `paper-workflow-check` target, and CI is
conditioned on it. A `make validate` on a clean checkout *fails* unless
the submodule is initialised:

```bash
git submodule update --init --recursive
```

This is a real friction cost — every new contributor has to learn the
submodule command, every CI runner has to remember it, and recent
changelog entries have had to unstick a red `validate-catalog` workflow
more than once because of the submodule. The friction is also the
*only* reason to keep the submodule: it lets a separate repo evolve at
its own cadence with its own gate.

The question is: do those benefits still outweigh the costs, given how
the rest of the repo is structured?

## What the submodule buys

- **Independent release cadence.** Paper-WorkFlow can ship a new
  `validate_skill.py` rule weekly without the catalog needing a release.
- **Smaller mirror diffs.** Weekly syncs to AERS only carry the
  Paper-WorkFlow *delta*, not its entire history.
- **Cleaner authorship boundary.** Paper-WorkFlow commits live in
  their own repo and authorship; AERS has no edits over them.

## What the submodule costs

- **New-contributor friction.** The submodule command is the second
  most-frequent cause of `make validate` failing on a clean clone
  (the first is a stale local cache).
- **Branch drift.** If a contributor forgets to update the submodule
  pointer when the upstream `main` advances, AERS' CI runs against a
  stale Paper-WorkFlow `validate_skill.py`. This has been the root
  cause of at least one red `validate-catalog` badge in the last 60
  days.
- **Tooling duplication.** AERS already ships `scripts/validate-repo.py`,
  `scripts/check-repo-hygiene.py`, and `scripts/validate-workflows.py`.
  A fourth validator, sitting in a submodule with its own CLI, makes
  the local gate harder to reason about.
- **Changelog noise.** AERS `CHANGELOG.md` repeatedly mentions
  unblocking the Paper-WorkFlow sync.

## Three options, ranked

### Option A — Keep, but auto-update the pointer in CI

**Effort:** low. **Risk:** low.

Add a workflow that runs `git submodule update --remote --merge` on
Paper-WorkFlow daily, regenerates `validate-catalog` (so the badge
reflects the new state), and opens a PR if the pinned SHA moved. The
submodule stays; humans never have to remember the init command in
CI.

**Tradeoff:** preserves authorship boundary; removes only one of the
three costs (the "forgot the init command" cost).

### Option B — Convert to a subtree

**Effort:** medium. **Risk:** medium (one-time invasive change).

A subtree is still a separate repo, but its commits live **inside** the
AERS tree. `git pull` brings the latest Paper-WorkFlow commits in
silently; the contributor never has to know it is a separate repo. CI
becomes simpler (one repo, one set of secrets, one set of badges), and
the AERS history gets a true merged record of every Paper-WorkFlow
commit.

**Tradeoff:** gives up independent release cadence and authorship
boundary. Gains a much smoother contributor experience.

### Option C — Demote Paper-WorkFlow to a normal vendored collection

**Effort:** low-to-medium. **Risk:** low.

Take the Paper-WorkFlow repo out of the submodule. Vendor it as a
*normal* collection, like every other `skills/NN-…` folder. Run its
`validate_skill.py` from `scripts/validate-workflows.py` (or fold the
gates it enforces into `scripts/validate-repo.py` and remove the
separate file).

**Tradeoff:** the cleanest end-state. AERS becomes a true flat
catalog: 70 collections, no submodule. Paper-WorkFlow's validator
gates survive as part of the AERS local quality gate.

## Recommendation

**Option C**, with Option A as a transitional step.

1. **Now (Option A):** add the daily submodule auto-update workflow so
   contributors stop seeing red badges. This is the lowest-risk move
   and unblocks the immediate pain. **No** change to the repo's
   structure yet.
2. **Next release window (Option C):** de-submodule Paper-WorkFlow.
   Vendor it as `skills/69-Paper-WorkFlow/`, with its `validate_skill.py`
   kept as a vendored script and the gates it enforces either folded
   into the existing `validate-repo.py` or exposed as
   `make paper-workflow-check` (which already exists).
3. **Re-evaluate after one release.** If Paper-WorkFlow still wants
   independent release cadence after vendoring, AERS can re-submodule
   it later — but the bet is that, having been vendored for a cycle,
   it no longer needs to be.

Option B (subtree) is on the table but is more invasive and buys
less than Option C for this particular submodule: AERS does not
already use subtrees, so introducing the pattern for one case is
larger churn than just demoting it.

## What this is *not*

- **Not a vote on Paper-WorkFlow's quality.** The submodule's
  `validate_skill.py` is good; the question is purely about *where it
  lives* and *how it's surfaced to AERS contributors*.
- **Not a request to change Paper-WorkFlow's repo.** Options A and
  C are entirely AERS-side changes. Paper-WorkFlow's own repo and
  its own release cadence are untouched.
- **Not blocking other improvements.** None of the P0 / P1 / P2
  improvements documented elsewhere in this catalog depend on this
  decision.

## Decision inputs the maintainer team should weigh

- *How often does Paper-WorkFlow change its validator independently of
  AERS releases?* (If "rarely," Option C is clearly correct; if
  "weekly," Option A preserves that.)
- *How many AERS contributors are also Paper-WorkFlow contributors?*
  (If the overlap is small, Option C's smoother experience is more
  valuable; if the overlap is large, the friction is already
  internalized.)
- *Is the auto-update idea in Option A in tension with the
  no-paid/no-proprietary rule?* (It is not — running
  `git submodule update` is pure OSS plumbing.)

## Cross-reference

- `.gitmodules` — current pointer
- [`Makefile`](../Makefile) — `paper-workflow-check` target
- [`CHANGELOG.md`](../CHANGELOG.md) — past unblockings of the sync
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — what a new contributor sees
- [`LONG_SKILL_STATUS.md`](LONG_SKILL_STATUS.md) — adjacent "is this
  thing too big / is it split correctly" triage
