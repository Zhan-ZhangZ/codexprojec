# Agent Runtime Orchestrator + MCP Reliability — Worklog

Start date: 2026-06-21

## Objective

Improve StatsPAI from the angle of **agent-driven end-to-end empirical
analysis**, on the *runtime* side: make the MCP / agent tool surface reliable
enough that an LLM agent can drive a complete causal-inference study without
hitting tool-contract crashes, and so that the agent journey stays locked by
tests against future drift.

This lane is the **runtime** complement to the parallel
`2026-06-21-agent-empirical-analysis-uplift` lane (which builds a *static*
workflow-spec audit). The two do not overlap: that lane validates whether a
workflow *description* is well-formed; this lane makes the tools the workflow
*executes* honor their advertised contracts.

## Hard constraints

- **JOSS-safe**: additive only. No change to any estimator's numeric output.
  Do not touch `Paper-JSS/`, `CausalAgentBench/`, `paper.md`, `paper.bib`,
  release/tag/PyPI metadata.
- **No commit/push** without explicit per-session authorization (CLAUDE.md §9).
- Keep generated-schema changes narrow. This lane may update the generated
  `tools.json` snapshots only when repairing the exact agent-facing curated
  tool schemas touched here, and must keep `dump_schemas.py --check` green.
  Do not touch unrelated generated schema indexes, release docs, or registry
  counters owned by concurrent lanes.
- Stay out of every path owned by the other four active lanes (see "Not owned").

## Key architectural facts established (read-only audit)

- MCP server exposes **506 tools** with a uniform envelope
  (`data_path / data_columns / data_sample_n / result_id / as_handle / detail`).
  Fit tools already return `next_steps`, `suggested_functions`, `next_calls`,
  `narrative`, `citations`, `data_provenance`; `audit_result` returns a
  structured robustness checklist. Result-handle chaining (`as_handle=True` →
  `result_id` → `*_from_result`) works. `sp.causal()` / `sp.causal_question()` /
  `sp.paper()` / `pipeline_did|iv|rd` all run end-to-end.
- Dispatch precedence in `agent/tools/_dispatch.py::execute_tool`:
  `WORKFLOW_TOOL_NAMES` → `PIPELINE_TOOL_NAMES` → curated `TOOL_REGISTRY`
  (resolve `statspai_fn`, **no kwarg filtering**) → `dispatch_registry_tool`
  (auto; **filters kwargs to registry ParamSpec**).
- `statspai_fn` is an internal spec field and is **NOT** dumped to
  `schemas/*.json` (verified: grep count 0). Advertised `input_schema` params
  **ARE** dumped. → Repointing `statspai_fn` is schema-stable; editing
  `input_schema` is not.

## Bugs found (all in this lane's files — agent/)

A static scan of all 506 tools + runtime probes found exactly four
schema↔dispatch contract defects. An agent following the advertised schema hits
them:

1. **`detect_design`** (`agent/workflow_tools.py::_tool_detect_design`):
   schema advertises `id_col_hint` / `time_col_hint`; the wrapper forwards them
   verbatim to `sp.detect_design(unit=, time=, ...)` → `TypeError: unexpected
   keyword argument 'id_col_hint'`. **Fix: translate** `id_col_hint→unit`,
   `time_col_hint→time` (no schema change). FIXABLE here.
2. **`sensitivity`** (`agent/tools/_specs/_diag.py`): `statspai_fn="sensitivity"`
   does not resolve (`sp.sensitivity` does not exist) → `execute_tool` raises an
   **unhandled `ValueError`** (not even a clean error envelope). The spec's
   description matches `sp.unified_sensitivity` exactly (Oster / Cinelli-Hazlett
   / E-value dashboard). **Fix: repoint** `statspai_fn → "unified_sensitivity"`
   (schema-stable) + make `execute_tool` never raise on resolve failure.
