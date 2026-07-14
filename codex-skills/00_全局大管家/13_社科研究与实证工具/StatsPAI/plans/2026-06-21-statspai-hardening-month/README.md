# StatsPAI Hardening Month

Start date: 2026-06-21

This directory tracks the month-long root StatsPAI hardening run.

## Scope

Included:

- Root package tests, scripts, docs, and planning files needed to close the
  urgent quality gaps identified on 2026-06-21.
- Network Tier-D numeric anchors.
- Quality-gate ratchets for mypy, flake8, schema/help drift, and release
  verification discipline.
- High-priority silent-degradation and error-taxonomy cleanup in root package
  paths.

Excluded unless explicitly requested:

- `Paper-JSS/`
- `CausalAgentBench/`
- `paper.md`
- `paper.bib`
- Release publishing or remote pushes
- Unrelated feature expansion

## Parallel-Agent Rules

- Check root, `Paper-JSS/`, and `CausalAgentBench/` status before each batch.
- Keep edits path-scoped and do not whole-tree stage.
- Treat other worktrees and unrelated dirty files as out of scope.
- Prefer deterministic fixtures and repo-native gates over smoke-only checks.

## Done Evidence

- `scripts/tierd_classify.py report` has 0 estimator-like Tier-D functions.
- `scripts/quality_gate.py all` passes without treating tool/config warnings
  as success.
- `scripts/dump_schemas.py --check` and `scripts/help_coverage.py --check`
  pass after any registry/help/schema-affecting change.
- Targeted pytest for touched surfaces passes.
- `git diff --check` passes.
- Root and nested repos are checked separately before handoff.

## Release/CI Handoff

Fast local gate for this lane before commit:

- `.venv/bin/python -m pytest -o addopts='' tests/test_import_budget.py tests/test_network.py tests/test_no_silent_degradation.py tests/test_workflow_degradations.py tests/test_stability.py::TestStabilityInHelpLayer tests/test_target_trial.py tests/test_cross_validate.py::TestDegradation tests/test_article_aliases_round2.py tests/test_article_aliases.py`
- `.venv/bin/python scripts/tierd_classify.py report`
- `.venv/bin/python scripts/quality_gate.py all`
- `.venv/bin/python scripts/registry_stats.py --check`
- `.venv/bin/python scripts/dump_schemas.py --check`
- `.venv/bin/python scripts/help_coverage.py --check`
- `git diff --check`

Full release or manual full-CI gate before publishing:

- `.venv/bin/python -m pytest tests/ -v --cov=statspai --cov-report=xml --cov-report=term-missing --cov-fail-under=60`
- `.venv/bin/python scripts/coverage_campaign.py report --xml coverage.xml --check --min 95`
- `.venv/bin/python -m pytest tests/reference_parity/ -q --no-header`
- `.venv/bin/python scripts/examples_coverage.py --check --max-missing 0`
- `.venv/bin/python scripts/check_example_execution.py --quiet --max-failures 0`
- `.venv/bin/python -m build`
- `.venv/bin/python -m twine check dist/*`
- `.venv/bin/python tools/audit_citations.py`
