# Parity Test Worklog - 2026-05-29

Scope: parity hardening pass focused on the R/Stata harness, fixture
contracts, documented convention gaps, and end-to-end test verification.

## Inventory

- Python parity artifacts: 52 Python result files.
- Materialized R-joined modules: 51 modules.
- Stata result artifacts: 44 modules.
- Py--Stata-only migration fixture: `50_xtabond`.
- Modules without Stata references: `08_dml`, `13_causal_forest`,
  `18_augsynth`, `19_gsynth`, `31_dfl`, `32_rif`, `38_drdid`,
  `52_scm_unique`.
- R runtime status: `Rscript` was not installed in this environment, so R
  runtime smoke tests were skipped. Existing R JSON fixtures were still
  contract-tested.
- Stata runtime status: StataMP was available at
  `/Applications/Stata/StataMP.app/Contents/MacOS/stata-mp`.

## Work Completed

- Added fast parity artifact contract tests in
  `tests/test_parity_harness_contract.py`.
- Added optional external runtime smoke tests in
  `tests/test_parity_runtime.py`; these preserve JSON artifacts after running
  scripts so runtime tests do not dirty committed fixtures.
- Added `tests/r_parity/50_xtabond.R` as a secondary `plm::pgmm` R reference
  script. Stata `xtabond` remains the strict Module 50 migration fixture.
- Registered explicit Stata headline gap notes for:
  - `16_bjs`: Stata `did_imputation` autosample/aggregation convention gap.
  - `29_panel_sfa`: Stata `xtfrontier` Pitt-Lee parameterisation gap.
- Refreshed generated parity tables:
  - `tests/r_parity/results/parity_table.md`
  - `tests/r_parity/results/parity_table_3way.md`
  - `tests/r_parity/results/parity_table_3way.tex`
- Updated R/Stata parity READMEs to match current module inventory and runtime
  commands.
- While running the full default suite, fixed non-parity test-contract drift
  that blocked a clean full-suite result:
  - agent-card validation floors now treat `validated` as validated-or-better,
    so upgrades to `certified` are not false regressions.
  - stale generated agent docs were re-synced.
  - error-taxonomy broad handlers were narrowed; two SDID small-sample errors
    now raise `DataInsufficient`.
  - stale agent-doc and placeholder citation tests were updated.

## Verification Results

- `python tests/r_parity/compare.py`
  - exit 0
  - wrote `parity_table.md`, `parity_table.tex`,
    `parity_table_3way.md`, `parity_table_3way.tex`
  - reported 51 rendered R-joined modules from 52 Python result files
  - reported 43 of 51 rendered modules with Stata references, plus the
    Py--Stata-only Module 50 path omitted from the R-joined table.

- `python -m pytest tests/test_parity_harness_contract.py tests/test_jss_validation_api.py tests/test_validation_vs_stata_r.py --no-cov -q`
  - 37 passed
  - 15 warnings

- `python -m pytest tests/test_parity_runtime.py --no-cov -q -m external_parity_runtime`
  - 3 passed
  - 3 skipped because `Rscript` is not installed

- Full Stata harness:
  - command shape:
    `for dofile in [0-9][0-9]_*.do; do stata-mp -b -q do "$dofile"; done`
  - exit 0 across the Stata parity scripts present in `tests/stata_parity`.

- Default non-slow pytest suite:
  - command: `python -m pytest --no-cov -q`
  - final result: 5384 passed, 100 skipped, 19 deselected, 1 xfailed
  - warnings: 977
  - runtime: 1251.26s

## Known Limits

- The R side of `50_xtabond` was added as a script but no
  `50_xtabond_R.json` fixture was materialized because this environment lacks
  `Rscript`.
- Module 50 remains strict Py-Stata parity until the R `plm::pgmm` output is
  generated and reviewed in an R-equipped environment.
- `16_bjs` and `29_panel_sfa` intentionally retain documented Stata headline
  convention gaps; their R headlines remain inside the registered tolerance.

## Acceptance Checklist

- Review `tests/r_parity/results/parity_table_3way.md` for the rendered
  Stata gap notes.
- Review `tests/test_parity_harness_contract.py` for the enforced parity
  artifact contracts.
- In an R-equipped environment, run
  `python -m pytest tests/test_parity_runtime.py --no-cov -q -m external_parity_runtime`
  to materialize and review the Module 50 R result before committing any
  `50_xtabond_R.json` fixture.