3. **`honest_did`** (`agent/tools/_specs/_did.py`): schema advertises the legacy
   raw HonestDiD API (`betas / sigma / num_pre_periods / num_post_periods /
   m_bar`); `sp.honest_did` now takes a `result` object → `TypeError`. No
   surviving `sp.*` accepts the raw betas/sigma form, so there is no schema-
   stable repoint. **Disposition: kwarg-filter safety net** (drops the
   unaccepted params transparently, no crash) + **ratchet as known-stale**;
   proper fix is a schema regen → **deferred** (cross-lane).
4. **`spec_curve`** (`agent/tools/_specs/_diag.py`): schema advertises
   `treatment / covariates / model_family / subsample_vars`; `sp.spec_curve`
   takes `x / controls / subsets / ...` with *different structure*
   (`covariates: List[str]` vs `controls: List[List[str]]`). A name translation
   would risk silently-wrong semantics, which violates "fail loud". **Disposition:
   kwarg-filter safety net + ratchet as known-stale**; proper fix is a schema
   regen → **deferred** (cross-lane).

## Plan

1. **Harden `execute_tool` curated path** (`agent/tools/_dispatch.py`):
   - Never raise an unhandled exception when `statspai_fn` cannot be resolved —
     return a clean `{error, remediation}` envelope (fixes the `sensitivity`
     crash class for any future mis-pointed spec).
   - Filter advertised kwargs to the resolved function's signature (skip if the
     fn has `**kwargs`), mirroring the auto path. Record any dropped names under
     `_unsupported_args` so the degradation is **transparent, not silent**.
     This removes the `honest_did` / `spec_curve` TypeError crashes.
2. **`detect_design` hint translation** (`agent/workflow_tools.py`).
3. **Repoint `sensitivity`** → `unified_sensitivity` (`agent/tools/_specs/_diag.py`),
   gated on `dump_schemas.py --check` staying green.
4. **Contract test** `tests/test_mcp_tool_contract.py`:
   - every tool dispatches to a dict, never raises;
   - no tool emits a `bad_argument` remediation naming one of its *own*
     advertised params;
   - a documented `KNOWN_STALE_SCHEMA` ratchet for `honest_did` / `spec_curve`
     (set must not grow);
   - regression: `detect_design` honors `id_col_hint` / `time_col_hint`.
5. **Assess** a single design-agnostic "one call → full traced analysis" MCP
   tool. A *new* tool needs a schema regen (collision) so it is out of scope
   here; document the assessment + recommendation instead.

## Owned files

- `plans/2026-06-21-agent-runtime-orchestrator/WORKLOG.md`
- `src/statspai/agent/tools/_dispatch.py`
- `src/statspai/agent/_enrichment.py`
- `src/statspai/agent/mcp_server.py`
- `src/statspai/agent/workflow_tools.py`
- `src/statspai/agent/tools/_specs/_diag.py`
- `src/statspai/agent/tools/_specs/_did.py`
- `schemas/tools.json`
- `src/statspai/schemas/tools.json`
- `tests/test_mcp_enrichment.py`
- `tests/test_mcp_protocol.py`
- `tests/test_mcp_tool_contract.py` (new)
- `tests/agent_eval/test_mcp_protocol_transcript.py` (new)

## Not owned (other active lanes — do not touch)

- `scripts/agent_workflow_spec_audit.py`, `tests/test_agent_workflow_spec_audit.py`,
  `plans/2026-06-21-agent-empirical-analysis-uplift/` (uplift lane)
- `src/statspai/did/*`, `regression/iv.py`, `matching/match.py`,
  `tests/test_correctness_inference_fixes.py`, `CHANGELOG.md`, `MIGRATION.md`
  (correctness lane)
- `src/statspai/core/effect_summary.py`, `src/statspai/checks/`,
  `src/statspai/smart/intake.py`, `scripts/check_contract_inventory.py`
  (contracts lane)
- `src/statspai/plots/counterfactual.py`, `src/statspai/timeseries/its.py`,
  `src/statspai/bayes/_base.py`, `src/statspai/core/results.py` (design-pass lane)
