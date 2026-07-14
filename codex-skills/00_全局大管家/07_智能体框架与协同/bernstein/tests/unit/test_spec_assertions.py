"""Tests for the spec-as-test layer that consumes feature_contract.json."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from bernstein.core.planning.feature_contract import (
    Feature,
    FeatureContract,
)
from bernstein.core.planning.spec_assertions import (
    Assertion,
    AssertionReport,
    AssertionResult,
    apply_results_to_contract,
    assertions_to_pytest,
    extract_assertions,
    load_contract,
    run_assertions,
    verify_contract,
)


def _features() -> list[Feature]:
    return [
        Feature(
            id="F-001",
            category="api",
            description="POST /tasks creates a task",
            acceptance_steps=[
                "exists src/bernstein/core/planning/feature_contract.py",
                "import bernstein.core.planning.feature_contract",
                "contains src/bernstein/core/planning/feature_contract.py /class FeatureContract/",
                "ensure manager wakes up on tick",
            ],
            acceptance_check="pytest tests/unit/test_feature_contract.py -k roundtrip",
        ),
        Feature(
            id="F-002",
            category="schema",
            description="schema_version is 1",
            acceptance_steps=["exists .sdd/contract/features.json"],
            acceptance_check="",
        ),
        Feature(
            id="F-003",
            category="meta",
            description="feature with no parseable info",
            acceptance_steps=["please be nice"],
            acceptance_check="",
        ),
    ]


def _contract() -> FeatureContract:
    return FeatureContract.create(_features())


def test_extract_returns_one_test_passes_per_acceptance_check() -> None:
    report = extract_assertions(_contract())
    test_passes = [a for a in report.assertions if a.kind == "test_passes"]
    assert len(test_passes) == 1
    assert test_passes[0].feature_id == "F-001"
    assert "test_feature_contract" in test_passes[0].target


def test_extract_parses_known_step_kinds() -> None:
    report = extract_assertions(_contract())
    kinds = sorted({a.kind for a in report.assertions})
    assert kinds == ["file_exists", "import_resolves", "regex_in_file", "test_passes"]


def test_extract_collects_unparsed_steps() -> None:
    report = extract_assertions(_contract())
    assert ("F-001", "ensure manager wakes up on tick") in report.unparsed
    assert ("F-003", "please be nice") in report.unparsed


def test_extract_records_skipped_features() -> None:
    report = extract_assertions(_contract())
    assert "F-003" in report.skipped_features
    assert "F-001" not in report.skipped_features
    assert "F-002" not in report.skipped_features


def test_run_file_exists_pass_and_fail(tmp_path: Path) -> None:
    (tmp_path / "present.txt").write_text("hi")
    assertions = [
        Assertion("F-x", "file_exists", "present.txt", "exists"),
        Assertion("F-x", "file_exists", "missing.txt", "exists"),
    ]
    report = run_assertions(assertions, tmp_path)
    assert [r.passed for r in report.results] == [True, False]
    assert "missing" in report.results[1].detail


def test_run_import_resolves() -> None:
    ok = Assertion("F-y", "import_resolves", "bernstein.core.planning.feature_contract", "ok")
    bad = Assertion("F-y", "import_resolves", "bernstein.does_not_exist_xyz", "no")
    report = run_assertions([ok, bad], Path.cwd())
    assert report.results[0].passed
    assert not report.results[1].passed
    assert "ModuleNotFoundError" in report.results[1].detail or "No module" in report.results[1].detail


def test_run_regex_in_file(tmp_path: Path) -> None:
    p = tmp_path / "code.py"
    p.write_text("class FeatureContract:\n    pass\n")
    hit = Assertion("F-z", "regex_in_file", "code.py::class FeatureContract", "match")
    miss = Assertion("F-z", "regex_in_file", "code.py::class Nope", "no match")
    bad_target = Assertion("F-z", "regex_in_file", "no_double_colon", "malformed")
    bad_regex = Assertion("F-z", "regex_in_file", "code.py::[", "bad regex")
    report = run_assertions([hit, miss, bad_target, bad_regex], tmp_path)
    flags = [r.passed for r in report.results]
    assert flags == [True, False, False, False]
    assert "malformed" in report.results[2].detail
    assert "invalid regex" in report.results[3].detail


def test_run_test_passes_disabled_by_default() -> None:
    a = Assertion("F-q", "test_passes", "true", "should not run")
    report = run_assertions([a], Path.cwd())
    assert not report.results[0].passed
    assert "subprocess execution disabled" in report.results[0].detail


def test_run_test_passes_with_subprocess_allowed(tmp_path: Path) -> None:
    ok = Assertion("F-q", "test_passes", 'python -c "exit(0)"', "ok")
    bad = Assertion("F-q", "test_passes", 'python -c "exit(7)"', "bad")
    report = run_assertions([ok, bad], tmp_path, allow_subprocess=True, timeout_s=10)
    assert report.results[0].passed
    assert not report.results[1].passed


def test_aggregate_report_helpers() -> None:
    rep = AssertionReport(
        results=[
            AssertionResult("F-1", "file_exists", "a", True, "ok"),
            AssertionResult("F-1", "import_resolves", "x", False, "boom"),
            AssertionResult("F-2", "file_exists", "b", False, "boom"),
            AssertionResult("F-3", "file_exists", "c", True, "ok"),
        ]
    )
    assert not rep.passed
    assert {r.feature_id for r in rep.failures} == {"F-1", "F-2"}
    assert rep.failed_feature_ids() == ["F-1", "F-2"]


def test_apply_results_marks_pass_only_when_all_pass(tmp_path: Path) -> None:
    contract = _contract()
    rep = AssertionReport(
        results=[
            AssertionResult("F-001", "file_exists", "a", True, "ok"),
            AssertionResult("F-001", "import_resolves", "b", True, "ok"),
            AssertionResult("F-002", "file_exists", "c", False, "missing"),
        ]
    )
    apply_results_to_contract(contract, rep)
    assert contract.by_id("F-001").passes is True
    assert contract.by_id("F-002").passes is False
    assert contract.by_id("F-003").passes is False

    saved = tmp_path / "features.json"
    contract.save(saved)
    reloaded = FeatureContract.load(saved)
    assert reloaded.by_id("F-001").passes is True


def test_assertions_to_pytest_emits_runnable_module(tmp_path: Path) -> None:
    out = tmp_path / "tests" / "spec" / "test_plan_contract.py"
    extracted = extract_assertions(_contract())
    written = assertions_to_pytest(extracted.assertions, out)
    assert written == out
    text = out.read_text()
    assert text.startswith('"""Auto-generated')
    assert "from bernstein.core.planning.spec_assertions import" in text
    assert "def test_F_001_" in text
    compile(text, str(out), "exec")


