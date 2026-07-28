# Paper-WorkFlow Polish — Week-Long Improvement Spec

**Date**: 2026-07-21
**Scope**: `skills/69-Paper-WorkFlow/` + repo root `SKILL.md`. No other directories touched.
**Strategy**: Breadth-first — four improvement directions, each a shallow but verifiable change.

## Background

`skills/69-Paper-WorkFlow/` (a git submodule) is the meta-orchestrator for the full empirical-paper workflow (Stage 0–9 + Method Gate + Draft Quality Gate). It is the de facto "brain" of the AERS repo, dispatching 47 child skills from `skills/67-econfin-workflow-toolkit/` and three analysis backends (`00.1` Python-StatsPAI, `00.2` Stata, `00.3` R).

Recent self-observations (from `skills/69-Paper-WorkFlow/worklogs/2026-07-08-week-recap.md` and `evals/complexity_audit.md`):

1. The repo adopted SkillOpt's *loop* but not its *pruning half*; SKILL.md is 38.7 KB, 6.7 KB over the 32 KB target.
2. `references/china-data-sources.md` (854 lines) and `references/chinese-journals.md` (1009 lines) are "claim-heavy but not citation-audited yet" — explicitly deferred to the next week.
3. Root `SKILL.md` does not document the trigger conditions for delegating to `69-Paper-WorkFlow`, so the orchestrator is reachable but not discoverable from the root router.
4. Failure-mode coverage in the orchestrator is descriptive ("if subagent fails, recover") but lacks chaos tests that would actually exercise the recovery paths.

This spec closes those four items in one shallow pass.

## Constraints

- Modify only: `skills/69-Paper-WorkFlow/` and repo root `SKILL.md`.
- Do not touch: any other `skills/*` collection, `catalog/`, `scripts/` outside 69, or anything outside 69 + root.
- All gates must remain green: `python3 validate_skill.py` (from 69 root), `python3 scripts/check_cross_references.py`, `python3 evals/check_complexity_budget.py`, and the new gate scripts defined below.
- Each deliverable is independently verifiable.
- Push to `main` once all four sections land and all gates pass.

## Section A — SkillOpt compactness pass

**Goal**: Hold `SKILL.md` at or below its current footprint (32,230 bytes as of 2026-07-21; complexity_audit.md historically flagged 32 KB as the aspirational target). The Section A goal is **not** to shrink further this week but to make the ratchet enforceable so future maintainers cannot grow it without justification.

**Changes** (all inside `skills/69-Paper-WorkFlow/`):

1. **`SKILL.md`** — trim redundant examples and inline templates; move any block > 50 lines that is only used by a single Stage into the corresponding reference. Keep the Stage 0–9 main table and the "调用协议" block intact — these are the routing contract.
2. **`references/skill-map.md`** — deduplicate Stage / skill entries that already appear verbatim in `references/stage-playbook.md`. Consolidate into a single source of truth.
3. **`references/stage-playbook.md`** — replace duplicated skill-anchor lines with cross-references to `skill-map.md`.
4. **`scripts/check_compactness.py`** (new) — scan every reference file and report whether any `references/*.md` is not referenced from `SKILL.md` or another reference. Orphan references are flagged, not auto-failed; the ratchet stays advisory.
5. **`evals/complexity_baseline.json`** — re-bump the SKILL.md ceiling to current size (32,230 B) and add the "≤ current" rule so any future PR that grows SKILL.md without an explicit `--update-baseline --note "why this must grow"` fails the complexity-budget gate.

**Acceptance**:

- `SKILL.md` byte size ≤ 32,230 (current; **no growth**).
- `python3 validate_skill.py` exits 0.
- `python3 evals/check_complexity_budget.py` reports the new footprint and exits 0.
- `python3 scripts/check_compactness.py` produces a report; zero orphans reported.
- No reference content is silently dropped: every file deleted/merged has a cross-reference replacement.

**Risk**: trimming too aggressively can break the routing contract. Mitigation — preserve Stage table and 调用协议 verbatim; only trim examples and inline templates.

## Section B — CN-claim audit pass

**Goal**: turn the "claim-heavy but not citation-audited yet" backlog from implicit risk into explicit metadata. Close out the `worklogs/2026-07-08-week-recap.md` "Open Items" entry on CN claims.

**Changes** (all inside `skills/69-Paper-WorkFlow/`):

1. **`_verification_log/cn-data-claims.md`** (new) — one row per auditable claim with: URL, last-checked date, source tier (A = journal / government / university; B = authoritative research institution; C = secondary aggregator), reviewer initials.
2. **`references/china-data-sources.md`** and **`references/chinese-journals.md`** — prepend a "Claim audit status" banner showing `audited/total` ratio and date of last pass.
3. **`scripts/check_cn_claim_audit.py`** (new) — read both files, match each `<claim>` paragraph to the verification log, emit a per-section report. Exit non-zero only if `un-audited / total > 0.5` (i.e. fail loudly when audit coverage drops below 50%).
4. Tags on low-tier claims: any row marked tier C or "not audited in > 30 days" gets a `⚠️` marker in the source file (visible to readers, but not blocking runtime).

**Acceptance**:

- `_verification_log/cn-data-claims.md` exists and has ≥ 50 rows.
- `references/china-data-sources.md` and `references/chinese-journals.md` both have an "Audit status" banner.
- `python3 scripts/check_cn_claim_audit.py` exits 0.
- `python3 validate_skill.py` exits 0.
- The "Open Items" entry in the next week's `week-recap.md` is closed.

