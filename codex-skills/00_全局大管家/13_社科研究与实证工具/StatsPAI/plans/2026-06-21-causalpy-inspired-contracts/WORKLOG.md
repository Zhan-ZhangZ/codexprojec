# CausalPy-Inspired Contracts Hardening — 2026-06-21

## Goal

Make the CausalPy-inspired design concrete in StatsPAI without changing the
package's core identity: function-first API, optional Bayesian dependencies,
R/Stata parity, and agent-readable schemas.

## Boundaries

- Do not touch `Paper-JSS/`, `CausalAgentBench/`, `paper.md`, `paper.bib`,
  release/tag/PyPI state, or JOSS/JSS metadata.
- Avoid the active correctness lane files unless required:
  `CHANGELOG.md`, `MIGRATION.md`, `src/statspai/did/*`,
  `src/statspai/matching/match.py`, `src/statspai/regression/iv.py`, and
  `tests/test_correctness_inference_fixes.py`.
- Prefer additive protocol layers over estimator rewrites.

## CausalPy Patterns Adapted

- `EffectSummary(table, text)` becomes a StatsPAI result protocol around
  `CausalResult.decision_summary()` and Bayesian posterior summaries.
- `CheckResult` / `Check` becomes a lightweight wrapper around existing
  diagnostics and the consolidated robustness battery.
- Method-routing skills become `design_intake(...)` with explicit outcomes:
  `matched`, `ambiguous`, `not_identifiable_yet`, `not_implemented`.
- Architecture/export drift checks become `scripts/check_contract_inventory.py`.

## Progress

- [x] Goal contract established.
- [x] Effect-summary protocol implemented and tested.
- [x] Diagnostic check protocol implemented and tested.
- [x] Design-intake routing contract implemented and tested.
- [x] Static contract inventory gate implemented and tested.
- [x] Docs/schema/statistics drift synced.
- [x] Final targeted verification complete.

## Verification Log

- `python -m pytest tests/test_causalpy_inspired_contracts.py
  tests/test_bayes_result_protocol.py tests/test_result_protocol_audit.py -q`
  passed: 19 tests.
- `python -m pytest tests/test_agent_schema.py tests/test_registry.py -q`
  passed: 72 tests.
- `python scripts/result_protocol_audit.py --check` passed:
  280 result classes inspected.
- `python scripts/check_contract_inventory.py --check` passed.
- `python scripts/quality_gate.py contract-inventory` passed.
- `python scripts/dump_schemas.py --check` and
  `python scripts/registry_stats.py --check` passed:
  schemas in sync, 1,112 functions across 84 submodules.
- `python -m flake8 src/statspai/core/effect_summary.py
  src/statspai/checks/base.py src/statspai/checks/__init__.py
  src/statspai/smart/intake.py scripts/check_contract_inventory.py
  tests/test_causalpy_inspired_contracts.py` passed.
- `python -m mypy src/statspai/core/effect_summary.py
  src/statspai/checks/base.py src/statspai/smart/intake.py
  --show-error-codes` passed.
- `git diff --check` passed.
- `python scripts/quality_gate.py all` was run for visibility. Its contract
  inventory, import-budget, agent-card, result-protocol, and flake8 gates
  passed, but the aggregate command is still red because the current dirty
  correctness lane raises the mypy debt count to 1059/1058 and the error
  taxonomy broad-handler count to 589/586. The visible broad-handler additions
  are in `src/statspai/did/did_imputation.py` and
  `src/statspai/did/gardner_2s.py`, which are outside this goal's ownership
  boundary.

## Deferred Design Items

- Add design-specific check classes gradually (`RDManipulationCheck`,
  `SyntheticPlaceboCheck`, `DIDPretrendCheck`) on top of the new `Check`
  protocol instead of wiring every diagnostic at once.
- Extend `EffectSummary` to method-specific panel/time-series summaries after
  the individual estimators expose standardized effect paths.
- Teach the recommendation engine to call `design_intake(...)` before estimator
  ranking so ambiguous or unidentified designs do not silently fall through to
  a plausible but unsupported method.
