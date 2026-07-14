# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 George Saliba <george.saliba@salitronic.com>
"""Design-agent MCP tools, surfaces the design discipline + primitives.

Claude Code is the planner. It calls ``design.get_discipline`` to read
the rules, ``design.snapshot_inventory`` to learn what parts exist in
the user's libraries, then constructs a DesignPlan JSON, validates it
with ``design.validate_plan``, and hands it to ``design.execute_plan``
to instantiate the schematic.

This module deliberately makes no Anthropic API calls, the AI is the
client (Claude Code), this is just the tool layer it drives.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional, Union

from pydantic import ValidationError

from ..design.audit import audit_schematic as run_audit_schematic
from ..design.component_values import (
    buck_inductor,
    capacitor_energy,
    crystal_load_caps,
    discharge_resistor,
    divider_tolerance,
    feedback_divider,
    holdup_capacitance,
    i2c_pullup,
    junction_temperature,
    led_series_resistor,
    max_power_dissipation,
    nearest_preferred,
    opamp_gain_resistors,
    rc_lowpass,
    required_theta_ja,
    resistor_divider,
)
from ..design.discipline import get_discipline
from ..design.executor import execute_plan_from_json
from ..design.fab_profile import load_fab_profile
from ..design.hierarchy import apply_hierarchy, plan_hierarchy
from ..design.requirement import (
    DesignRequirement,
    summarize_requirement,
    validate_requirement,
)
from ..design.rule_synthesis import synthesize_rules
from ..design.inventory import LibraryInventory, snapshot_live
from ..design.learner import learn_from_layout
from ..design.orchestrator import (
    execute_plan_via_canvas_from_json,
    preview_plan_from_json,
)
from ..design.motif_descriptions import describe_motifs
from ..design.net_classes import classify_nets
from ..design.placement_constraints import infer_placement_constraints
from ..design.plan import DesignPlan
from ..design.plan_erc import check_plan_erc
from ..design.plan_stats import summarize_plan
from ..design.schematic_layout import (
    compute_schematic_layout,
    to_executor_payload,
)
from ..design.validator import validate as run_validate


def _schematic_summary(
    score: dict,
    net_representation: dict,
    n_placements: int,
) -> str:
    """One-line plain-language verdict on a schematic layout, distilling the
    aesthetic score + net representation so the planner can judge at a glance.
    """
    cx = int(score.get("wire_crossings", 0))
    bends = int(score.get("total_bends", 0))
    reps: dict[str, int] = {}
    for kind in net_representation.values():
        reps[kind] = reps.get(kind, 0) + 1
    parts = [
        "no wire crossings (clean)" if cx == 0
        else f"{cx} wire crossing(s) (review)",
        f"{bends} bend(s)",
        f"{n_placements} part(s)",
    ]
    if reps:
        parts.append("nets as " + ", ".join(
            f"{reps[k]} {k}" for k in sorted(reps)))
    return "; ".join(parts) + "."


def _divider_payload(r, series: str, mode: str) -> dict[str, Any]:
    """Shape a DividerResult into the tool's JSON response."""
    return {
        "ok": True,
        "mode": mode,
        "r_top_ohms": r.r_top,
        "r_bottom_ohms": r.r_bottom,
        "v_out": r.v_out,
        "v_out_ideal": r.v_out_ideal,
        "error_pct": r.error_pct,
        "series": series.upper(),
        "summary": (f"Rtop={r.r_top:g} ohm, Rbot={r.r_bottom:g} ohm -> "
                    f"{r.v_out:.4f} V ({r.error_pct:+.3f}%)"),
    }


