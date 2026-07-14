# Economist MCP Workflow Hardening Worklog - 2026-06-20

Scope: root `StatsPAI` package only. This work deliberately avoids
`Paper-JSS/`, `CausalAgentBench/`, `paper.md`, `paper.bib`,
`src/statspai/network/centrality.py`, and the currently untracked
`src/statspai/crossval/` directory so it can proceed beside other agents.

## Objective

Turn the existing agent-native surface into a more usable empirical economics
workflow: installable MCP guidance, Stata/R command migration prompts,
cross-software comparison discipline, provenance-aware data handoff guidance,
and focused tests that keep those surfaces from drifting.

## Baseline

- Root status at start: `src/statspai/network/centrality.py` modified and
  `src/statspai/crossval/` untracked by another lane.
- Nested repos checked separately: `Paper-JSS/` and `CausalAgentBench/` clean.
- Existing MCP entry point: `statspai-mcp =
  "statspai.agent.mcp_server:main"` in `pyproject.toml`.
- Existing MCP implementation already supports:
  - protocol negotiation through `2025-06-18`,
  - tool annotations and structured output,
  - `data_path`, `data_columns`, `data_sample_n`, `result_id`,
    `as_handle`, and `detail`,
  - prompt templates,
  - Stata/R command translators,
  - DID/IV/RD pipeline tools,
  - result-handle chaining and plot image content.
- Existing cross-language evidence includes the Track A 3-way parity table and
  R/Stata reproducibility reports under `tests/r_parity/results/` and
  `tests/stata_parity/results/`.

## Guardrails

- Use explicit-path edits only.
- Do not import or modify `src/statspai/crossval/`.
- Do not stage or rewrite `src/statspai/network/centrality.py`.
- Do not promote claims beyond committed code/tests/fixtures.
- Keep external Stata/R/data MCP execution opt-in; local docs can describe how
  to compose with those tools, but StatsPAI must not claim to run them unless
  the user has configured them separately.

## Batch 1 - User-facing MCP workflow surface

Status: implemented and focused tests passed.

Target: make the existing MCP capabilities discoverable and stable for an
economics PhD workflow without changing estimator numerics.

- Add MCP prompts for:
  - translating a Stata command and then running the translated StatsPAI tool,
  - translating an R/fixest/did expression and then running the translated
    StatsPAI tool,
  - comparing Stata and R snippets through the same StatsPAI dispatch surface.
- Add a guide that documents:
  - Claude Desktop / Claude Code / Cursor-style configuration,
  - `.dta` and large-file data handoff,
  - DID/IV/RD one-call pipelines,
  - Stata/R command migration loops,
  - cross-software verification discipline,
  - how to compose StatsPAI with external data MCP servers without inventing
    data values or provenance.
- Add focused MCP prompt tests.

Verification:

- `.venv/bin/python -m pytest -o addopts='' tests/test_mcp_protocol.py::TestPrompts`
  passed with 9 tests.
- `git diff --check -- plans/2026-06-20-economist-mcp-workflow-hardening.md src/statspai/agent/_prompts.py tests/test_mcp_protocol.py docs/guides/economist_mcp_workflow.md mkdocs.yml`
  passed.

## Batch 2 - Parity evidence resource and migration contracts

Status: implemented and focused tests passed.

- Added `statspai://parity/track-a-summary`, a compact JSON MCP resource that
  summarizes committed Track A parity evidence without pretending to execute
  Stata or R live.
- Updated `cross_language_command_check` to read the parity summary resource
  and label evidence status before reporting agreement.
- Documented the parity resource in the economist MCP workflow guide.
- Added migration contract tests for high-frequency economist snippets:
  `reghdfe` versus `feols`, and Stata `csdid` versus R `did::att_gt`.

Verification targets:

- `.venv/bin/python -m pytest -o addopts='' tests/test_mcp_protocol.py::TestResources tests/test_mcp_protocol.py::TestPrompts tests/test_translation.py::TestEconomistMigrationUseCases`
- `.venv/bin/python -m py_compile src/statspai/agent/_resources.py src/statspai/agent/_prompts.py`
- `git diff --check -- plans/2026-06-20-economist-mcp-workflow-hardening.md src/statspai/agent/_resources.py src/statspai/agent/_prompts.py tests/test_mcp_protocol.py tests/test_translation.py docs/guides/economist_mcp_workflow.md mkdocs.yml`

Results:

- 21 focused tests passed for MCP resources/prompts and migration contracts.
- `_resources.py` and `_prompts.py` compiled cleanly.
- Targeted `git diff --check` passed.

## Batch 3 - MCP data provenance contract

Status: implemented and focused tests passed.

- Added `data_provenance()` beside the MCP data loader. Local files record
  source path, scheme, format, requested columns/sample, size, mtime, and
  SHA-256. Remote URLs are sanitized by dropping query/fragment tokens and are
  marked `not_hashed_remote`.
