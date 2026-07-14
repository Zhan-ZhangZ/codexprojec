"""End-to-end agent-workflow transcript (Day-7 regression net).

This is the integration test that proves an agent can actually *drive*
StatsPAI through the recommended MCP workflow — not just that individual
units pass.  It exercises the real ``execute_tool`` dispatch + result-cache
handle chaining + output enrichment, following the sequence the MCP server
instructions advertise:

    detect_design -> preflight -> fit(as_handle) -> audit_result
                  -> sensitivity_from_result

It also pins the *failure* UX: a method/design mismatch and a stale handle
must come back as recoverable error envelopes (with a hint), never a crash
— that recoverability is what lets an agent self-correct.

No network / R / Stata; deterministic synthetic panel.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from statspai.agent.tools import execute_tool


def _did_panel(seed: int = 0, n: int = 600) -> pd.DataFrame:
    rng = np.random.RandomState(seed)
    df = pd.DataFrame(
        {
            "id": np.repeat(np.arange(n // 2), 2),
            "time": np.tile([0, 1], n // 2),
        }
    )
    df["treat"] = (df["id"] % 2 == 0).astype(int)
    df["post"] = df["time"]
    df["y"] = 1.0 + 0.5 * df["treat"] * df["post"] + rng.normal(0, 1, len(df))
    return df


def _ok(out) -> bool:
    return isinstance(out, dict) and not out.get("error")


# --------------------------------------------------------------------------- #
#  Happy path: the full recommended transcript chains end to end
# --------------------------------------------------------------------------- #


def test_full_did_agent_transcript():
    df = _did_panel()

    # 1. Identify the study shape from raw columns.
    design = execute_tool("detect_design", {}, data=df)
    assert _ok(design), design
    assert "design" in design and "candidates" in design

    # 2. Pre-fit identification checks — must return a verdict, not crash.
    pre = execute_tool(
        "preflight",
        {"method": "did", "y": "y", "treat": "treat", "time": "post"},
        data=df,
    )
    assert _ok(pre), pre
    assert "verdict" in pre and "checks" in pre

    # 3. Fit, caching the result so downstream tools chain by handle.
    fit = execute_tool(
        "did",
        {"y": "y", "treat": "treat", "time": "post"},
        data=df,
        detail="agent",
        as_handle=True,
    )
    assert _ok(fit), fit
    assert isinstance(fit.get("estimate"), (int, float))
    rid = fit.get("result_id")
    assert isinstance(rid, str) and rid.startswith("r_"), fit

    # 4. Reviewer-grade audit, by handle only (no data re-sent).
    audit = execute_tool("audit_result", {"result_id": rid}, data=None)
    assert _ok(audit), audit
    assert "checks" in audit and "coverage" in audit

    # 5. Design-agnostic sensitivity off the same handle.
    sens = execute_tool(
        "sensitivity_from_result",
        {"result_id": rid, "method": "evalue"},
        data=None,
    )
    assert _ok(sens), sens
    assert sens.get("source_result_id") == rid


# --------------------------------------------------------------------------- #
#  Result-handle chaining contract
# --------------------------------------------------------------------------- #


def test_handle_is_reusable_and_stale_handle_errors_cleanly():
    df = _did_panel(seed=1)
    fit = execute_tool(
        "did",
        {"y": "y", "treat": "treat", "time": "post"},
        data=df,
        as_handle=True,
    )
    rid = fit["result_id"]

    # Same handle drives two different downstream tools.
    assert _ok(execute_tool("audit_result", {"result_id": rid}, data=None))
    assert _ok(
        execute_tool(
            "sensitivity_from_result",
            {"result_id": rid, "method": "evalue"},
            data=None,
        )
    )

    # A handle that was never cached returns a clean, explanatory error.
    bad = execute_tool("audit_result", {"result_id": "r_deadbeef00000000"}, data=None)
    assert isinstance(bad, dict) and bad.get("error")
    assert "not found" in bad["error"].lower()


# --------------------------------------------------------------------------- #
#  Failure UX: a mismatch is recoverable, not fatal
# --------------------------------------------------------------------------- #


def test_method_mismatch_returns_recoverable_envelope():
    """honest_did needs an event study; a plain 2x2 must fail *gracefully*."""
    df = _did_panel(seed=2)
    fit = execute_tool(
        "did",
        {"y": "y", "treat": "treat", "time": "post"},
        data=df,
        as_handle=True,
    )
    out = execute_tool(
        "honest_did_from_result",
        {"result_id": fit["result_id"], "method": "relative_magnitude"},
        data=None,
    )
    # Not a crash — an envelope the agent can read and route around.
    assert isinstance(out, dict) and out.get("error")
    # Carries enough context to self-correct (a hint or the upstream cause).
    assert out.get("hint") or out.get("upstream_error")


# --------------------------------------------------------------------------- #
#  Enrichment reaches the agent
# --------------------------------------------------------------------------- #


def test_fit_payload_carries_enrichment_for_the_agent():
    df = _did_panel(seed=3)
    fit = execute_tool(
        "did",
        {"y": "y", "treat": "treat", "time": "post"},
        data=df,
        detail="agent",
        as_handle=True,
    )
    # The agent gets a citation handle, ready-to-run next calls, and prose.
    assert "citation_key" in fit
    assert isinstance(fit.get("next_calls"), list) and fit["next_calls"]
    assert isinstance(fit.get("narrative"), str) and fit["narrative"]
    # Every advertised next-call names a real tool with a tool field.
    for nc in fit["next_calls"]:
        assert nc.get("tool")
