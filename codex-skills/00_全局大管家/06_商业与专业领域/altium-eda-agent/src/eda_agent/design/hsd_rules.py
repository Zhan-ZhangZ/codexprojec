# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 George Saliba <george.saliba@salitronic.com>
"""High-speed design helpers: size every differential pair's traces.

A controlled-impedance board sizes each differential pair's traces to a target
impedance (90 ohm USB, 100 ohm HDMI/LVDS) for the chosen stackup. This finds
the pairs (the same role-driven detector the placement constraints use) and
sizes each one with the verified IPC-2141 impedance inverse, so a planner gets
the trace width for every pair in one call instead of identifying pairs and
running the calculator by hand.

The stackup (dielectric height / er / copper) and the target impedance are
BOARD-LEVEL decisions the planner supplies; everything else is derived. Pure
offline, formula-based (round-trips with the forward impedance calc).
"""

from __future__ import annotations

from dataclasses import dataclass

from eda_agent.design.plan import DesignPlan


@dataclass(frozen=True)
class DiffPairTrace:
    """A differential pair and the trace geometry recommended for it."""

    nets: tuple[str, ...]
    endpoints: tuple[str, ...]
    width_mils: float
    spacing_mils: float
    target_ohms: float
    single_ended_z0_ohms: float
    feasible: bool


def suggest_diff_pair_traces(
    plan: DesignPlan,
    *,
    target_ohms: float = 90.0,
    geometry: str = "microstrip_diff",
    dielectric_height_mils: float = 7.0,
    dielectric_constant: float = 4.2,
    copper_oz: float = 1.0,
    spacing_mils: float = 6.0,
) -> list[DiffPairTrace]:
    """Recommend a trace width for every differential pair in ``plan``.

    Detects the pairs (role ``differential``, see
    :func:`~eda_agent.design.diffpairs.detect_diff_pairs`) and sizes each to
    ``target_ohms`` for the given stackup and ``spacing_mils`` via the IPC-2141
    impedance inverse. Returns one :class:`DiffPairTrace` per pair (sorted);
    empty when the plan has no differential pairs. ``geometry`` must be a
    differential one (``microstrip_diff`` / ``stripline_diff``).
    """
    from eda_agent.design.diffpairs import detect_diff_pairs
    from eda_agent.design.impedance_sizing import trace_width_for_impedance

    if not geometry.strip().lower().endswith("_diff"):
        raise ValueError("geometry must be a differential geometry "
                         "(microstrip_diff / stripline_diff)")
    out: list[DiffPairTrace] = []
    for dp in detect_diff_pairs(plan):
        r = trace_width_for_impedance(
            target_ohms, geometry, dielectric_height_mils,
            dielectric_constant=dielectric_constant, copper_oz=copper_oz,
            spacing_mils=spacing_mils)
        out.append(DiffPairTrace(
            nets=dp.nets, endpoints=tuple(sorted(dp.endpoints)),
            width_mils=round(r.width_mils, 2), spacing_mils=spacing_mils,
            target_ohms=target_ohms,
            single_ended_z0_ohms=round(r.single_ended_z0_ohms, 1),
            feasible=r.feasible))
    out.sort(key=lambda t: t.nets)
    return out


__all__ = ["DiffPairTrace", "suggest_diff_pair_traces"]
