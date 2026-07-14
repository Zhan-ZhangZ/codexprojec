# JOSS-Safe Economist MCP Hardening Worklog - 2026-06-20

Scope: root `StatsPAI` package only. This run is explicitly JOSS-safe:
`paper.md`, `paper.bib`, `docs/joss_*`, and `Paper-JSS/` files are out of
scope except for read-only status checks.

## Objective

Make the economist-facing MCP/data-ingestion/cross-engine/Stata-R migration
surface solid enough for empirical-economics users without disturbing active
JOSS review artifacts.

## Guardrails

- Do not stage, commit, or push.
- Do not edit `paper.md`, `paper.bib`, `docs/joss_*`, or `Paper-JSS/`.
- Check `Paper-JSS/` and `CausalAgentBench/` separately before handoff.
- Do not claim live Stata, R, or data-MCP execution unless those external
  systems were actually invoked.
- Preserve parallel-agent changes; edit dirty files only after inspecting the
  relevant hunk and keep handoff notes explicit.
- Prefer deterministic fixtures and repo-native tests over network-dependent
  smoke tests.

## Starting State

- Root is dirty from multiple lanes: economist MCP/provenance work,
  cross-engine/data-ingestion work, docs/README/CHANGELOG updates, and
  unrelated `src/statspai/network/centrality.py`.
- `Paper-JSS/` currently has generated `replication/results/*` evidence diffs
  from a parallel lane and is not owned here.
- `CausalAgentBench/` is clean on `main...origin/main`.
- Previous economist MCP lane ended with focused tests passing, including
  MCP protocol/result-handle/translation coverage and MkDocs strict build.

## Planned Batches

1. Audit current crossval/data-ingestion/MCP/translation/psmatch2 surfaces.
2. Harden deterministic data-MCP ingestion handoff: normalized source metadata,
   local-fixture smoke tests, and result provenance.
3. Tighten cross-engine validation contracts: explicit evidence labels,
   missing-engine behavior, and no fake live Stata/R claims.
4. Expand safe Stata/R command migration coverage where the parser can do so
   without broad fragile rewrites.
5. Strengthen `psmatch2` parity/caveat tests around ATT/ATE, common support,
   propensity model semantics, and downstream matched-frame handoff.
6. Re-run focused verification and update this handoff.

## Batch 1 - Data-MCP provenance into cross-validation

Status: implemented and focused tests passed.

- Added deterministic `df.attrs["provenance"]` records to
  `sp.from_worldbank`, `sp.from_fred`, and `sp.from_sdmx`.
- `sp.cross_validate` now carries normalized data-source provenance into
  `CrossValidationResult.provenance["data"]` and agent `to_dict()` output.
- Added offline tests for World Bank / FRED / SDMX metadata and a no-network
  World Bank payload -> normalized frame -> `sp.cross_validate` smoke path.

Verification:

- `.venv/bin/python -m pytest -o addopts='' tests/test_ingest.py tests/test_cross_validate.py::TestDataMCPProvenance tests/test_cross_validate.py::TestDegradation`
  passed with 25 tests.
- `.venv/bin/python -m py_compile src/statspai/datasets/ingest.py src/statspai/crossval/cross_validate.py`
  passed.

## Batch 2 - Agent-safe cross-engine claim contract

Status: implemented and focused tests passed.

- Added `CrossValidationResult.engine_status_counts`.
- Added `CrossValidationResult.can_claim_cross_engine_agreement`, true only
  when the verdict is `AGREE` and at least two engines produced estimates.
- Agent `to_dict()` output now carries both fields, so MCP clients can avoid
  falsely reporting cross-engine agreement when the run is `INSUFFICIENT`.

Verification:

- `.venv/bin/python -m pytest -o addopts='' tests/test_cross_validate.py::TestDegradation tests/test_cross_validate.py::TestDataMCPProvenance`
  passed with 6 tests.
- `.venv/bin/python -m py_compile src/statspai/crossval/_result.py`
  passed.

## Batch 3 - MCP serialization guard for cross-validation

Status: implemented and focused tests passed.

- Added an MCP `tools/call` regression test for `cross_validate`.
- The test verifies that `structuredContent` carries
  `can_claim_cross_engine_agreement=false` for an insufficient run and still
  includes server-side `data_provenance` for the loaded CSV.

Verification:

- `.venv/bin/python -m pytest -o addopts='' tests/test_mcp_protocol.py::TestToolsCall::test_cross_validate_tool_keeps_claim_flag_and_data_provenance tests/test_mcp_protocol.py::TestStructuredContent::test_local_data_path_provenance_reaches_result_resource`
  passed with 2 tests.
- `.venv/bin/python -m py_compile src/statspai/agent/workflow_tools.py src/statspai/agent/mcp_server.py`
  passed.

## Batch 4 - Safe Stata `ivreghdfe` migration contract

Status: implemented and focused tests passed.

- Added a conservative `from_stata` handler for `ivreghdfe`.
- The handler maps Stata `y x (d = z), absorb(firm year) cluster(firm)` to the
  existing StatsPAI/fixest IV-with-fixed-effects shape:
  `formula="y ~ x + (d ~ z)"`, `fe=[...]`, `cluster=...`.
- It labels the output as a command-migration contract, not live Stata
  execution.