- MCP `tools/call` now attaches `data_provenance` to returned payloads after
  loading `data_path`, without forwarding provenance metadata into estimator
  kwargs.
- Local SHA-256 computation is cached by path, size, and mtime so repeated tool
  calls on the same file do not repeatedly hash large data.
- When a payload carries `result_id`, the cache entry is annotated so
  `statspai://result/<id>` exposes the same data provenance in its provenance
  block.
- The result schema documents `data_provenance`.
- Initialize instructions now advertise Stata/R migration prompts, the parity
  summary resource, and `data_provenance`.
- The economist MCP guide documents where provenance appears and why remote
  bytes are not re-hashed by StatsPAI.
- Added a Chinese counterpart of the economist MCP workflow guide for the
  Chinese empirical-economics user lane, wired into MkDocs next to the English
  guide.

Verification:

- `.venv/bin/python -m pytest -o addopts='' tests/test_mcp_protocol.py::TestAnnotationsAndOutputSchema tests/test_mcp_protocol.py::TestStructuredContent tests/test_mcp_result_handle.py::TestResultCache`
  passed with 13 tests.
- `.venv/bin/python -m pytest -o addopts='' tests/test_mcp_result_handle.py::TestInitializeInstructions tests/test_mcp_protocol.py::TestPrompts tests/test_mcp_protocol.py::TestResources`
  passed with 20 tests.
- `.venv/bin/python -m py_compile src/statspai/agent/_data_loader.py src/statspai/agent/_result_cache.py src/statspai/agent/mcp_server.py`
  passed.
- `git diff --check -- src/statspai/agent/_data_loader.py src/statspai/agent/_result_cache.py src/statspai/agent/mcp_server.py tests/test_mcp_protocol.py tests/test_mcp_result_handle.py docs/guides/economist_mcp_workflow.md`
  passed.
- `.venv/bin/python -m pytest -o addopts='' tests/test_mcp_protocol.py tests/test_mcp_result_handle.py tests/test_translation.py tests/test_mcp_image_content.py tests/test_mcp_nan_inf.py`
  passed with 193 tests.
- `.venv/bin/python -m pytest -o addopts='' tests/test_mcp_error_envelope.py tests/test_mcp_interpret_result.py tests/test_mcp_prompts_expanded.py tests/test_mcp_enrichment.py tests/agent_eval/test_did_workflow_transcript.py`
  passed with 45 tests.
- `.venv/bin/mkdocs build --strict` passed. It emitted the repo's existing
  Material/MkDocs ecosystem warning and an informational list of docs files not
  included in nav.

## Batch 4 - Stata `psmatch2` migration front door

Status: implemented and focused tests passed.

- Added a `from_stata` handler for common Stata `psmatch2` commands, mapping to
  the existing `sp.psmatch2` API.
- Covered `outcome()/out()`, `neighbor()/n()`, `kernel/kerneltype()/bwidth()`,
  `radius/caliper()`, `common`, `ai()`, and `noreplacement` where these have
  clean StatsPAI equivalents.
- Unsupported convention-sensitive options emit notes rather than silently
  claiming parity.
- Updated the Stata workflow prompt plus English and Chinese economist MCP
  guides to list `psmatch2` as a supported command-migration path.

Verification:

- `.venv/bin/python -m pytest -o addopts='' tests/test_translation.py tests/test_mcp_protocol.py::TestPrompts`
  passed with 97 tests.
- `.venv/bin/python -m py_compile src/statspai/agent/_translation/_stata.py src/statspai/agent/_prompts.py`
  passed.
- `git diff --check -- src/statspai/agent/_translation/_stata.py src/statspai/agent/_prompts.py tests/test_translation.py docs/guides/economist_mcp_workflow.md docs/guides/economist_mcp_workflow_zh.md`
  passed.

## Batch 5 - Evidence indexing and `psmatch2` caveat contracts

Status: implemented and focused tests passed.

- Added `tool_evidence` to `statspai://parity/track-a-summary`, keyed by common
  StatsPAI tool names. This lets agents label committed parity evidence without
  scanning long markdown text or guessing from Stata command strings.
- Kept the mapping conservative: Track A `11_psm` indexes `match` / `psm`, not
  live `psmatch2` execution.
- Updated `cross_language_command_check` to read the `tool_evidence` index
  explicitly.
- Added execute-tool coverage for `from_stata` translating `psmatch2`.
- Added `psmatch2` caveat tests so `probit` and ATE-oriented options surface
  notes rather than being silently treated as exact parity.
- Documented the `psmatch2` caveat and `tool_evidence` field in the English and
  Chinese economist MCP guides.

Verification:

