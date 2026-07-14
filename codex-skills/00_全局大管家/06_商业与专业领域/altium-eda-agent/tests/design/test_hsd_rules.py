# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 George Saliba <george.saliba@salitronic.com>
"""Differential-pair trace-sizing suggestion tests."""

from __future__ import annotations

import pytest

from eda_agent.design.hsd_rules import suggest_diff_pair_traces
from eda_agent.design.impedance_sizing import trace_width_for_impedance
from eda_agent.design.plan import DesignPlan, Net, Part, PinRef, Sheet


def _net(name, pins, **kw):
    return Net(name=name, pins=[PinRef(refdes=r, pin=p) for r, p in pins], **kw)


def _usb_plan():
    """USB diff pair (DP/DM) between connector J1 and PHY U1, with VBUS/GND so
    the endpoints have >= 3 pins (the diff-pair endpoint test)."""
    return DesignPlan(
        spec="usb", summary="usb diff pair", sheets=[Sheet(name="main")],
        zones=[], parts=[Part(refdes="J1", lib_ref="USB"),
                         Part(refdes="U1", lib_ref="PHY")],
        nets=[
            _net("DP", [("J1", "1"), ("U1", "10")], role="differential"),
            _net("DM", [("J1", "2"), ("U1", "11")], role="differential"),
            _net("VBUS", [("J1", "8"), ("U1", "9")], is_power=True),
            _net("GND", [("J1", "7"), ("U1", "6")], is_ground=True)])


def test_suggests_a_width_for_each_pair():
    out = suggest_diff_pair_traces(_usb_plan(), target_ohms=90,
                                   dielectric_height_mils=7.0, spacing_mils=6.0)
    assert len(out) == 1
    t = out[0]
    assert set(t.nets) == {"DP", "DM"}
    assert t.endpoints == ("J1", "U1")
    assert t.feasible and t.width_mils > 0
    # Matches the direct impedance inverse for the same inputs.
    direct = trace_width_for_impedance(90, "microstrip_diff", 7.0,
                                       dielectric_constant=4.2, spacing_mils=6.0)
    assert t.width_mils == pytest.approx(round(direct.width_mils, 2))


def test_lower_impedance_target_gives_wider_trace():
    a = suggest_diff_pair_traces(_usb_plan(), target_ohms=100)[0].width_mils
    b = suggest_diff_pair_traces(_usb_plan(), target_ohms=80)[0].width_mils
    assert b > a


def test_no_differential_nets_yields_empty():
    plan = DesignPlan(
        spec="x", summary="x", sheets=[Sheet(name="main")], zones=[],
        parts=[Part(refdes="U1", lib_ref="IC"), Part(refdes="R1", lib_ref="RES")],
        nets=[_net("N", [("U1", "1"), ("R1", "1")]),
              _net("GND", [("U1", "2"), ("R1", "2")], is_ground=True)])
    assert suggest_diff_pair_traces(plan) == []


def test_rejects_single_ended_geometry():
    with pytest.raises(ValueError):
        suggest_diff_pair_traces(_usb_plan(), geometry="microstrip")


def test_deterministic():
    p = _usb_plan()
    assert suggest_diff_pair_traces(p) == suggest_diff_pair_traces(p)
