"""Contract tests for ``scripts/error_taxonomy_audit.py``."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPT = REPO_ROOT / "scripts" / "error_taxonomy_audit.py"

# The threshold/``--check`` assertions are an internal *code-governance*
# ratchet (broad ``except Exception`` count vs a hand-maintained ceiling),
# not a numerical or functional test. Pinned to the current count, it trips
# transiently whenever a feature merge adds a best-effort handler before the
# ceiling is bumped — which surfaced as a confusing "REGRESSION" failure to a
# JOSS reviewer running a fresh ``pytest`` mid-merge. So the ratchet itself is
# enforced as a dedicated CI step (``python scripts/error_taxonomy_audit.py
# --check``; see .github/workflows/ci-cd.yml) and skipped in the default suite.
# The structural contract tests below still run for everyone. Set
# STATSPAI_RUN_QUALITY_GATES=1 to exercise the ratchet locally.
_quality_gate = pytest.mark.skipif(
    not os.environ.get("STATSPAI_RUN_QUALITY_GATES"),
    reason=(
        "code-governance ratchet (CI-only); set STATSPAI_RUN_QUALITY_GATES=1 "
        "to run locally. Enforced in CI via scripts/error_taxonomy_audit.py "
        "--check so a fresh `pytest` clone is not gated by a drifting count."
    ),
)


def _run(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
    )


def test_error_taxonomy_summary_renders() -> None:
    res = _run([])
    assert res.returncode == 0, res.stderr
    assert "StatsPAI error taxonomy audit" in res.stdout
    assert "taxonomy exceptions" in res.stdout
    assert "generic built-ins" in res.stdout


def test_error_taxonomy_json_is_summary_by_default() -> None:
    # Structural contract only (runs for everyone): summary mode emits the
    # totals/thresholds blocks and hides the per-site detail. The numeric
    # ratchet comparison lives in the quality-gated test below.
    res = _run(["--json"])
    assert res.returncode == 0, res.stderr
    payload = json.loads(res.stdout)
    assert {"totals", "by_exception", "thresholds"} <= set(payload)
    assert "raises" not in payload
    assert "broad_handlers" not in payload
    totals = payload["totals"]
    thresholds = payload["thresholds"]
    assert {"taxonomy_raises", "generic_raises", "broad_exception_handlers"} <= set(
        totals
    )
    assert {
        "taxonomy_raise_min",
        "generic_raise_max",
        "broad_except_max",
    } <= set(thresholds)


@_quality_gate
def test_error_taxonomy_ratchet_within_thresholds() -> None:
    res = _run(["--json"])
    assert res.returncode == 0, res.stderr
    payload = json.loads(res.stdout)
    totals = payload["totals"]
    thresholds = payload["thresholds"]
    assert totals["taxonomy_raises"] >= thresholds["taxonomy_raise_min"]
    assert totals["generic_raises"] <= thresholds["generic_raise_max"]
    assert totals["broad_exception_handlers"] <= thresholds["broad_except_max"]


def test_error_taxonomy_details_can_list_sites() -> None:
    res = _run(["--json", "--details"])
    assert res.returncode == 0, res.stderr
    payload = json.loads(res.stdout)
    assert payload["raises"]
    assert payload["broad_handlers"]
    first = payload["raises"][0]
    assert {"path", "line", "exception", "category"} <= set(first)


@_quality_gate
def test_error_taxonomy_check_mode_passes() -> None:
    res = _run(["--check"])
    assert res.returncode == 0, res.stdout + res.stderr
    assert "[error_taxonomy_audit] OK" in res.stdout