- `.venv/bin/python -m pytest -o addopts='' tests/test_mcp_protocol.py::TestResources tests/test_mcp_protocol.py::TestPrompts tests/test_translation.py::TestExecuteToolFromStata tests/test_translation.py::TestTier2EdgeCases tests/test_translation.py::test_tier2_round_trip`
  passed with 48 tests.
- `.venv/bin/python -m py_compile src/statspai/agent/_resources.py src/statspai/agent/_prompts.py src/statspai/agent/_translation/_stata.py`
  passed.
- `git diff --check -- src/statspai/agent/_resources.py src/statspai/agent/_prompts.py src/statspai/agent/_translation/_stata.py tests/test_mcp_protocol.py tests/test_translation.py docs/guides/economist_mcp_workflow.md docs/guides/economist_mcp_workflow_zh.md`
  passed.

## Next Targets

1. Coordinate with the separate cross-validation / data-ingestion lane before
   touching `src/statspai/crossval/`, `src/statspai/datasets/ingest.py`,
   `src/statspai/datasets/__init__.py`, `src/statspai/registry.py`,
   `src/statspai/agent/workflow_tools.py`, `README.md`,
   `docs/guides/cross_engine_validation.md`, or
   `docs/guides/data_mcp_ingestion.md`.
2. If this work is prepared for a commit, stage only the files listed in the
   "Owned files" section below and re-run the final verification commands. Use
   hunk-level staging for shared files.

## Owned files

This lane intentionally owns:

- `mkdocs.yml` only for the two economist MCP guide nav entries. This file is
  currently shared with another agent's cross-engine/data-ingestion nav edits.
- `docs/guides/economist_mcp_workflow.md`
- `docs/guides/economist_mcp_workflow_zh.md`
- `plans/2026-06-20-economist-mcp-workflow-hardening.md`
- `src/statspai/agent/_data_loader.py`
- `src/statspai/agent/_prompts.py`
- `src/statspai/agent/_resources.py`
- `src/statspai/agent/_result_cache.py`
- `src/statspai/agent/_translation/_stata.py`
- `src/statspai/agent/mcp_server.py`
- `tests/test_mcp_protocol.py`
- `tests/test_mcp_result_handle.py`
- `tests/test_translation.py`

It deliberately does not own current parallel changes in `README.md`,
`README_CN.md`, `CHANGELOG.md`, `docs/index.md`, `docs/reference/index.md`,
`docs/stats.md`, `src/statspai/__init__.py`,
`src/statspai/agent/workflow_tools.py`, `src/statspai/datasets/__init__.py`,
`src/statspai/datasets/ingest.py`,
`src/statspai/network/centrality.py`, `src/statspai/registry.py`,
`src/statspai/crossval/`, `docs/guides/cross_engine_validation.md`,
`docs/guides/data_mcp_ingestion.md`, `tests/test_cross_validate.py`, or
`tests/test_ingest.py`. It also does not own current `Paper-JSS/replication`
generated evidence diffs.

## Final verification snapshot

- `.venv/bin/python -m pytest -o addopts='' tests/test_mcp_protocol.py tests/test_mcp_result_handle.py tests/test_translation.py tests/test_mcp_image_content.py tests/test_mcp_nan_inf.py tests/test_mcp_error_envelope.py tests/test_mcp_interpret_result.py tests/test_mcp_prompts_expanded.py tests/test_mcp_enrichment.py tests/agent_eval/test_did_workflow_transcript.py`
  passed with 245 tests.
- `.venv/bin/python -m py_compile src/statspai/agent/_data_loader.py src/statspai/agent/_prompts.py src/statspai/agent/_resources.py src/statspai/agent/_result_cache.py src/statspai/agent/_translation/_stata.py src/statspai/agent/mcp_server.py`
  passed.
- `git diff --check -- docs/guides/economist_mcp_workflow.md docs/guides/economist_mcp_workflow_zh.md mkdocs.yml plans/2026-06-20-economist-mcp-workflow-hardening.md src/statspai/agent/_data_loader.py src/statspai/agent/_prompts.py src/statspai/agent/_resources.py src/statspai/agent/_result_cache.py src/statspai/agent/_translation/_stata.py src/statspai/agent/mcp_server.py tests/test_mcp_protocol.py tests/test_mcp_result_handle.py tests/test_translation.py`
  passed.
- `.venv/bin/mkdocs build --strict` passed, with the repo's existing
  Material/MkDocs ecosystem warning and existing informational list of docs not
  included in nav.
- Nested repos checked separately at handoff: `CausalAgentBench/` is clean on
  `main...origin/main`; `Paper-JSS/` has parallel generated
  `replication/results/*` evidence diffs and remains outside this lane.
- Root still has parallel changes outside the owned-files list, including the
  cross-engine/data-ingestion lane. Do not whole-tree stage this work; use
  explicit paths and hunk-level staging for `mkdocs.yml`.
- `site/` is an ignored MkDocs build output.
