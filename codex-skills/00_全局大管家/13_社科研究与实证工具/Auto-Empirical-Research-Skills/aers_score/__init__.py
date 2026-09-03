"""``aers-score`` — take the AERS numeric benchmark and score yourself against it.

The benchmark in [`benchmark/`](../benchmark/README.md) is the repo's strongest
trust signal: deterministic datasets with known truth, and graders that
*recompute* every data-derived gold from the committed CSV so a candidate
cannot pass by reporting fabricated numbers. Until now the only way in was to
read ``benchmark/README.md``, hand-write a ``results.json``, and invoke
``benchmark/check_benchmark.py`` — a checker written for the repo's own CI, not
for a stranger with their own agent.

This package is the front door for that stranger. It does not reimplement any
grading: ``aers_score.exam`` loads ``benchmark/check_benchmark.py`` and calls
its pure functions (``validate_task``, ``validate_candidate``, ``compute_truth``,
``grade``), so the score you get here is the score CI gives the reference
pipeline. What it adds is the missing ergonomics — discovering the exam,
scaffolding a candidate with the exact fields each task grades, machine-readable
scorecards, and a submission file the public scoreboard can ingest.

Stdlib only, like everything else in the repo's tooling.
"""

from __future__ import annotations

__all__ = ["__version__"]

# Tracks the repo's calendar release line (see docs/RELEASE.md), not semver:
# the CLI is only meaningful against the exam it ships beside.
__version__ = "2026.9.0"