- `src/statspai/smart/verify.py`, `src/statspai/smart/citations.py`,
  `src/statspai/agent/_translation/*`, `scripts/quality_gate.py` (hardening lane)
- `schemas/*.json`, `src/statspai/schemas/*.json` (auto-generated, held back)
- `src/statspai/__init__.py`, `README*.md`, `docs/*` (release-doc refresh)

## Progress

- [x] Read-only audit + bug diagnosis complete (4 bugs, all in lane).
- [x] Harden `execute_tool` curated path.
- [x] `detect_design` hint translation.
- [x] Repoint `sensitivity` → `unified_sensitivity`.
- [x] Contract test.
- [x] Design-agnostic full-analysis assessment.
- [x] Final verification.

## Batch 1 — MCP dispatch reliability (implemented)

Status: implemented; focused verification passed.

Changes (all additive, no estimator-numeric change, no `schemas/*.json` write):

- `agent/tools/_dispatch.py`:
  - `execute_tool` curated branch no longer raises when `statspai_fn`
    cannot be resolved — returns a clean `{error, remediation, hint}`
    envelope (fixes the `sensitivity` unhandled-`ValueError` crash class).
  - New `_filter_to_signature(fn, kwargs)` helper; the curated branch now
    drops advertised-but-unaccepted kwargs (mirroring the auto path) and
    surfaces them under `_unsupported_args` (excluding the server-injected
    `data`) on both success and error envelopes — transparent degradation,
    never silent (CLAUDE.md §3.7).
  - New `_accepts_param` helper + result-handle injection: when a
    `result_id` is supplied and the resolved function takes a `result`
    parameter (e.g. `honest_did`, `unified_sensitivity`), the cached
    object is injected as `result`. Extends fit→`as_handle`→`result_id`
    chaining to curated estimators that operate on a fitted result, so
    `honest_did` / `sensitivity` are now fully runnable via a handle (not
    only via the dedicated `*_from_result` workflow tools).
- `agent/workflow_tools.py`: `_tool_detect_design` translates the
  advertised `id_col_hint` / `time_col_hint` onto `sp.detect_design`'s
  `unit` / `time`.
- `agent/tools/_specs/_diag.py`: `sensitivity` `statspai_fn`
  `"sensitivity"` → `"unified_sensitivity"` (the function its description
  names). `statspai_fn` is internal / not dumped → schema-stable.
- `tests/test_mcp_tool_contract.py` (new, 8 tests):
  - Part A: zero schema↔signature drift across the ~474 auto/registry
    tools (static).
  - Part B: every curated tool dispatches to a dict, never raises.
  - Ratchet: the set of curated tools dropping advertised params must stay
    empty; historical stale schemas (`honest_did`, `sensitivity`,
    `spec_curve`) are now fixed instead of allow-listed.
  - No tool rejects its own advertised param as unexpected.
  - `detect_design` hints regression; `_filter_to_signature` unit tests;
    resolve-guard never-raises test.

Verification:

- `tests/test_mcp_tool_contract.py` — 8 passed.
- `dump_schemas.py --check` — OK (schemas/ in sync; **no drift**).
- `registry_stats.py --check` — OK.
- Broad regression: `test_agent_schema / test_registry / test_mcp_*` /
  `test_auto_tools` / `test_workflow_tool_dispatch_contract` /
  `test_smart_tools_sprint_b_round4` — 253 passed (+ the earlier
  736-test agent/mcp/dispatcher sweep, all green).
- `flake8` + `black --check` + `py_compile` clean on all 4 owned files.
- `git diff --name-only` confirms no other-lane file touched, no
  `schemas/*.json` write.

## Design-agnostic "one call → full analysis" assessment

