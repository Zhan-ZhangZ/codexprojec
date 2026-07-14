"""Strict per-phase schema validation tests.

Each phase's schema is exercised with one happy-path payload and one or
more sad-path payloads.  The sad paths target the constraints that the
shared shape check missed: ``additionalProperties`` rejection, empty
strings, and the per-phase required extras.
"""

from __future__ import annotations

import pytest

from bernstein.core.orchestration.phase_pipeline import Phase, PhaseArtifact, PhaseSpec
from bernstein.core.orchestration.phase_schemas import (
    IMPLEMENT_OUTPUT_SCHEMA,
    PLAN_OUTPUT_SCHEMA,
    RESEARCH_OUTPUT_SCHEMA,
    VERIFY_OUTPUT_SCHEMA,
    PhaseValidationError,
    schema_for_phase,
    validate_phase_output,
)

# ---------------------------------------------------------------------------
# Schema constants
# ---------------------------------------------------------------------------


def test_each_phase_has_distinct_schema_id() -> None:
    ids = {
        RESEARCH_OUTPUT_SCHEMA["$id"],
        PLAN_OUTPUT_SCHEMA["$id"],
        IMPLEMENT_OUTPUT_SCHEMA["$id"],
        VERIFY_OUTPUT_SCHEMA["$id"],
    }
    assert len(ids) == 4


def test_every_schema_seals_additional_properties() -> None:
    for schema in (RESEARCH_OUTPUT_SCHEMA, PLAN_OUTPUT_SCHEMA, IMPLEMENT_OUTPUT_SCHEMA, VERIFY_OUTPUT_SCHEMA):
        assert schema["additionalProperties"] is False, schema["$id"]


def test_schema_for_phase_accepts_enum_and_string() -> None:
    assert schema_for_phase(Phase.RESEARCH) is RESEARCH_OUTPUT_SCHEMA
    assert schema_for_phase("plan") is PLAN_OUTPUT_SCHEMA


# ---------------------------------------------------------------------------
# Research phase
# ---------------------------------------------------------------------------


def _research_payload() -> dict[str, object]:
    return {
        "summary": "scanned the orchestrator package and located the boundary",
        "decisions": ["use existing TaskStore"],
        "constraints": ["python 3.12"],
        "open_questions": ["batch policy interaction?"],
    }


def test_research_happy_path() -> None:
    assert validate_phase_output(Phase.RESEARCH, _research_payload()) == []


def test_research_rejects_short_summary() -> None:
    payload = _research_payload()
    payload["summary"] = "tiny"
    errs = validate_phase_output(Phase.RESEARCH, payload)
    assert errs
    assert errs[0].field_path == "summary"


def test_research_rejects_additional_properties() -> None:
    payload = _research_payload()
    payload["secret_field"] = "leak"
    errs = validate_phase_output(Phase.RESEARCH, payload)
    assert errs


# ---------------------------------------------------------------------------
# Plan phase
# ---------------------------------------------------------------------------


def _plan_payload() -> dict[str, object]:
    return {
        "summary": "plan derived from research summary",
        "decisions": ["add module", "wire loader"],
        "constraints": ["python 3.12"],
        "open_questions": [],
        "dependencies": ["a->b", "b->c"],
    }


def test_plan_happy_path() -> None:
    assert validate_phase_output(Phase.PLAN, _plan_payload()) == []


def test_plan_requires_dependencies_field() -> None:
    payload = _plan_payload()
    payload.pop("dependencies")
    errs = validate_phase_output(Phase.PLAN, payload)
    assert errs


def test_plan_rejects_malformed_dependency_edge() -> None:
    payload = _plan_payload()
    payload["dependencies"] = ["just a string"]
    errs = validate_phase_output(Phase.PLAN, payload)
    assert errs
    assert errs[0].field_path.startswith("dependencies")


# ---------------------------------------------------------------------------
# Implement phase
# ---------------------------------------------------------------------------


def _implement_payload() -> dict[str, object]:
    return {
        "summary": "shipped feature foo",
        "decisions": ["committed"],
        "constraints": [],
        "open_questions": [],
        "files_changed": ["src/foo.py"],
        "tests_added": ["tests/unit/test_foo.py"],
        "tests_passing": ["tests/unit/test_foo.py::test_smoke"],
    }


def test_implement_happy_path() -> None:
    assert validate_phase_output(Phase.IMPLEMENT, _implement_payload()) == []


def test_implement_requires_files_changed_field() -> None:
    payload = _implement_payload()
    payload.pop("files_changed")
    errs = validate_phase_output(Phase.IMPLEMENT, payload)
    assert errs


def test_implement_requires_tests_added_and_passing() -> None:
    payload = _implement_payload()
    payload.pop("tests_added")
    errs1 = validate_phase_output(Phase.IMPLEMENT, payload)
    payload2 = _implement_payload()
    payload2.pop("tests_passing")
    errs2 = validate_phase_output(Phase.IMPLEMENT, payload2)
    assert errs1
    assert errs2


# ---------------------------------------------------------------------------
# Verify phase
# ---------------------------------------------------------------------------


def _verify_payload() -> dict[str, object]:
    return {
        "summary": "all gates passed",
        "decisions": ["accept"],
        "constraints": [],
        "open_questions": [],
        "verdict": "pass",
    }


def test_verify_happy_path() -> None:
    assert validate_phase_output(Phase.VERIFY, _verify_payload()) == []


def test_verify_rejects_unknown_verdict() -> None:
    payload = _verify_payload()
    payload["verdict"] = "approved"  # not in enum
    errs = validate_phase_output(Phase.VERIFY, payload)
    assert errs
    assert errs[0].field_path == "verdict"


# ---------------------------------------------------------------------------
# Cross-phase rejection at the artefact boundary
# ---------------------------------------------------------------------------


def test_plan_payload_rejected_against_implement_schema() -> None:
    """An ``implement`` agent must not slip a plan-shaped artefact through."""
    plan_payload = _plan_payload()
    errs = validate_phase_output(Phase.IMPLEMENT, plan_payload)
    assert errs


def test_phase_artifact_from_dict_strict_mode_raises() -> None:
    """Strict-mode :meth:`PhaseArtifact.from_dict` propagates schema errors."""
    bad = _research_payload()
    bad["summary"] = ""
    with pytest.raises(PhaseValidationError) as excinfo:
        PhaseArtifact.from_dict(bad, phase=Phase.RESEARCH)
    err = excinfo.value
    assert err.phase == "research"
    assert err.errors  # at least one error preserved for re-fire seed


def test_phase_artifact_from_dict_lenient_mode_accepts_legacy() -> None:
    """Without ``phase=...`` the lenient four-field check still works."""
    PhaseArtifact.from_dict(_research_payload())  # no exception


# ---------------------------------------------------------------------------
# Prompt-contract rendering
# ---------------------------------------------------------------------------


def test_render_prompt_contract_returns_fenced_json_block() -> None:
    spec = PhaseSpec.default(Phase.PLAN)
    rendered = spec.render_prompt_contract()
    assert rendered.startswith("```json\n")
    assert rendered.endswith("\n```")
    # Round-trip: the JSON inside the fences should be parseable.
    import json as _json

    body = rendered.removeprefix("```json\n").removesuffix("\n```")
    parsed = _json.loads(body)
    assert parsed["$id"] == PLAN_OUTPUT_SCHEMA["$id"]
