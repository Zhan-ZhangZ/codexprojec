"""Tests for the immutable feature-contract module."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from bernstein.core.planning.feature_contract import (
    DEFAULT_CONTRACT_PATH,
    SCHEMA_VERSION,
    Feature,
    FeatureContract,
    FeatureContractError,
    SchemaVersionError,
    TamperingDetectedError,
    UnknownFeatureError,
    compute_anchor,
    features_from_plan_step,
)
from bernstein.core.security.audit import AuditLog


def _sample_features() -> list[Feature]:
    return [
        Feature(
            id="F-001",
            category="api",
            description="POST /tasks creates a task",
            acceptance_steps=["call API", "assert 201"],
            acceptance_check="pytest tests/test_tasks.py::test_create",
        ),
        Feature(
            id="F-002",
            category="api",
            description="GET /tasks lists open tasks",
            acceptance_steps=["call GET /tasks", "assert list"],
            acceptance_check="pytest tests/test_tasks.py::test_list",
        ),
    ]


def test_create_assigns_anchor_and_schema_version() -> None:
    contract = FeatureContract.create(_sample_features())
    assert contract.schema_version == SCHEMA_VERSION
    assert len(contract.anchor) == 64
    assert contract.anchor == compute_anchor(contract.features)


def test_create_rejects_duplicate_ids() -> None:
    feats = _sample_features()
    feats.append(Feature(id="F-001", category="x", description="dup"))
    with pytest.raises(FeatureContractError, match="duplicate"):
        FeatureContract.create(feats)


def test_save_and_load_roundtrip(tmp_path: Path) -> None:
    contract = FeatureContract.create(_sample_features())
    path = tmp_path / "features.json"
    contract.save(path)
    loaded = FeatureContract.load(path)
    assert loaded.anchor == contract.anchor
    assert [f.id for f in loaded.features] == ["F-001", "F-002"]
    assert loaded.schema_version == SCHEMA_VERSION


def test_load_detects_tampering_with_added_feature(tmp_path: Path) -> None:
    contract = FeatureContract.create(_sample_features())
    path = tmp_path / "features.json"
    contract.save(path)

    raw = json.loads(path.read_text())
    raw["features"].append(
        {
            "id": "F-999",
            "category": "smuggled",
            "description": "snuck in",
            "acceptance_steps": [],
            "acceptance_check": "",
            "passes": True,
            "evidence_path": None,
        }
    )
    path.write_text(json.dumps(raw))

    with pytest.raises(TamperingDetectedError):
        FeatureContract.load(path)


def test_load_detects_tampering_with_weakened_check(tmp_path: Path) -> None:
    contract = FeatureContract.create(_sample_features())
    path = tmp_path / "features.json"
    contract.save(path)

    raw = json.loads(path.read_text())
    raw["features"][0]["acceptance_check"] = "true"
    path.write_text(json.dumps(raw))

    with pytest.raises(TamperingDetectedError):
        FeatureContract.load(path)


def test_load_rejects_unknown_schema_version(tmp_path: Path) -> None:
    contract = FeatureContract.create(_sample_features())
    path = tmp_path / "features.json"
    contract.save(path)

    raw = json.loads(path.read_text())
    raw["schema_version"] = 999
    path.write_text(json.dumps(raw))

    with pytest.raises(SchemaVersionError):
        FeatureContract.load(path)


def test_mark_pass_does_not_invalidate_anchor(tmp_path: Path) -> None:
    contract = FeatureContract.create(_sample_features())
    original_anchor = contract.anchor

    contract.mark_pass("F-001", evidence_path="logs/run-1.txt")

    path = tmp_path / "features.json"
    contract.save(path)
    loaded = FeatureContract.load(path)
    assert loaded.anchor == original_anchor
    assert loaded.by_id("F-001").passes is True
    assert loaded.by_id("F-001").evidence_path == "logs/run-1.txt"
    assert loaded.by_id("F-002").passes is False


def test_mark_fail_unknown_id_raises() -> None:
    contract = FeatureContract.create(_sample_features())
    with pytest.raises(UnknownFeatureError):
        contract.mark_fail("F-nope")


def test_pending_and_all_pass() -> None:
    contract = FeatureContract.create(_sample_features())
    assert not contract.all_pass()
    assert {f.id for f in contract.pending()} == {"F-001", "F-002"}
    contract.mark_pass("F-001")
    contract.mark_pass("F-002")
    assert contract.all_pass()
    assert contract.pending() == []


def test_features_from_plan_step_backcompat_empty() -> None:
    assert features_from_plan_step({"goal": "do stuff"}) == []
    assert features_from_plan_step({"features": []}) == []


def test_features_from_plan_step_parses_entries() -> None:
    step = {
        "features": [
            {
                "id": "F-A",
                "category": "x",
                "description": "thing",
                "acceptance_steps": ["a", "b"],
                "acceptance_check": "pytest -k a",
            }
        ]
    }
    feats = features_from_plan_step(step)
    assert len(feats) == 1
    assert feats[0].id == "F-A"
    assert feats[0].acceptance_check == "pytest -k a"


def test_features_from_plan_step_rejects_bad_shape() -> None:
    with pytest.raises(FeatureContractError):
        features_from_plan_step({"features": "nope"})
    with pytest.raises(FeatureContractError):
        features_from_plan_step({"features": [{"no_id": True}]})


def test_record_anchor_writes_audit_event(tmp_path: Path) -> None:
    audit_dir = tmp_path / "audit"
    audit = AuditLog(audit_dir, key=b"test-key")
    contract = FeatureContract.create(_sample_features())

    contract.record_anchor(audit, actor="manager")

    events = audit.query(event_type="feature_contract.anchor")
    assert len(events) == 1
    assert events[0].resource_id == contract.anchor
    assert events[0].actor == "manager"
    assert events[0].details["feature_count"] == 2
    assert events[0].details["feature_ids"] == ["F-001", "F-002"]
    assert events[0].details["schema_version"] == SCHEMA_VERSION


def test_default_contract_path_is_under_sdd() -> None:
    assert Path(".sdd/contract/features.json") == DEFAULT_CONTRACT_PATH


def test_feature_from_dict_ignores_unknown_fields() -> None:
    feat = Feature.from_dict(
        {
            "id": "F-1",
            "category": "x",
            "description": "y",
            "acceptance_steps": [],
            "acceptance_check": "",
            "passes": False,
            "evidence_path": None,
            "future_field": "ignore me",
        }
    )
    assert feat.id == "F-1"
