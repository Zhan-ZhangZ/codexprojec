"""Phase-emit capability registration in the lethal-trifecta matrix.

Each phase's emission act is a stable capability tag in the same matrix
that gates the lethal trifecta.  The matrix can therefore deny
cross-phase emission at the policy boundary instead of trusting the
agent to self-declare its phase.
"""

from __future__ import annotations

import pytest

from bernstein.core.orchestration.phase_pipeline import Phase
from bernstein.core.orchestration.phase_schemas import (
    PHASE_EMIT_CAPABILITY_PREFIX,
    PhaseValidationError,
    assert_phase_emission_allowed,
    phase_emit_capability,
    phase_emit_schema_id,
    register_with_capability_matrix,
)
from bernstein.core.security.capability_matrix import CapabilityRegistry


def test_register_emits_one_capability_per_phase() -> None:
    reg = CapabilityRegistry()
    registered = register_with_capability_matrix(reg)
    expected = {
        f"{PHASE_EMIT_CAPABILITY_PREFIX}research",
        f"{PHASE_EMIT_CAPABILITY_PREFIX}plan",
        f"{PHASE_EMIT_CAPABILITY_PREFIX}implement",
        f"{PHASE_EMIT_CAPABILITY_PREFIX}verify",
    }
    assert set(registered) == expected
    for tool in expected:
        assert tool in reg.tools


def test_phase_emit_capability_helper_matches_registration() -> None:
    assert phase_emit_capability(Phase.PLAN) == f"{PHASE_EMIT_CAPABILITY_PREFIX}plan"
    assert phase_emit_capability("implement") == f"{PHASE_EMIT_CAPABILITY_PREFIX}implement"


def test_schema_id_indexed_after_registration() -> None:
    reg = CapabilityRegistry()
    register_with_capability_matrix(reg)
    schema_id = phase_emit_schema_id(f"{PHASE_EMIT_CAPABILITY_PREFIX}plan")
    assert schema_id == "bernstein://phase/plan/v1"


def test_cross_phase_emission_is_denied_at_policy_boundary() -> None:
    reg = CapabilityRegistry()
    register_with_capability_matrix(reg)
    with pytest.raises(PhaseValidationError) as excinfo:
        assert_phase_emission_allowed(reg, Phase.IMPLEMENT, Phase.PLAN)
    err = excinfo.value
    assert "cross-phase emission denied" in err.errors[0].message
    assert err.errors[0].schema_id == "bernstein://phase/plan/v1"


def test_same_phase_emission_is_allowed() -> None:
    reg = CapabilityRegistry()
    register_with_capability_matrix(reg)
    # No exception when declared and emitted phases match.
    assert_phase_emission_allowed(reg, Phase.IMPLEMENT, Phase.IMPLEMENT)


def test_emission_check_requires_registry_entries() -> None:
    """An unregistered phase must not silently pass the boundary."""
    bare = CapabilityRegistry()
    with pytest.raises(PhaseValidationError):
        assert_phase_emission_allowed(bare, Phase.RESEARCH, Phase.RESEARCH)