- Added round-trip, execute-tool, and Stata-vs-R `feols` shape tests.

Verification:

- `.venv/bin/python -m pytest -o addopts='' tests/test_translation.py::test_tier1_round_trip tests/test_translation.py::TestEconomistMigrationUseCases tests/test_translation.py::TestExecuteToolFromStata`
  passed with 22 tests.
- `.venv/bin/python -m py_compile src/statspai/agent/_translation/_stata.py`
  passed.

## Batch 5 - `psmatch2` metadata and ATT-scope guard

Status: implemented and focused tests passed.

- Added non-numeric `result.model_info` metadata to `sp.psmatch2`:
  `propensity_model="logit"`, `estimand_scope="ATT"`,
  `outcome_status`, `att_defined`, and a matched-frame semantics note.
- No ATT/SE/matching algorithm was changed.
- Added tests that verify ordinary outcome runs are ATT-defined and
  outcome-omitted runs are matched-frame-only.
- Re-ran Stata reference parity fixtures to ensure the metadata patch is
  numerically inert.

Verification:

- `.venv/bin/python -m pytest -o addopts='' tests/test_psmatch2.py::TestPSMatch2Surface tests/reference_parity/test_psmatch2_parity.py`
  passed with 31 tests.
- `.venv/bin/python -m py_compile src/statspai/matching/psmatch2.py`
  passed.

## Batch 6 - Root docs and prompt contract sync

Status: implemented and focused tests passed.

- Updated the data-MCP ingestion guide to document `df.attrs["provenance"]`
  and how `sp.cross_validate` preserves it under `provenance["data"]`.
- Updated the cross-engine guide to document `engine_status_counts` and
  `can_claim_cross_engine_agreement`.
- Updated English and Chinese economist MCP guides for `ivreghdfe`.
- Updated the PSM-DID guide with the new `psmatch2` metadata fields and
  outcome-omitted matched-frame-only semantics.
- Updated the `cross_language_command_check` prompt to require checking
  `can_claim_cross_engine_agreement` before claiming cross-engine validation.

Verification:

- `.venv/bin/python -m pytest -o addopts='' tests/test_mcp_protocol.py::TestPrompts::test_cross_language_command_check_prompt_warns_no_live_external_run`
  passed with 1 test.
- `.venv/bin/python -m py_compile src/statspai/agent/_prompts.py`
  passed.
- `.venv/bin/mkdocs build --strict` passed with the repo's existing
  MkDocs/Material warning and existing informational list of docs not in nav.

## Batch 7 - Release-facing root docs sync

Status: implemented and final verification passed.

- Updated `CHANGELOG.md` Unreleased text so the existing cross-engine and
  data-ingestion entries mention `engine_status_counts`,
  `can_claim_cross_engine_agreement`, and normalized data provenance.
- Added a short README note that `INSUFFICIENT` cross-validation runs should
  not be mistaken for successful cross-language checks.

Verification:

- Included in the broad pytest, py_compile, `git diff --check`, and
  `.venv/bin/mkdocs build --strict` verification below.

## Broad Verification Snapshot

- `.venv/bin/python -m pytest -o addopts='' tests/test_ingest.py tests/test_cross_validate.py tests/test_mcp_protocol.py tests/test_mcp_result_handle.py tests/test_translation.py tests/test_psmatch2.py tests/reference_parity/test_psmatch2_parity.py`
  passed with 310 tests and 3 skips.
- `.venv/bin/python -m py_compile src/statspai/datasets/ingest.py src/statspai/crossval/cross_validate.py src/statspai/crossval/_result.py src/statspai/agent/_prompts.py src/statspai/agent/_translation/_stata.py src/statspai/matching/psmatch2.py`
  passed.
- `git diff --check -- <owned files>` passed.
- `.venv/bin/mkdocs build --strict` passed with the existing MkDocs/Material
  warning and existing informational docs-not-in-nav list.
- `git diff --name-only -- paper.md paper.bib docs/joss_* Paper-JSS` returned
  no paths.
- Root status at handoff contains this lane's package, test, guide, README,
  CHANGELOG, and worklog files only.
- `Paper-JSS/` still has parallel generated `replication/results/*` evidence
  diffs and remains outside this lane.
- `CausalAgentBench/` is clean on `main...origin/main`.

## Owned Files

This lane may touch root package/test/doc/worklog files needed for the batches
above. Shared dirty files must be edited carefully and documented here before
handoff.

Currently touched by this lane:

- `plans/2026-06-20-joss-safe-economist-mcp-hardening.md`
- `src/statspai/datasets/ingest.py`
- `src/statspai/crossval/cross_validate.py`
- `src/statspai/crossval/_result.py`
- `src/statspai/agent/_translation/_stata.py`
- `src/statspai/agent/_prompts.py`
- `src/statspai/matching/psmatch2.py`
- `docs/guides/data_mcp_ingestion.md`
- `docs/guides/cross_engine_validation.md`
- `docs/guides/economist_mcp_workflow.md`
- `docs/guides/economist_mcp_workflow_zh.md`
- `docs/guides/psm_did.md`
- `CHANGELOG.md`
- `README.md`
- `tests/test_ingest.py`
- `tests/test_cross_validate.py`
- `tests/test_mcp_protocol.py`
- `tests/test_translation.py`
- `tests/test_psmatch2.py`