def register_design_tools(mcp) -> None:
    """Register the design-agent tools with the MCP server."""

    @mcp.tool()
    async def design_get_discipline() -> dict[str, Any]:
        """Read the design discipline + DesignPlan JSON schema.

        ALWAYS call this first when starting a design task. The result
        contains the hard rules the planner must follow (net-label-driven
        wiring, datasheet-first part choice, NDA isolation, etc.) plus
        the JSON schema that ``design.execute_plan`` enforces on input.

        Returns:
            A dict with ``discipline`` (markdown text) and
            ``schema`` (DesignPlan JSON schema as a dict).
        """
        return {
            "discipline": get_discipline(),
            "schema": DesignPlan.model_json_schema(),
        }

    @mcp.tool()
    async def design_snapshot_inventory(
        library_paths: list[str],
        name_filter: str = "",
        limit_per_library: int = 60,
        include_descriptions: bool = True,
    ) -> dict[str, Any]:
        """Open a list of SchLib files and return what components live in them.

        NDA scope: only pass paths to the user's own neutral standard
        libraries. Do NOT pass project-local library paths from another
        client engagement, design knowledge cannot cross NDA boundaries.

        Large libraries (passives/connectors can hold hundreds of parts)
        easily exceed the tool-output token budget, so the RETURNED set is
        filtered and capped. The FULL inventory is always cached to
        ``<workspace>/inventory.json`` for the dashboard regardless of
        these limits.

        Args:
            library_paths: Absolute paths to .SchLib files to scan.
            name_filter: Case-insensitive substring; keep only components
                whose lib_ref or description contains it (e.g. ``"10k"``,
                ``"NE555"``). Empty = no filter.
            limit_per_library: Cap components returned per library
                (default 60; 0 = unlimited). Each library reports
                ``total`` and ``returned`` so you know if it was capped.
            include_descriptions: Drop the (often long) ``description``
                field from the returned rows to save tokens. Default True.

        Returns:
            Inventory dict: ``{"libraries": [{"path", "total",
            "returned", "components": [...]}]}``. Each component carries
            lib_ref, designator_prefix, pin_count, description (unless
            suppressed), and footprint when available.
        """
        paths = [Path(p) for p in library_paths]
        inventory = snapshot_live(paths)
        full_payload = inventory.model_dump()
        # Cache the FULL snapshot (unfiltered) so the web dashboard's
        # Libraries tab can render it without re-running the slow scan.
        try:
            from ..config import get_config
            cache_path = get_config().workspace_dir / "inventory.json"
            cache_path.write_text(
                json.dumps(full_payload, indent=2), encoding="utf-8",
            )
        except OSError:
            pass

        # Build a trimmed payload for the response.
        needle = name_filter.strip().lower()
        cap = max(0, int(limit_per_library))
        out_libs: list[dict[str, Any]] = []
        for lib in full_payload.get("libraries", []):
            comps = lib.get("components") or []
            if needle:
                comps = [
                    c for c in comps
                    if needle in str(c.get("lib_ref") or "").lower()
                    or needle in str(c.get("description") or "").lower()
                ]
            total = len(comps)
            if cap:
                comps = comps[:cap]
            if not include_descriptions:
                comps = [
                    {k: v for k, v in c.items() if k != "description"}
                    for c in comps
                ]
            out_libs.append({
                "path": lib.get("path"),
                "total": total,
                "returned": len(comps),
                "components": comps,
            })
        return {"libraries": out_libs}

    @mcp.tool()
    async def design_validate_plan(plan_json: Union[str, dict]) -> dict[str, Any]:
        """Validate a candidate DesignPlan JSON against the schema + cross-check.

        Run this before ``design.execute_plan`` to catch schema problems
        and cross-references that the executor will reject. Cheap; no
        Altium round-trip.

        Args:
            plan_json: Either a JSON string of the DesignPlan, or the
                DesignPlan as a JSON object/dict. The MCP framework
                auto-deserializes JSON-object literals to dicts before
                the tool sees them, so both shapes are accepted.

        Returns:
            ``{"ok": True, "summary": "..."}`` on success, or
            ``{"ok": False, "errors": [...]}`` listing the specific
            problems. The planner can read these and revise.
        """
        if isinstance(plan_json, dict):
            payload = plan_json
        else:
            try:
                payload = json.loads(plan_json)
            except json.JSONDecodeError as exc:
                return {"ok": False, "errors": [f"invalid JSON: {exc}"]}

        try:
            plan = DesignPlan.model_validate(payload)
        except ValidationError as exc:
            return {
                "ok": False,
                "errors": [
                    f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}"
                    for err in exc.errors()
                ],
            }

        cross = plan.cross_check()
        if cross:
            return {"ok": False, "errors": cross}

        # Offline ERC-lite: a floating net (all pins on one part) is a hard
        # connectivity error; unconnected parts and undecoupled ICs are
        # advisory. Surfaced here so the planner catches them before the
        # Altium round-trip. Schema-valid plans can still carry ERC errors,
        # so a floating net flips ``ok`` to False.
        erc = check_plan_erc(plan)
        erc_payload = {
            "passed": erc.passed,
            "errors": [
                {"code": i.code, "message": i.message, "refs": list(i.refs)}
                for i in erc.errors
            ],
            "warnings": [
                {"code": i.code, "message": i.message, "refs": list(i.refs)}
                for i in erc.warnings
            ],
        }
        if not erc.passed:
            return {
                "ok": False,
                "errors": [i.message for i in erc.errors],
                "erc": erc_payload,
            }

        return {
            "ok": True,
            "summary": (
                f"Plan valid. {len(plan.parts)} parts, {len(plan.nets)} nets, "
                f"{len(plan.sheets)} sheet(s). "
                f"ERC: {len(erc.warnings)} warning(s)."
            ),
            "erc": erc_payload,
        }

    @mcp.tool()
    async def design_compute_component_value(
        kind: str,
        series: str = "E96",
        v_in: Optional[float] = None,
        v_out: Optional[float] = None,
        v_ref: Optional[float] = None,
        v_supply: Optional[float] = None,
        v_forward: Optional[float] = None,
        i_led_ma: Optional[float] = None,
        f_cutoff_hz: Optional[float] = None,
        r_ohms: Optional[float] = None,
        c_farads: Optional[float] = None,
        r_bottom_ohms: Optional[float] = None,
        value: Optional[float] = None,
        c_load_pf: Optional[float] = None,
        c_stray_pf: float = 5.0,
        v_bus: Optional[float] = None,
        c_bus_pf: Optional[float] = None,
        t_rise_ns: Optional[float] = None,
        r_top_ohms: Optional[float] = None,
        tol_pct: float = 1.0,
        gain: Optional[float] = None,
        config: str = "inverting",
        i_out_a: Optional[float] = None,
        f_sw_khz: Optional[float] = None,
        ripple_pct: float = 30.0,
        voltage: Optional[float] = None,
        i_load_a: Optional[float] = None,
        t_s: Optional[float] = None,
        v_drop: Optional[float] = None,
        v_initial: Optional[float] = None,
        v_final: Optional[float] = None,
        power_w: Optional[float] = None,
        theta_ja: Optional[float] = None,
        t_ambient: float = 25.0,
        tj_max: Optional[float] = None,
    ) -> dict[str, Any]:
        """Compute a manufacturable component value, snapped to an E-series.

        Use this instead of doing the arithmetic by hand: it applies the
        standard sizing equation, snaps to the nearest IEC 60063 preferred
        value, and reports the ACHIEVED result plus the error so you can see
        if the snap is good enough or a tighter ``series`` is needed.

        Args:
            kind: Which calculation:
              - ``"nearest"`` — snap ``value`` to the nearest preferred value.
              - ``"feedback_divider"`` — regulator FB divider
                ``v_out = v_ref*(1+Rtop/Rbot)``; needs ``v_out``, ``v_ref``;
                optional ``r_bottom_ohms`` to fix the low side.
              - ``"resistor_divider"`` — unloaded divider
                ``v_out = v_in*Rb/(Rt+Rb)``; needs ``v_in``, ``v_out``.
              - ``"led_resistor"`` — series resistor; needs ``v_supply``,
                ``v_forward``, ``i_led_ma``.
              - ``"rc_lowpass"`` — first-order RC; needs ``f_cutoff_hz`` and
                exactly one of ``r_ohms`` / ``c_farads``.
              - ``"crystal_load_caps"`` — symmetric crystal load caps; needs
                ``c_load_pf`` (datasheet CL), optional ``c_stray_pf`` (default
                5 pF per leg).
              - ``"i2c_pullup"`` — bus pull-up window (NXP UM10204); needs
                ``v_bus``, ``c_bus_pf``, ``t_rise_ns`` (1000 standard / 300
                fast / 120 fast-plus).
              - ``"divider_tolerance"`` — worst-case output window of an
                unloaded divider; needs ``v_in``, ``r_top_ohms``,
                ``r_bottom_ohms``, optional ``tol_pct`` (default 1).
              - ``"opamp_gain"`` — Rf/Rin (or Rg) for a gain stage; needs
                ``gain`` and ``config`` (``inverting`` / ``non_inverting``).
              - ``"buck_inductor"`` — buck inductor; needs ``v_in``, ``v_out``,
                ``i_out_a``, ``f_sw_khz``, optional ``ripple_pct`` (default 30).
              - ``"capacitor_energy"`` — stored energy; needs ``c_farads``,
                ``voltage``.
              - ``"holdup_cap"`` — bulk hold-up capacitance; needs ``i_load_a``,
                ``t_s`` (hold-up time), ``v_drop`` (allowed sag).
              - ``"discharge_resistor"`` — bleeder; needs ``c_farads``,
                ``v_initial``, ``v_final``, ``t_s`` (discharge time).
              - ``"junction_temp"`` — Tj = Ta + P*theta_JA; needs ``power_w``,
                ``theta_ja``, optional ``t_ambient`` (default 25).
              - ``"max_power"`` — thermal derating; needs ``tj_max``,
                ``theta_ja``, optional ``t_ambient``.
              - ``"required_theta_ja"`` — package/heatsink sizing; needs
                ``power_w``, ``tj_max``, optional ``t_ambient``.
            series: E-series name (E6/E12/E24/E48/E96). Default E96 for
                dividers/precision, pass E24 for jellybean R/C.

        Returns:
            ``{"ok": True, ...fields..., "summary": "..."}`` or
            ``{"ok": False, "error": "..."}``.
        """
        try:
            k = kind.strip().lower()
            if k == "nearest":
                if value is None:
                    return {"ok": False, "error": "nearest needs 'value'"}
                snapped = nearest_preferred(value, series)
                return {
                    "ok": True, "value": value, "snapped": snapped,
                    "series": series.upper(),
                    "error_pct": 100.0 * (snapped - value) / value,
                    "summary": f"{value:g} -> {snapped:g} ({series.upper()})",
                }
            if k == "feedback_divider":
                if v_out is None or v_ref is None:
                    return {"ok": False,
                            "error": "feedback_divider needs v_out and v_ref"}
                r = feedback_divider(v_out, v_ref, series=series,
                                     r_bottom=r_bottom_ohms)
                return _divider_payload(r, series, "feedback")
            if k == "resistor_divider":
                if v_in is None or v_out is None:
                    return {"ok": False,
                            "error": "resistor_divider needs v_in and v_out"}
                r = resistor_divider(v_in, v_out, series=series)
                return _divider_payload(r, series, "unloaded")
            if k == "led_resistor":
                if v_supply is None or v_forward is None or i_led_ma is None:
                    return {"ok": False, "error": "led_resistor needs "
                            "v_supply, v_forward, i_led_ma"}
                r = led_series_resistor(v_supply, v_forward, i_led_ma / 1000.0,
                                        series=series)
                return {
                    "ok": True, "resistor_ohms": r.resistor,
                    "current_ma": r.current_a * 1000.0,
                    "power_w": r.power_w, "error_pct": r.error_pct,
                    "series": series.upper(),
                    "summary": (f"R={r.resistor:g} ohm, I={r.current_a*1000:.2f} "
                                f"mA, P={r.power_w*1000:.1f} mW "
                                f"({r.error_pct:+.2f}%)"),
                }
            if k == "rc_lowpass":
                if f_cutoff_hz is None:
                    return {"ok": False, "error": "rc_lowpass needs f_cutoff_hz"}
                r = rc_lowpass(f_cutoff_hz, r=r_ohms, c=c_farads, series=series)
                return {
                    "ok": True, "r_ohms": r.r, "c_farads": r.c,
                    "f_cutoff_hz": r.f_cutoff, "error_pct": r.error_pct,
                    "series": series.upper(),
                    "summary": (f"R={r.r:g} ohm, C={r.c*1e9:g} nF, "
                                f"fc={r.f_cutoff:.2f} Hz ({r.error_pct:+.2f}%)"),
                }
            if k == "crystal_load_caps":
                if c_load_pf is None:
                    return {"ok": False,
                            "error": "crystal_load_caps needs c_load_pf"}
                r = crystal_load_caps(c_load_pf * 1e-12, c_stray_pf * 1e-12,
                                      series=series)
                return {
                    "ok": True, "cap_pf": r.cap * 1e12,
                    "c_load_achieved_pf": r.c_load_achieved * 1e12,
                    "c_load_target_pf": r.c_load_target * 1e12,
                    "error_pct": r.error_pct, "series": series.upper(),
                    "summary": (f"C1 = C2 = {r.cap*1e12:g} pF -> CL "
                                f"{r.c_load_achieved*1e12:.1f} pF "
                                f"({r.error_pct:+.2f}%)"),
                }
            if k == "i2c_pullup":
                if v_bus is None or c_bus_pf is None or t_rise_ns is None:
                    return {"ok": False, "error": "i2c_pullup needs v_bus, "
                            "c_bus_pf, t_rise_ns"}
                r = i2c_pullup(v_bus, c_bus_pf * 1e-12, t_rise_ns * 1e-9,
                               series=series)
                return {
                    "ok": True, "r_min_ohms": r.r_min, "r_max_ohms": r.r_max,
                    "recommended_ohms": r.recommended, "feasible": r.feasible,
                    "series": series.upper(),
                    "summary": (
                        f"R in [{r.r_min:.0f}, {r.r_max:.0f}] ohm -> "
                        f"{r.recommended:g} ohm" if r.feasible else
                        f"infeasible: no {series.upper()} value in "
                        f"[{r.r_min:.0f}, {r.r_max:.0f}] ohm (bus C too high "
                        f"for the mode)"),
                }
            if k == "divider_tolerance":
                if v_in is None or r_top_ohms is None or r_bottom_ohms is None:
                    return {"ok": False, "error": "divider_tolerance needs "
                            "v_in, r_top_ohms, r_bottom_ohms"}
                r = divider_tolerance(v_in, r_top_ohms, r_bottom_ohms,
                                      tol_pct=tol_pct)
                return {
                    "ok": True, "v_nominal": r.v_nominal, "v_min": r.v_min,
                    "v_max": r.v_max, "spread_pct": r.spread_pct,
                    "summary": (f"{r.v_nominal:.4f} V nominal, "
                                f"[{r.v_min:.4f}, {r.v_max:.4f}] V at "
                                f"{tol_pct:g}% (spread {r.spread_pct:.2f}%)"),
                }
            if k == "opamp_gain":
                if gain is None:
                    return {"ok": False, "error": "opamp_gain needs gain"}
                r = opamp_gain_resistors(gain, config=config, series=series)
                sign = "-" if r.config == "inverting" else "+"
                return {
                    "ok": True, "config": r.config,
                    "r_feedback_ohms": r.r_feedback, "r_input_ohms": r.r_input,
                    "gain": r.gain, "error_pct": r.error_pct,
                    "series": series.upper(),
                    "summary": (f"{r.config}: Rf={r.r_feedback:g} ohm, "
                                f"R{'in' if r.config=='inverting' else 'g'}="
                                f"{r.r_input:g} ohm -> gain {sign}{r.gain:.3f} "
                                f"({r.error_pct:+.2f}%)"),
                }
            if k == "buck_inductor":
                if (v_in is None or v_out is None or i_out_a is None
                        or f_sw_khz is None):
                    return {"ok": False, "error": "buck_inductor needs v_in, "
                            "v_out, i_out_a, f_sw_khz"}
                r = buck_inductor(v_in, v_out, i_out_a, f_sw_khz * 1e3,
                                  ripple_fraction=ripple_pct / 100.0,
                                  series=series)
                return {
                    "ok": True, "inductance_uh": r.inductance * 1e6,
                    "ripple_current_a": r.ripple_current_a,
                    "peak_current_a": r.peak_current_a,
                    "error_pct": r.error_pct, "series": series.upper(),
                    "summary": (f"L={r.inductance*1e6:g} uH -> ripple "
                                f"{r.ripple_current_a:.3f} A, peak "
                                f"{r.peak_current_a:.3f} A ({r.error_pct:+.2f}%)"),
                }
            if k == "capacitor_energy":
                if c_farads is None or voltage is None:
                    return {"ok": False,
                            "error": "capacitor_energy needs c_farads, voltage"}
                e = capacitor_energy(c_farads, voltage)
                return {
                    "ok": True, "energy_j": e, "charge_c": c_farads * voltage,
                    "summary": (f"{c_farads*1e6:g} uF @ {voltage:g} V stores "
                                f"{e:.4g} J ({c_farads*voltage:.4g} C)"),
                }
            if k == "holdup_cap":
                if i_load_a is None or t_s is None or v_drop is None:
                    return {"ok": False, "error": "holdup_cap needs i_load_a, "
                            "t_s, v_drop"}
                c = holdup_capacitance(i_load_a, t_s, v_drop)
                return {
                    "ok": True, "capacitance_f": c, "capacitance_uf": c * 1e6,
                    "summary": (f"hold {i_load_a:g} A for {t_s*1e3:g} ms within "
                                f"{v_drop:g} V sag -> {c*1e6:.4g} uF"),
                }
            if k == "discharge_resistor":
                if (c_farads is None or v_initial is None or v_final is None
                        or t_s is None):
                    return {"ok": False, "error": "discharge_resistor needs "
                            "c_farads, v_initial, v_final, t_s"}
                r = discharge_resistor(c_farads, v_initial, v_final, t_s)
                return {
                    "ok": True, "resistor_ohms": r,
                    "power_w": v_initial * v_initial / r,
                    "summary": (f"discharge {c_farads*1e6:g} uF "
                                f"{v_initial:g}->{v_final:g} V in {t_s:g} s -> "
                                f"{r:.4g} ohm"),
                }
            if k == "junction_temp":
                if power_w is None or theta_ja is None:
                    return {"ok": False,
                            "error": "junction_temp needs power_w, theta_ja"}
                tj = junction_temperature(power_w, theta_ja, t_ambient)
                return {
                    "ok": True, "tj_c": tj, "rise_c": tj - t_ambient,
                    "summary": (f"{power_w:g} W * {theta_ja:g} C/W + "
                                f"{t_ambient:g} C -> Tj = {tj:.1f} C"),
                }
            if k == "max_power":
                if tj_max is None or theta_ja is None:
                    return {"ok": False,
                            "error": "max_power needs tj_max, theta_ja"}
                p = max_power_dissipation(tj_max, theta_ja, t_ambient)
                return {
                    "ok": True, "power_w": p,
                    "summary": (f"({tj_max:g}-{t_ambient:g}) / {theta_ja:g} C/W "
                                f"-> max {p:.3f} W"),
                }
            if k == "required_theta_ja":
                if power_w is None or tj_max is None:
                    return {"ok": False, "error": "required_theta_ja needs "
                            "power_w, tj_max"}
                th = required_theta_ja(power_w, tj_max, t_ambient)
                return {
                    "ok": True, "theta_ja_c_per_w": th,
                    "summary": (f"({tj_max:g}-{t_ambient:g}) / {power_w:g} W -> "
                                f"need theta_JA <= {th:.1f} C/W"),
                }
            return {"ok": False, "error": f"unknown kind {kind!r}"}
        except (ValueError, ZeroDivisionError) as exc:
            return {"ok": False, "error": str(exc)}

    @mcp.tool()
    async def design_describe_circuits(
        plan_json: Union[str, dict],
    ) -> dict[str, Any]:
        """Report the electrical behaviour of each recognised sub-circuit.

        Recognises the parametric blocks in a ``DesignPlan`` (voltage / feedback
        dividers, RC low/high-pass filters, crystal load networks) and computes
        each one's characteristic from the chosen component values: a divider's
        ratio, a filter's cut-off, a crystal's load capacitance. Use it to
        verify a block does what you intended -- it catches the
        wrong-but-consistent value error (a divider of two valid resistors that
        produces the wrong ratio) that connectivity and equality checks miss.

        Most parameters are ratios / time-constants that need only the values,
        not a supply voltage, so this works on the plan alone. No Altium.

        Returns ``{"ok": True, "circuits": [{motif, parts, summary, params}]}``;
        blocks whose values are missing or unparseable are skipped.
        """
        payload = plan_json if isinstance(plan_json, dict) else None
        if payload is None:
            try:
                payload = json.loads(plan_json)
            except json.JSONDecodeError as exc:
                return {"ok": False, "error": f"invalid JSON: {exc}"}
        try:
            plan = DesignPlan.model_validate(payload)
        except ValidationError as exc:
            return {"ok": False, "error": str(exc)}
        circuits = [
            {"motif": d.motif_name, "parts": list(d.parts),
             "summary": d.summary, "params": d.params}
            for d in describe_motifs(plan)
        ]
        return {"ok": True, "circuits": circuits}

    @mcp.tool()
    async def design_suggest_diff_pair_traces(
        plan_json: Union[str, dict],
        target_ohms: float = 90.0,
        geometry: str = "microstrip_diff",
        dielectric_height_mils: float = 7.0,
        dielectric_constant: float = 4.2,
        copper_oz: float = 1.0,
        spacing_mils: float = 6.0,
    ) -> dict[str, Any]:
        """Recommend a controlled-impedance trace width for every differential
        pair in a plan.

        Detects the differential pairs (nets with role ``differential``) and
        sizes each to ``target_ohms`` (90 USB / 100 HDMI/LVDS) for the supplied
        stackup and edge-to-edge ``spacing_mils`` via the IPC-2141 impedance
        inverse -- the trace geometry for every pair in one call instead of
        identifying pairs and running ``pcb_calc_trace_width_for_impedance`` by
        hand. The stackup and target are board-level decisions you supply; pure
        Python, no Altium.

        Returns ``{"ok": True, "pairs": [{nets, endpoints, width_mils,
        spacing_mils, target_ohms, feasible}]}`` or ``{"ok": False, ...}``.
        """
        from ..design.hsd_rules import suggest_diff_pair_traces
        payload = plan_json if isinstance(plan_json, dict) else None
        if payload is None:
            try:
                payload = json.loads(plan_json)
            except json.JSONDecodeError as exc:
                return {"ok": False, "error": f"invalid JSON: {exc}"}
        try:
            plan = DesignPlan.model_validate(payload)
        except ValidationError as exc:
            return {"ok": False, "error": str(exc)}
        try:
            traces = suggest_diff_pair_traces(
                plan, target_ohms=target_ohms, geometry=geometry,
                dielectric_height_mils=dielectric_height_mils,
                dielectric_constant=dielectric_constant, copper_oz=copper_oz,
                spacing_mils=spacing_mils)
        except ValueError as exc:
            return {"ok": False, "error": str(exc)}
        return {
            "ok": True,
            "pairs": [
                {"nets": list(t.nets), "endpoints": list(t.endpoints),
                 "width_mils": t.width_mils, "spacing_mils": t.spacing_mils,
                 "target_ohms": t.target_ohms, "feasible": t.feasible}
                for t in traces
            ],
        }

    @mcp.tool()
    async def design_review_plan(
        plan_json: Union[str, dict],
    ) -> dict[str, Any]:
        """One-call offline pre-flight: bundle every plan-level analysis.

        Runs, on the plan alone (no Altium), the checks and reports the agent
        would otherwise call one by one, so the planner can vet a design in a
        single step before emit:

          - ``stats``: part counts by kind, IC / passive split, power & ground
            rails, average net degree, the widest signal net (a routing
            hotspot).
          - ``erc``: the ERC-lite report (floating nets, unconnected parts,
            missing decoupling, malformed values, matched-value mismatches);
            ``passed`` is False only on a hard error.
          - ``circuits``: the computed behaviour of each recognised block
            (divider ratios, filter cut-offs, crystal load).
          - ``placement_constraints``: the match / keepout groups that would be
            auto-derived for ``pcb_plan_placement(plan_json=...)``.
          - ``net_classes``: each net's class (power / ground / differential /
            clock / analog / ... / signal) grouped for PCB net-class setup.

        Returns ``{"ok": True, "passed": <erc.passed>, ...sections...}`` or
        ``{"ok": False, "errors"/"error": ...}`` on a schema problem.
        """
        if isinstance(plan_json, dict):
            payload = plan_json
        else:
            try:
                payload = json.loads(plan_json)
            except json.JSONDecodeError as exc:
                return {"ok": False, "error": f"invalid JSON: {exc}"}
        try:
            plan = DesignPlan.model_validate(payload)
        except ValidationError as exc:
            return {"ok": False, "errors": [
                f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}"
                for e in exc.errors()]}

        stats = summarize_plan(plan)
        erc = check_plan_erc(plan)
        constraints = infer_placement_constraints(plan)
        return {
            "ok": True,
            "passed": erc.passed,
            "stats": {
                "part_count": stats.part_count,
                "net_count": stats.net_count,
                "parts_by_kind": stats.parts_by_kind,
                "ic_count": stats.ic_count,
                "passive_count": stats.passive_count,
                "power_rails": list(stats.power_rails),
                "ground_nets": list(stats.ground_nets),
                "avg_net_degree": round(stats.avg_net_degree, 2),
                "highest_fanout_signal": list(stats.highest_fanout_signal)
                if stats.highest_fanout_signal else None,
            },
            "erc": {
                "passed": erc.passed,
                "errors": [{"code": i.code, "message": i.message,
                            "refs": list(i.refs)} for i in erc.errors],
                "warnings": [{"code": i.code, "message": i.message,
                              "refs": list(i.refs)} for i in erc.warnings],
            },
            "circuits": [
                {"motif": d.motif_name, "parts": list(d.parts),
                 "summary": d.summary, "params": d.params}
                for d in describe_motifs(plan)
            ],
            "placement_constraints": {
                "match_groups": constraints.match_groups,
                "keepout_groups": constraints.keepout_groups,
            },
            "net_classes": {
                cls: list(nets)
                for cls, nets in classify_nets(plan).groups.items()
            },
        }

    @mcp.tool()
    async def design_layout_schematic(
        plan_json: Union[str, dict],
        sheet: str = "main",
        grid_mils: int = 100,
        fr_iterations: int = 80,
        placement_hints: Optional[dict[str, dict[str, int]]] = None,
        render_png: Optional[str] = None,
    ) -> dict[str, Any]:
        """Compute a full schematic layout for a DesignPlan, as pure data.

        Runs the deterministic layout engine over the supplied plan and
        returns the result WITHOUT touching Altium: per-symbol position
        and rotation, the per-net representation decision
        (wire / net_label / power_port), orthogonal wire routes for the
        wire-tier nets, power-port / net-label glyph placements, junction
        points, and an aesthetic score breakdown. The whole computation
        is offline, so no project needs to be open and no Altium session
        is required.

        Use this to evaluate or compare layouts cheaply. The returned shape
        matches the ``sch_place_*`` tool surface so a caller can drive an
        emit directly from this payload.

        IMPORTANT -- this is a DIFFERENT engine from what executes.
        ``design_layout_schematic`` runs the standalone deterministic
        neat-layout engine (``schematic_layout.py``). ``design_execute_plan``
        does NOT use it: it runs the canvas pipeline (Sugiyama placement +
        motif/prior overlays), which places and routes differently. So the
        ``score`` and ``placements`` here are NOT guaranteed to match what
        gets emitted. For an execution-accurate preview (same placement the
        emit will use, same score), use ``design_preview_plan`` -- it shares
        the canvas pipeline with ``design_execute_plan``. Reach for this tool
        when you specifically want the neat engine's crossing-minimal routing
        as a standalone artifact.

        Args:
            plan_json: A DesignPlan as a JSON string or a JSON object/dict.
            sheet: Sheet name to lay out (default ``"main"``).
            grid_mils: Snap grid for final coordinates (default 100).
            fr_iterations: Force-directed relaxation budget (default 80).
                Higher spreads a dense sheet more, at more compute.
            placement_hints: Optional ``{refdes: {"x", "y", "rotation"}}``
                pinned positions that override the computed placement for
                those parts; everything else flows through the algorithm.
            render_png: Optional file path. When set, also render a preview
                image of the computed layout to that path and return it as
                ``preview_png`` (offline, matplotlib). Rendering never breaks
                the data result; failures surface as ``preview_error``.

        Returns:
            Dict with:
              - ``ok``: bool
              - ``sheet``: the sheet laid out
              - ``summary``: one-line plain-language verdict (crossings,
                bends, part count, net representation mix) -- read first
              - ``placements``: per-symbol ``{designator, x, y, rotation}``
                (mils / degrees)
              - ``net_representation``: ``{net_name: kind}`` where kind is
                ``wire`` / ``net_label`` / ``power_port``
              - ``wires``: ``[{x1, y1, x2, y2}]`` route segments
              - ``net_labels`` / ``power_ports``: glyph placements
              - ``junctions``: ``[{x, y}]``
              - ``score``: aesthetic breakdown (crossings, bends,
                alignment, aspect, length, total)
              - ``notes``: plan cross-check + layout notes
            On a bad plan: ``{"ok": False, "errors": [...]}``.
        """
        if isinstance(plan_json, dict):
            payload = plan_json
        else:
            try:
                payload = json.loads(plan_json)
            except json.JSONDecodeError as exc:
                return {"ok": False, "errors": [f"invalid JSON: {exc}"]}

        try:
            plan = DesignPlan.model_validate(payload)
        except ValidationError as exc:
            return {
                "ok": False,
                "errors": [
                    f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}"
                    for err in exc.errors()
                ],
            }

        cross = plan.cross_check()
        if cross:
            return {"ok": False, "errors": cross}

        layout = compute_schematic_layout(
            plan,
            sheet=sheet,
            grid_mils=int(grid_mils),
            fr_iterations=int(fr_iterations),
            placement_hints=placement_hints,
        )
        flat = to_executor_payload(layout)

        net_representation = {
            name: dec.kind for name, dec in layout.decisions.items()
        }
        placements = [
            {
                "designator": p["designator"],
                "x": p["x"],
                "y": p["y"],
                "rotation": p["rotation"],
            }
            for p in flat["placements"]
        ]
        notes = list(layout.notes)
        notes.append(
            "engine=neat (schematic_layout.py); this is NOT the execution "
            "engine. design_execute_plan uses the canvas pipeline and may "
            "place/route differently. Use design_preview_plan for an "
            "execution-accurate layout and score."
        )
        result = {
            "ok": True,
            "sheet": flat["sheet"],
            "engine": "neat",
            "execution_accurate": False,
            "summary": _schematic_summary(
                flat["score"], net_representation, len(placements)),
            "placements": placements,
            "net_representation": net_representation,
            "wires": flat["wires"],
            "net_labels": flat["net_labels"],
            "power_ports": flat["power_ports"],
            "junctions": flat["junctions"],
            "score": flat["score"],
            "notes": notes,
        }
        if render_png:
            try:
                from pathlib import Path
                from ..design.illustrate import schematic_png
                out = Path(render_png)
                out.parent.mkdir(parents=True, exist_ok=True)
                schematic_png(layout, str(out), title=f"schematic: {sheet}")
                result["preview_png"] = str(out)
            except Exception as exc:  # rendering must never break the data path
                result["preview_error"] = str(exc)
        return result

    @mcp.tool()
    async def design_suggest_partition(
        plan_json: Union[str, dict],
        n_groups: int = 2,
        max_fanout: int = 8,
    ) -> dict[str, Any]:
        """Suggest how to split a design into balanced functional groups.

        Computes a min-cut partition (Kernighan-Lin style) of the plan's
        components into ``n_groups`` balanced groups that MINIMISE the number
        of nets crossing between groups -- so each group is internally
        well-connected and few signals span the boundary. Use it to group a
        PCB into functional ROOMS, or to decide how to break a design with
        SEPARABLE blocks across schematic sheets.

        Note: a HUB-centric design (one IC fanning out to many peripherals)
        does not separate cleanly -- the hub is connected to everything, so
        the cut stays high and per-sheet density barely drops. Partitioning
        helps when the netlist has genuinely distinct functional blocks; read
        ``cut_nets`` (low = clean) and ``group_sizes`` to judge before acting.

        Power/ground rails (nets touching more than ``max_fanout`` parts) are
        excluded from the connectivity graph -- they route as planes and
        connect nearly everything, so the split follows the SIGNAL structure.

        Pure data; touches nothing. Assign the returned groups to part
        ``sheet`` (or ``zone``) fields yourself if you act on the suggestion.

        Args:
            plan_json: A DesignPlan (dict or JSON string).
            n_groups: Number of groups to split into (default 2).
            max_fanout: Nets above this pin count are treated as rails and
                ignored for partitioning (default 8).

        Returns:
            ``{ok, n_groups, groups: {idx: [refdes...]}, cut_nets,
            boundary_nets: [names...], group_sizes, summary}``. ``cut_nets``
            is how many nets cross the boundary (lower is cleaner);
            ``boundary_nets`` names them -- those become cross-sheet labels or
            off-sheet connectors if you split there.
        """
        if isinstance(plan_json, dict):
            payload = plan_json
        else:
            try:
                payload = json.loads(plan_json)
            except json.JSONDecodeError as exc:
                return {"ok": False, "errors": [f"invalid JSON: {exc}"]}
        try:
            plan = DesignPlan.model_validate(payload)
        except ValidationError as exc:
            return {"ok": False, "errors": [
                f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}"
                for err in exc.errors()]}

        from ..design.partition import partition_netlist
        refdes = [p.refdes for p in plan.parts]
        nets = [[pr.refdes for pr in n.pins] for n in plan.nets]
        res = partition_netlist(refdes, nets, n_groups=int(n_groups),
                                max_fanout=int(max_fanout))
        groups: dict[str, list[str]] = {}
        for r, g in res["group_of"].items():
            groups.setdefault(str(g), []).append(r)
        for g in groups:
            groups[g].sort()
        # Named nets whose pins span more than one group -- what a split there
        # would have to carry across the boundary (labels / off-sheet conns).
        group_of = res["group_of"]
        boundary_nets = sorted(
            n.name for n in plan.nets
            if len({group_of.get(pr.refdes) for pr in n.pins
                    if pr.refdes in group_of} - {None}) > 1
        )
        summary = (
            f"{res['n_groups']}-way split, group sizes {res['group_sizes']}, "
            f"{res['cut_nets']} net(s) cross the boundary (lower is cleaner)."
        )
        return {
            "ok": True,
            "n_groups": res["n_groups"],
            "groups": groups,
            "cut_nets": res["cut_nets"],
            "boundary_nets": boundary_nets,
            "group_sizes": res["group_sizes"],
            "summary": summary,
        }

    @mcp.tool()
    async def design_execute_plan(
        plan_json: Union[str, dict],
        project_path: str,
        use_canvas: bool = True,
        placement_hints: Optional[dict[str, dict[str, int]]] = None,
    ) -> dict[str, Any]:
        """Instantiate a DesignPlan in Altium.

        Two execution paths:

        - ``use_canvas=True`` (default): the new canvas-based pipeline.
          Plan -> SymbolExtractor -> SchematicCanvas (all in Python) ->
          one-shot batched emit to Altium. Layout decisions are made
          before any IPC; an SVG preview is written next to the project
          file so you can sanity-check the schematic without opening it.

        - ``use_canvas=False``: the legacy executor that interleaves
          layout with Altium IPC. Kept as a fallback while the new path
          stabilises.

        Both halt early if the plan contains any needs_creation parts.
        Resolve those first by either picking an existing-lib equivalent
        or branching into a library-authoring sub-task.

        Args:
            plan_json: Either a DesignPlan JSON string, or the DesignPlan
                as a JSON object/dict. The MCP framework auto-deserializes
                JSON-object literals to dicts before the tool sees them,
                so both shapes are accepted.
            project_path: Absolute path to the target .PrjPcb. Created
                if it does not exist.
            use_canvas: Pick the execution path. Default ``True`` runs
                the new canvas pipeline; pass ``False`` to fall back to
                the legacy executor.

        Args (continued):
            placement_hints: Optional ``{refdes: {"x": int, "y": int,
                "rotation": int}}`` partial anchors. Hinted refdes pin
                to the supplied position; others run through the
                algorithmic placement (Sugiyama + multi-try scoring).
                Used by the agent-in-loop refinement workflow:
                  1. Run ``design_preview_plan`` -> see SVG + score.
                  2. If layout is bad, identify specific refdes that
                     should sit elsewhere; build hints dict.
                  3. Call ``design_preview_plan`` again with hints ->
                     iterate until score is acceptable.
                  4. Call ``design_execute_plan`` with the same hints
                     to emit the refined layout.

        Returns:
            Result dict with ok / project_path / sheets_touched / placed
            (list of placements) / failures / needs_creation / notes.
            Canvas-path additions: ``canvas`` (the SchematicCanvas dict
            snapshot) and ``preview_svg_path`` (where the SVG was written).
        """
        if use_canvas:
            return execute_plan_via_canvas_from_json(
                plan_json, project_path,
                placement_hints=placement_hints,
            )
        if isinstance(plan_json, dict):
            plan_json = json.dumps(plan_json)
        result = execute_plan_from_json(plan_json, project_path)
        return result.to_dict()

    @mcp.tool()
    async def design_learn_from_layout(
        project_path: str,
    ) -> dict[str, Any]:
        """Capture your placement edits as training data.

        Workflow:
        1. Run ``design_execute_plan`` (canvas path) — it writes a
           ``<project>.canvas.json`` snapshot alongside the .PrjPcb.
        2. Open the schematic in Altium, drag components to taste, save.
        3. Call this tool. It reads the snapshot + current Altium
           positions, diffs them, and appends one row per moved component
           to ``%USERPROFILE%\\.eda-agent\\placement_edits.jsonl``.

        Each row carries: design_id, refdes, part_role, part_lib_ref,
        anchor_refdes, anchor_role, anchor_lib_ref, dx_mils, dy_mils,
        rot_delta_deg, design_size, ts.

        Anchor = highest-pin-count netlist neighbor on a non-power /
        non-ground net (or spatial-nearest fallback). Captures the
        relational placement preference, not just "I moved this 200 mils
        right".

        The accumulating log feeds ``placement_priors.json`` (the
        relative-anchor priors used by the pipeline's placement pass).

        Args:
            project_path: Same project path you passed to
                ``design_execute_plan``.

        Returns:
            Dict with ok, rows_appended, refdes_moved, refdes_unchanged,
            log_path, notes.
        """
        return learn_from_layout(project_path)

    @mcp.tool()
    async def design_preview_plan(
        plan_json: Union[str, dict],
        output_svg_path: Optional[str] = None,
        placement_hints: Optional[dict[str, dict[str, int]]] = None,
    ) -> dict[str, Any]:
        """Render a DesignPlan to SVG without emitting to Altium.

        Same pipeline as ``design_execute_plan(use_canvas=True)`` minus
        the place + wire + save IPC pass. Symbol extraction still
        consults Altium on cache miss (it has to read the SchLib), but
        no project is created and nothing is placed. Use this to
        sanity-check a layout cheaply before committing to a full emit.

        Args:
            plan_json: DesignPlan as JSON string or dict.
            output_svg_path: Where to write the SVG. Default:
                ``<repo>/.symbol_cache/preview.svg``.

        Returns:
            Dict with ok / preview_svg_path / canvas (snapshot) /
            counts {placements, wires, labels, power_ports, junctions} /
            notes / failures.
        """
        result = preview_plan_from_json(
            plan_json, output_svg_path, placement_hints=placement_hints,
        )
        # Cache the most recent plan input for the dashboard's Plan tab.
        try:
            from ..config import get_config
            cache_path = get_config().workspace_dir / "plan.json"
            payload = plan_json if isinstance(plan_json, dict) else json.loads(plan_json)
            cache_path.write_text(
                json.dumps({"plan": payload, "preview": result}, indent=2),
                encoding="utf-8",
            )
        except (OSError, json.JSONDecodeError, TypeError):
            pass
        return result

    @mcp.tool()
    async def design_audit_schematic(
        project_path: Optional[str] = None,
        cluster_radius_mils: int = 600,
    ) -> dict[str, Any]:
        """Structured visual/layout audit of the active schematic.

        Call AFTER ``design.execute_plan`` and BEFORE ``design.validate``
        so layout problems are fixed first; ERC violations downstream are
        less noisy. Detects three classes of issue, each with enough
        geometry for the planner to compute a corrective move:

          * overlaps        - pairs of components whose bboxes intersect
          * wire_crossings  - wire segments that cross a component body
                              (excluding pin-to-pin connections)
          * stacked_ports   - 3+ power/ground glyphs of the same net
                              huddled inside ``cluster_radius_mils``

        Args:
            project_path: Optional .PrjPcb path. None uses the focused
                project.
            cluster_radius_mils: Radius for stacked-port clustering.
                Default 600 mils.

        Returns:
            SchematicAuditReport dict: ``{ok, project_path, overlaps[],
            wire_crossings[], stacked_ports[], notes[]}``.
            ``ok=True`` iff every list is empty.
        """
        report = run_audit_schematic(
            project_path,
            cluster_radius_mils=cluster_radius_mils,
        )
        return report.to_dict()

    @mcp.tool()
    async def design_validate(project_path: Optional[str] = None) -> dict[str, Any]:
        """ERC + connectivity sanity report on the focused project.

        Runs run_erc, project.get_messages, and get_unconnected_pins,
        then bundles the output into a structured ValidationReport that
        the planner can read and respond to. Schematic-only in this
        slice, PCB validation is a separate later slice.

        Args:
            project_path: Optional absolute path to a .PrjPcb. If omitted,
                uses the focused project.

        Returns:
            ValidationReport dict: ``{passed, project_path, errors,
            warnings, notes}`` where each error/warning is an Issue with
            ``{category, severity, text, refdes, pin, net, sheet}``.
        """
        report = run_validate(project_path)
        return report.to_dict()

    @mcp.tool()
    async def design_validate_requirement(
        requirement: dict,
    ) -> dict[str, Any]:
        """Validate a structured DesignRequirement before planning starts.

        Stage 1 of the autonomous flow (requirement capture & architecture,
        reference/autonomy-roadmap.md): capture what the board must do as a
        ``DesignRequirement`` dict, run this gate, and only move on to part
        selection / DesignPlan construction when it returns ok. Every fact
        the requirement does NOT state goes into ``open_questions`` as a
        question for the user -- it is never guessed -- and validation fails
        while any question remains unresolved.

        Checks beyond the schema: unresolved open questions, no outputs, no
        power source, inverted temperature / IO-voltage ranges, comms IO
        without a protocol, and supply rails or power outputs whose
        magnitude exceeds every stated power input (a boost / inverting
        stage the user must confirm). Pure Python, no Altium.

        Args:
            requirement: DesignRequirement as a JSON object/dict. Units are
                SI with the unit in the field name (``voltage_v``,
                ``current_a``, ``temp_min_c``); mechanical dimensions are
                MILLIMETRES (``board_size_mm``, ``height_max_mm``).

        Returns:
            ``{"ok": True, "issues": [], "summary": "..."}`` when the
            requirement is planning-ready (``summary`` is the labelled-line
            block to embed in ``DesignPlan.summary``), or
            ``{"ok": False, "issues": [...]}`` / ``{"ok": False,
            "errors": [...]}`` (schema problems) listing what to resolve.
        """
        try:
            req = DesignRequirement.model_validate(requirement)
        except ValidationError as exc:
            return {
                "ok": False,
                "errors": [
                    f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}"
                    for err in exc.errors()
                ],
            }
        result = validate_requirement(req)
        result["summary"] = summarize_requirement(req)
        return result

    @mcp.tool()
    async def design_load_fab_profile(profile: dict) -> dict[str, Any]:
        """Validate a fab capability profile and echo the normalized form.

        Stage 8 of the autonomous flow (rules & stackup,
        reference/autonomy-roadmap.md): before synthesizing design rules,
        the fab's published limits are captured as a ``FabProfile`` dict --
        transcribed from the fab's capability page (cite it in ``source``),
        NEVER recalled from memory. This tool is the schema gate: it
        validates the dict (all dimensions MILS, copper weight oz/ft^2,
        stackups with copper outer layers and no adjacent copper plies) and
        returns the normalized profile for ``design_synthesize_rules``.

        Args:
            profile: FabProfile as a JSON object/dict: ``name``, optional
                ``source`` citation, ``copper_layer_counts``, the seven
                ``min_*_mils`` floors, and optional ``stackups``.

        Returns:
            ``{"ok": True, "profile": {...}, "stackups": [names],
            "summary": "..."}`` or ``{"ok": False, "reason": "..."}``.
        """
        loaded = load_fab_profile(profile)
        if not loaded["ok"]:
            return loaded
        prof = loaded["profile"]
        return {
            "ok": True,
            "profile": prof.model_dump(),
            "stackups": [s.name for s in prof.stackups],
            "summary": (
                f"{prof.name}: {len(prof.stackups)} stackup(s), copper "
                f"layer counts {prof.copper_layer_counts}, min track "
                f"{prof.min_track_mils:g} / gap {prof.min_gap_mils:g} / "
                f"drill {prof.min_drill_mils:g} mils."
            ),
        }

    @mcp.tool()
    async def design_synthesize_rules(
        profile: dict,
        plan_json: Union[str, dict] = "",
        net_class_map: Optional[dict] = None,
        options: Optional[dict] = None,
    ) -> dict[str, Any]:
        """Synthesize PCB design rules + stackup ops from a fab profile.

        Stage 8 of the autonomous flow (rules & stackup,
        reference/autonomy-roadmap.md): turn the validated fab profile, the
        plan's net classes, and a few board-level targets into the concrete
        ``pcb_create_design_rule`` and ``pcb_modify_layer`` parameter dicts,
        dispatched verbatim after ``pcb_create_net_class`` creates classes
        named after the synthesized groups. Every number traces to a
        profile field or a verified calculator (IPC-2221 width inverse,
        IPC-2141 impedance inverse); a rule whose inputs are missing is
        skipped with a note, never guessed. Pure Python, no Altium.

        Args:
            profile: FabProfile as a dict (see ``design_load_fab_profile``).
            plan_json: Optional DesignPlan (JSON string or dict). When given
                and ``net_class_map`` is not, net classes are derived from
                the plan (flags + net roles, naming-agnostic).
            net_class_map: Optional explicit ``{net_name: class}`` map;
                takes precedence over ``plan_json`` derivation.
            options: Optional synthesis targets: ``stackup`` (name, default
                first), ``class_current_a`` ({class: amps} -> per-class
                width rules), ``delta_t_c``, ``track_margin``, ``layer``,
                ``copper_oz``, ``geometry``, ``diff_pair_target_ohms``
                (required for differential rules),
                ``diff_pair_spacing_mils``.

        Returns:
            ``{"ok": True, "rules": [...], "stackup_ops": [...],
            "notes": [...], "stackup": name|None, "net_classes": {...}}``
            -- rule values are INTEGER MILS -- or
            ``{"ok": False, "reason": "..."}``.
        """
        ncm: dict = {}
        if net_class_map is not None:
            ncm = net_class_map
        elif plan_json:
            payload = plan_json if isinstance(plan_json, dict) else None
            if payload is None:
                try:
                    payload = json.loads(plan_json)
                except json.JSONDecodeError as exc:
                    return {"ok": False, "reason": f"invalid plan JSON: {exc}"}
            try:
                plan = DesignPlan.model_validate(payload)
            except ValidationError as exc:
                return {"ok": False, "reason": f"invalid plan: {exc}"}
            ncm = classify_nets(plan).by_net

        result = synthesize_rules(profile, ncm, options)
        if not result["ok"]:
            return result
        result["net_classes"] = ncm
        return result

    @mcp.tool()
    async def design_plan_hierarchy(
        plan_json: Union[str, dict],
        max_parts_per_sheet: int = 20,
    ) -> dict[str, Any]:
        """Propose a multi-sheet hierarchy for a dense DesignPlan.

        Stage 6 of the autonomous flow (schematic emit,
        reference/autonomy-roadmap.md): a plan past ~20 parts stops fitting
        one readable sheet and dense single sheets are the known short-risk
        regime. This tool partitions the parts by signal connectivity
        (min-cut, zones kept atomic), names each child sheet from its
        dominant zone role, derives the inter-sheet ports from the signal
        nets the cut severs (power/ground rails are continuous through
        power ports and never become sheet entries), and emits the
        top-sheet op list in the exact parameter shapes of
        ``sch_place_sheet_symbol`` / ``sch_place_sheet_entry`` /
        ``sch_generate_toc``. Apply the result to the plan with
        ``design_apply_hierarchy`` before ``design_execute_plan``.
        Deterministic; pure Python, no Altium.

        Args:
            plan_json: DesignPlan as a JSON string or dict.
            max_parts_per_sheet: Split threshold (default 20). At or below
                it the plan stays single-sheet (``split=False``).

        Returns:
            ``{"ok": True, "split": bool, "top_sheet": str, "sheets":
            [{name, refdes, zones, part_count}], "ports": [{net,
            from_sheet, to_sheet, io_type}], "top_sheet_ops": [{tool,
            params}], "cut_nets": int}`` (op coordinates are MILS) or
            ``{"ok": False, "reason": "..."}``.
        """
        payload = plan_json if isinstance(plan_json, dict) else None
        if payload is None:
            try:
                payload = json.loads(plan_json)
            except json.JSONDecodeError as exc:
                return {"ok": False, "reason": f"invalid plan JSON: {exc}"}
        return plan_hierarchy(payload, max_parts_per_sheet=max_parts_per_sheet)

    @mcp.tool()
    async def design_apply_hierarchy(
        plan_json: Union[str, dict],
        hierarchy: dict,
    ) -> dict[str, Any]:
        """Rewrite a DesignPlan onto the sheets a hierarchy proposes.

        Stage 6 of the autonomous flow (schematic emit,
        reference/autonomy-roadmap.md), the second half of the hierarchy
        step: take the result of ``design_plan_hierarchy`` and produce a
        NEW plan with ``sheets`` = [top sheet, *child sheets], every
        part's ``sheet`` re-homed per the hierarchy, and every zone moved
        with its parts (part-less zones park on the top sheet). The input
        plan is never mutated; a non-split hierarchy returns the plan
        unchanged. Feed the returned plan to ``design_validate_plan`` and
        then ``design_execute_plan``; emit the hierarchy's
        ``top_sheet_ops`` separately to draw the top sheet. Pure Python.

        Args:
            plan_json: DesignPlan as a JSON string or dict.
            hierarchy: The dict returned by ``design_plan_hierarchy``.

        Returns:
            ``{"ok": True, "plan": {...rewritten DesignPlan...},
            "sheets": [names], "summary": "..."}`` or
            ``{"ok": False, "reason": "..."}`` on a malformed plan or
            hierarchy.
        """
        payload = plan_json if isinstance(plan_json, dict) else None
        if payload is None:
            try:
                payload = json.loads(plan_json)
            except json.JSONDecodeError as exc:
                return {"ok": False, "reason": f"invalid plan JSON: {exc}"}
        try:
            new_plan = apply_hierarchy(payload, hierarchy)
        except ValidationError as exc:
            return {"ok": False, "reason": f"invalid plan: {exc}"}
        except ValueError as exc:
            return {"ok": False, "reason": str(exc)}
        sheet_names = [s.name for s in new_plan.sheets]
        per_sheet = {
            name: sum(1 for p in new_plan.parts if p.sheet == name)
            for name in sheet_names
        }
        return {
            "ok": True,
            "plan": new_plan.model_dump(mode="json"),
            "sheets": sheet_names,
            "summary": (
                f"{len(new_plan.parts)} part(s) across "
                f"{len(sheet_names)} sheet(s): "
                + ", ".join(f"{n}={per_sheet[n]}" for n in sheet_names)
                + "."
            ),
        }