The capability already exists and is healthy — **no new tool needed**
(and a new tool would force a `schemas/*.json` regen → collision). The
MCP `causal` tool (and `sp.causal()`) runs design-agnostic end-to-end and
returns a traced artifact: `design`, `verdict`, `top_method`, `estimate`
/ `std_error` / CI, a `robustness` battery (pretrend test, E-value,
CI-width), `next_calls`, `narrative`, `data_provenance`. The genuine gap
was tool-contract *reliability*, now fixed and locked by tests.

## Schema fixes resolved in current workspace

The proper fix for the stale curated schemas was to correct their advertised
`input_schema` and regenerate the `tools.json` schema snapshots. Current
workspace state has done that narrow schema sync, and
`.venv/bin/python scripts/dump_schemas.py --check` is green. The dispatch layer
still reports `_unsupported_args` defensively, but the ratchet now expects no
curated tool to drop an advertised parameter.

- **`honest_did`**: advertised schema is the legacy raw HonestDiD API
  (`betas / sigma / num_pre_periods / num_post_periods / m_bar`); the
  function now takes a fitted `result`. The agent-correct path today is
  the `honest_did_from_result` workflow tool (result-handle based). The
  direct `honest_did` schema now advertises the callable-compatible
  `e / m_grid / method / alpha` options instead of raw betas/sigma inputs.
- **`spec_curve`**: advertised `treatment / covariates / model_family /
  subsample_vars`; the function takes `x / controls (List[List[str]]) /
  subsets / ...`. A name translation was deliberately *not* added for the
  legacy shape because `covariates: List[str]` → `controls: List[List[str]]`
  would risk silently-wrong specifications (violates "fail loud"). The schema
  now advertises the real `y / x / controls / se_types / cluster_var / alpha`
  contract.
- **`sensitivity`**: now points to `unified_sensitivity` and advertises
  `result / y / treat / controls / rho_max / include_*` arguments that match
  that callable.

The remaining global registry drift is not a stale agent-tool schema issue; it
comes from concurrent bayes/geolift module additions and belongs to the
registry/doc-count lane.

## Batch 2 — MCP protocol-level agent transcript

Status: implemented; focused verification passed.

Intent:

- The direct `execute_tool` agent transcript proves the Python dispatcher can
  drive the recommended DID loop. This batch adds the missing client-facing
  guard: what an MCP client actually receives over JSON-RPC `tools/call`.
- Keep this as a deterministic, local-only regression: no network, R, Stata,
  optional LLM client, or review-lane file.

Implemented:

- Added `tests/agent_eval/test_mcp_protocol_transcript.py`.
- The base test runs the full protocol loop against a temporary CSV:
  `detect_design -> preflight -> did(as_handle=true) -> audit_result ->
  sensitivity_from_result`.
- It asserts that every `tools/call` response exposes a machine-readable
  `structuredContent` twin of the text block; the fitted DID result returns a
  reusable `result_id`; `next_calls[0]` is a ready `audit_result` call wired to
  that handle; local-file `data_provenance` reaches the payload; and a stale
  handle returns `isError=true` with a structured error instead of a JSON-RPC
  crash.
- Added three lane-specific protocol regressions for the tool-contract
  fixes: `detect_design` honoring `id_col_hint` / `time_col_hint`; the
  curated `result_id`→`result` injection (`honest_did` off a
  `callaway_santanna` handle, `sensitivity` off a `regress` handle, both
  `isError=false` with no `_unsupported_args`); and `spec_curve` running
  from its corrected `y / x / controls / se_types` schema.

Verification:

- `.venv/bin/python -m pytest -q -o addopts='' tests/agent_eval/test_mcp_protocol_transcript.py`
  passed with `4 passed`.
- Final consolidated sweep (contract + agent_eval + agent/mcp/workflow/dispatch
  suites) — `418 passed`. `dump_schemas.py --check` green; only `tools.json`
  changed across the three fixed tools (`functions.json`/`index.json` deltas are
  the concurrent bayes/geolift module additions, not this lane).

Boundary notes:

- Did not touch `Paper-JSS/`, `CausalAgentBench/`, `paper.md`, `paper.bib`,
  release metadata, or generated `schemas/*.json`.