def test_assertions_to_pytest_with_no_assertions_uses_placeholder(tmp_path: Path) -> None:
    out = tmp_path / "spec.py"
    written = assertions_to_pytest([], out)
    text = written.read_text()
    assert "test_no_assertions_extracted" in text
    compile(text, str(out), "exec")


def test_load_contract_returns_none_when_absent(tmp_path: Path) -> None:
    assert load_contract(tmp_path / "missing.json") is None


def test_load_contract_propagates_tampering(tmp_path: Path) -> None:
    path = tmp_path / "features.json"
    _contract().save(path)
    raw = json.loads(path.read_text())
    raw["features"][0]["acceptance_check"] = "true"
    path.write_text(json.dumps(raw))

    from bernstein.core.planning.feature_contract import TamperingDetectedError

    with pytest.raises(TamperingDetectedError):
        load_contract(path)


def test_verify_contract_no_op_when_missing(tmp_path: Path) -> None:
    assert verify_contract(tmp_path / "missing.json", tmp_path) is None


def test_verify_contract_runs_and_optionally_applies(tmp_path: Path) -> None:
    contract = FeatureContract.create(
        [
            Feature(
                id="F-OK",
                category="x",
                description="present",
                acceptance_steps=["exists hello.txt"],
                acceptance_check="",
            ),
            Feature(
                id="F-MISS",
                category="x",
                description="absent",
                acceptance_steps=["exists nope.txt"],
                acceptance_check="",
            ),
        ]
    )
    contract_path = tmp_path / "features.json"
    contract.save(contract_path)
    (tmp_path / "hello.txt").write_text("hi")

    out = verify_contract(contract_path, tmp_path, apply=True)
    assert out is not None
    extraction, run = out
    assert {a.feature_id for a in extraction.assertions} == {"F-OK", "F-MISS"}
    assert not run.passed
    reloaded = FeatureContract.load(contract_path)
    assert reloaded.by_id("F-OK").passes is True
    assert reloaded.by_id("F-MISS").passes is False