**Risk**: at > 1,800 lines of claim text, time-per-claim is ~1 minute average. We will not achieve 100% coverage; the gate is set at 50% so the deliverable is honest, not performative.

## Section C — Root SKILL.md routing integration

**Goal**: make the root `SKILL.md` *explicitly* delegate to `skills/69-Paper-WorkFlow/` for full-paper tasks. Today the orchestrator is reachable but not mentioned.

**Changes**:

1. **Root `SKILL.md`** — append a new section **"Full-pipeline trigger"** listing the trigger phrases (`/paper-workflow`, "帮我写一篇实证论文", "从选题到投稿", "end-to-end empirical paper", "完整复现", "from proposal to submission") and pointing to `skills/69-Paper-WorkFlow/`. Append only — do not edit any existing section.
2. **Root `SKILL.md`** — add one row to the existing **"Method → where to start"** table: `Full paper pipeline (orchestrator) | skills/69-Paper-WorkFlow/`. Existing rows untouched.
3. **Root `SKILL.md`** — add a short subsection under the existing "Coverage Notes" block titled **"Name collisions"**, describing the 92-name collision issue and pointing readers to `qualified_name` (`<collection>::<name>`) as the disambiguation path. Already documented in passing; this makes it discoverable.
4. **`skills/69-Paper-WorkFlow/SKILL.md`** — add to the front-matter description a "When invoked by parent" hint: if the parent's invocation contains any of the trigger phrases above, jump directly to Stage 0 without re-confirming the trigger.

**Acceptance**:

- Root `SKILL.md` gains three append-only sections; no existing content is modified.
- A `grep` for each trigger phrase in root `SKILL.md` returns ≥ 1 match.
- `python3 scripts/check_cross_references.py` (from 69) exits 0 — confirms the new 69 ↔ root cross-link.
- `python3 validate_skill.py` exits 0.

**Risk**: root `SKILL.md` is the user-facing front door for everyone installing the repo as a single skill. Append-only discipline is mandatory.

## Section D — Orchestration robustness pass

**Goal**: codify three failure modes into chaos tests so future regressions are caught, not speculated.

**Changes** (all inside `skills/69-Paper-WorkFlow/`):

1. **`evals/chaos/`** (new directory) with three scenarios:
   - `chaos_skill_not_found.md` — simulates `Skill(skill="nonexistent")` returning not-found; checks the orchestrator falls back to `Read` + inline execution per `skill-map.md` §0.
   - `chaos_subagent_failure.md` — simulates a subagent that crashes or hangs; checks the main agent recovers via the `<=10-line summary` contract from `orchestration-and-handoff.md`.
   - `chaos_context_overflow.md` — simulates Stage 3 consuming > 80% of context budget; checks the orchestrator can split the stage or skip non-critical sub-tasks per the `workflow_state.json` checkpoint rule.
2. **`scripts/check_chaos_coverage.py`** (new) — scan every chapter of `references/stage-playbook.md`; flag any chapter that mentions a failure mode but has no corresponding `evals/chaos/` scenario. Output a coverage matrix; exit 0 if every documented failure mode has ≥ 1 scenario.
3. **`references/orchestration-and-handoff.md`** — add a **"Failure modes & recovery"** section, listing each documented failure mode and the canonical recovery path. Pull entries from existing prose; do not invent new failure modes.

**Acceptance**:

- `evals/chaos/` contains 3 scenario files.
- `python3 scripts/check_chaos_coverage.py` exits 0.
- `references/orchestration-and-handoff.md` has a "Failure modes & recovery" section.
- `python3 validate_skill.py` exits 0.

**Risk**: recovery paths in the absence of real failure history are based on inference. Mitigation — annotate each entry with "based on inference, refine on first real failure" rather than overclaim.

## Cross-cutting acceptance

- Every new file has YAML front-matter consistent with `SKILL_HYGIENE.md`.
- Every new script is referenced from the README of the directory it lives in.
- `validate_skill.py` (from 69) passes end-to-end after each section lands.
- The four section commits land on a feature branch; a single squash commit merges to `main` after all four land.
- The PR description mirrors this spec's "Acceptance" checklist.

## Out of scope

- Modifying any `skills/*` other than `69-Paper-WorkFlow`.
- Modifying `catalog/`, `scripts/` outside 69, `Makefile`, or any CI workflow.
- Deep SkillOpt pruning past 35 KB on SKILL.md — reserved for a future consolidation wave.
- Reaching 100% CN-claim audit coverage.
- Building the `catalog/`-level `qualified_name` resolver (separate workstream).

## Sequencing and push plan

1. Open a feature branch: `feat/week-polish-2026-07`.
2. Land Section A, push branch.
3. Land Section B, push.
4. Land Section C, push.
5. Land Section D, push.
6. Run the full gate suite once more on the branch tip.
7. Squash-merge to `main` via PR; the PR description cites this spec.
8. If any gate fails post-merge, file a follow-up issue (do not amend on `main`).

## Open risks

- Time pressure: four shallow sections in one branch. If any section runs over, drop the lowest-priority sub-deliverable, not the whole section.
- Root `SKILL.md` discipline: any non-append edit must be justified in the PR description or reverted.
- CN claim coverage: < 50% is not a real audit. We will not pretend otherwise.