- A concurrent untracked root file `src/statspai/bayes/its.py` appeared while
  this batch was running; it is not part of this lane and was left untouched.

## Batch 3 — Follow-up call readiness metadata

Status: implemented; focused verification passed.

Intent:

- Agent automation depends on the `next_calls` list being honest. A tool name
  that exists is not enough: some follow-ups can run immediately from a
  `result_id`, while others need additional data columns or fitted result
  objects that a generic result handle cannot provide.
- Make incomplete follow-ups explicit instead of letting an agent copy-paste a
  half-populated call and hit a later missing-argument error.

Implemented:

- `src/statspai/agent/_enrichment.py` now annotates each follow-up with
  `ready: true|false`.
- Incomplete follow-ups carry `missing_arguments` and a short `hint`.
- Common aliases are propagated from the fitted call into follow-ups:
  `running_var -> x`, `treat -> treatment`, `id -> unit/entity`,
  `cohort -> g`, `time -> t`, and instrument aliases.
- Updated the enrichment docstring so `next_calls` is described as
  readiness-annotated, not blindly ready-to-dispatch.
- Updated the MCP session instructions and `statspai://result-schema`
  runtime resource to document `ready` / `missing_arguments` for
  `next_calls` items. This does not touch generated `schemas/*.json`.
- Extended `tests/test_mcp_enrichment.py` to lock:
  - fully wired DID `audit_result` remains `ready=true`;
  - IV weak-instrument diagnostics expose missing `endog`/`instruments`;
  - RD follow-ups become ready when the previous call supplied
    `running_var`;
  - result-object-only follow-ups such as `cate_summary` expose
    `missing_arguments=['result']`.
- Extended `tests/test_mcp_protocol.py` to lock the result-schema resource's
  nested `next_calls.items.ready` and `missing_arguments` fields.

Verification:

- `.venv/bin/python -m pytest -q -o addopts='' tests/test_mcp_enrichment.py`
  passed with `16 passed`.
- Combined focused agent/runtime verification passed:
  `.venv/bin/python -m pytest -q -o addopts='' tests/test_mcp_enrichment.py
  tests/agent_eval/test_did_workflow_transcript.py
  tests/agent_eval/test_mcp_protocol_transcript.py
  tests/test_agent_native_contract.py tests/test_mcp_tool_contract.py
  tests/test_mcp_result_handle.py tests/test_agent_workflow_spec_audit.py`
  -> `71 passed`.
- Formatting/syntax gates passed for the lane files:
  - `flake8` on touched agent/runtime/test files;
  - `black --check` on touched agent/runtime/test files;
  - `py_compile` on touched agent/runtime/test files;
  - `git diff --check` on touched agent/runtime/test/worklog files.
- Follow-up inventory after the change: `19` ready calls and `17` not-ready
  calls, with the latter carrying explicit missing-argument metadata.

Validation caveat:

- `.venv/bin/python scripts/dump_schemas.py --check` and
  `.venv/bin/python scripts/registry_stats.py --check` are currently red due
  to a concurrent bayes lane outside this work. After that lane added
  `bayes_its` / `bayes_synth`, the live registry reports `1,118` functions
  while generated schema/docs counters still reflect the previous snapshot.
  This lane deliberately did not regenerate `schemas/*.json`,
  `src/statspai/schemas/*.json`, README, or docs stats to avoid crossing
  ownership and JOSS/release boundaries. The readiness implementation was
  changed to prefer the committed `schemas/tools.json` snapshot so enrichment
  does not depend on a live full-registry import.
- `.venv/bin/python scripts/help_coverage.py --check` passed.

## Batch 4 — Follow-up readiness ratchet

Status: implemented; focused verification passed.

Intent:

- Batch 3 added readiness metadata to `next_calls`. This batch adds a
  table-wide ratchet so future follow-up templates cannot regress to implicit,
  half-populated calls.

Implemented:

- Extended `tests/test_mcp_enrichment.py` with
  `test_all_followups_carry_schema_consistent_readiness`.
- The test materializes every `_FOLLOWUP_BY_TOOL` entry with representative
  base arguments and verifies:
  - every follow-up has a boolean `ready`;
  - `ready=true` iff no required schema arguments are missing;
  - `ready=false` carries exact `missing_arguments` and a `hint`;
  - readiness is computed against the offline `schemas/tools.json` contract
    that agents read.

Verification:

- `.venv/bin/python -m pytest -q -o addopts='' tests/test_mcp_enrichment.py`
  passed with `17 passed`.
- `.venv/bin/python -m py_compile tests/test_mcp_enrichment.py` passed.

## Batch 5 — Contract ratchet tightened and final focused verification

Status: implemented; focused verification passed.

Implemented:

- Tightened `tests/test_mcp_tool_contract.py` so the curated advertised-argument
  drop set is expected to remain empty. The historical offenders
  (`honest_did`, `sensitivity`, `spec_curve`) are fixed instead of kept as
  standing exceptions.
- Formatted `src/statspai/agent/tools/_specs/_did.py` with Black after the
  schema cleanup.

Verification:

- `.venv/bin/python -m pytest -q -o addopts='' tests/test_mcp_enrichment.py
  tests/agent_eval/test_did_workflow_transcript.py
  tests/agent_eval/test_mcp_protocol_transcript.py
  tests/test_agent_native_contract.py tests/test_mcp_tool_contract.py
  tests/test_mcp_result_handle.py tests/test_agent_workflow_spec_audit.py`
  -> `72 passed`.
- `.venv/bin/python scripts/quality_gate.py agent-workflow` -> `PASS`,
  `Score: 100`, `errors: 0`, `warnings: 0`.
- `flake8`, `black --check`, `py_compile`, and `git diff --check` passed on
  touched agent/runtime/test/worklog files.
- `.venv/bin/python scripts/help_coverage.py --check` passed.
- `.venv/bin/python scripts/dump_schemas.py --check` passed (`schemas/` in
  sync, 5 files).

Known remaining global caveat:

- `.venv/bin/python scripts/registry_stats.py --check` is red because the
  concurrent bayes/geolift lane changed the live registered-function and
  submodule counts. Current output expects `1,119 registered functions` and
  `86 submodules` in README/docs counters, and flags `docs/stats.md` modules
  `bayes` and `geolift`. This runtime lane leaves those release-doc/stat
  counters untouched to avoid crossing lane ownership.

Final status snapshot:

- Root checkout remains dirty. Runtime-lane files are:
  `src/statspai/agent/_enrichment.py`, `src/statspai/agent/mcp_server.py`,
  `src/statspai/agent/tools/_dispatch.py`,
  `src/statspai/agent/tools/_specs/_diag.py`,
  `src/statspai/agent/tools/_specs/_did.py`,
  `src/statspai/agent/workflow_tools.py`, `schemas/tools.json`,
  `src/statspai/schemas/tools.json`, `tests/test_mcp_enrichment.py`,
  `tests/test_mcp_protocol.py`,
  `tests/agent_eval/test_mcp_protocol_transcript.py`,
  `tests/test_mcp_tool_contract.py`, and this worklog.
- Other root changes belong to concurrent lanes and were left untouched:
  `mkdocs.yml`, schema `functions/index` snapshots, `src/statspai/__init__.py`,
  `src/statspai/bayes/*`, `src/statspai/geolift/*`,
  `src/statspai/plots/counterfactual.py`,
  `docs/guides/unified_quasi_experiments.md`,
  `tests/test_bayes_its_synth.py`, and `tests/test_geolift.py`.
- Nested `Paper-JSS/` is dirty only with review-evidence outputs under
  `replication/results/*` and was not edited by this lane.
- Nested `CausalAgentBench/` is clean (`main...origin/main`).
- No commit or push was performed.
