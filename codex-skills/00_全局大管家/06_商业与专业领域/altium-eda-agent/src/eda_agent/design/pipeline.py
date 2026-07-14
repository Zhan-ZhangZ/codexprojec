# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 George Saliba <george.saliba@salitronic.com>
"""Plan -> SchematicCanvas, pure Python.

The pipeline takes a validated DesignPlan plus an extracted symbol library
and produces a fully populated SchematicCanvas: components placed, wires
routed, junctions detected, net labels positioned, power ports placed.
Zero Altium round-trips during layout. The only Altium contact this
module makes is via the SymbolExtractor on a cache miss; everything
downstream is pure data.

The downstream AltiumEmitter (design.emitter) takes the populated canvas
and writes it to a project + sheet in one batched IPC pass.

Pipeline stages, in order:

1. Symbol extraction (once per unique (lib_path, lib_ref)).
2. Placement: compute_layout(plan) -> list[PlacedPart].
3. Canvas construction: PlacedParts + SymbolModels -> SymbolInstances.
4. Wiring per net (block-local vs cross-block):
   a. Compute world stub endpoints from canvas.pin_world().
   b. Two-pass: collect every net's stub-ends, then route each net
      treating other-net stub-ends as point obstacles.
   c. Power/ground nets get port clusters; block-local signal nets get
      wires; cross-block signal nets get labels.
5. Junction detection on the assembled wire list.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Optional

from eda_agent.design.canvas import (
    POWER_RAIL_CLUSTER_RADIUS_MILS,
    Junction,
    NetLabel,
    PowerPort,
    SchematicCanvas,
    Sheet,
    SymbolInstance,
    WireSegment,
)
from eda_agent.design._wiring import (
    _bom_lookup,
    _cross_net_meeting_counts,
    _detect_junctions,
    _ground_style,
    _is_ground_net,
    _is_power_net,
    _net_representation,
    _part_parameters,
    _power_port_orientation,
)
from eda_agent.design.composer import compose_layout
from eda_agent.design.force_directed import _hard_shove_pass
from eda_agent.design.layout import compute_layout
from eda_agent.design.plan import DesignPlan, Net, PartStatus
from eda_agent.design.priors import (
    apply_placement_priors,
    load_priors,
    resnap_crystal_clusters,
    resnap_motif_clusters,
)
from eda_agent.design.quality import LayoutScore, score_canvas
from eda_agent.design.router import (
    _pin_direction_vector,
    _route_l_path,
    _route_signal_pins,
    _stub_endpoints,
)
from eda_agent.design.symbols import SymbolExtractor, SymbolModel

logger = logging.getLogger("eda_agent.design.pipeline")

# Pin-aware force-directed attractor-stiffness sweep. build_best builds + scores
# the FD layout at each value and keeps the lowest, because the score-vs-K
# landscape is chaotic and the best value varies per board. Dense by default
# (offline, ~50 ms/eval); the test conftest patches it down for speed.
_FD_K_SWEEP: tuple = tuple(round(0.02 + i * (0.28 / 99), 4) for i in range(100))


def _placement_pass(plan, result):  # type: ignore[no-untyped-def]
    """Run motif composer + Sugiyama-fallback placement.

    Three-layer placement strategy:

    1. ``compose_layout(plan)`` runs Sugiyama first as a baseline,
       then overlays motif-driven positions for parts matched by the
       motif catalogue (bypass cap, voltage divider, fb_divider, ...).
       Parts unmatched by any motif keep their Sugiyama position.
    2. The pipeline's downstream ``apply_placement_priors`` pass adds
       per-role-pair nudges on top (single-part canonical offsets like
       "vcc_decoup goes 400 mils above its IC").
    3. Wiring + port-routing then sees a sensible placement and
       produces clean schematic output.
    """
    composer_result = compose_layout(plan)
    if composer_result.motif_matches:
        result.notes.append(PipelineNote(
            severity="info",
            text=(
                f"composer: {len(composer_result.motif_matches)} motif "
                f"matches ({', '.join(m.motif_name for m in composer_result.motif_matches)}); "
                f"{len(composer_result.motif_parts)} parts placed by motif, "
                f"{len(composer_result.fallback_parts)} parts via Sugiyama fallback"
            ),
        ))
    return composer_result.placements


@dataclass
class PipelineNote:
    """One human-readable note from the pipeline run.

    ``refdes`` carries the affected part as structured data when the note
    is about a specific part (e.g. a needs_creation skip), so callers read
    it directly instead of re-parsing ``text`` -- formatted text is for
    humans, not a data channel.
    """

    severity: str  # "info" | "warning" | "error"
    text: str
    refdes: Optional[str] = None


@dataclass
class PipelineResult:
    """Output of `build_canvas_from_plan`.

    The canvas is what the emitter consumes. Notes surface
    soft-failures (e.g. a plan part with status=needs_creation that the
    pipeline skipped) so the caller can decide whether to proceed to
    emit or stop. Failures are hard problems that must be addressed
    before emit (missing symbol, pin id mismatch, etc.).

    ``parameter_stamps`` is the {refdes: {param_name: value}} dict the
    emitter consumes to bind Value / Manufacturer / MPN / Footprint /
    Datasheet on each placed instance. Derived from the plan's Part
    fields (Part fields win over BomLine fallback).
    """

    canvas: SchematicCanvas = field(default_factory=SchematicCanvas)
    notes: list[PipelineNote] = field(default_factory=list)
    failures: list[PipelineNote] = field(default_factory=list)
    parameter_stamps: dict[str, dict[str, str]] = field(default_factory=dict)
    placement_count: int = 0
    wire_count: int = 0
    label_count: int = 0
    power_port_count: int = 0
    junction_count: int = 0
    # Nets that WOULD have been wired but were demoted to net-labels because
    # wiring them at this placement would short on another net. A pure
    # placement-quality signal (connectivity is preserved either way): a layout
    # that needs FEWER of these is more readable, so best-of prefers it over a
    # lower-wirelength variant that resorts to more labels.
    forced_label_count: int = 0

    @property
    def ok(self) -> bool:
        return not self.failures


def build_canvas_from_plan(
    plan: DesignPlan,
    extractor: SymbolExtractor,
    *,
    layout_overrides: Optional[dict[str, Any]] = None,
    placement_hints: Optional[dict[str, dict[str, int]]] = None,
    port_hints: Optional[dict[str, dict[str, int]]] = None,
    strict_shorts: bool = True,
) -> PipelineResult:
    """Run the full plan -> canvas pipeline.

    All inputs and outputs are pure data; this function does not touch
    Altium except indirectly via the extractor (which caches anyway).

    ``layout_overrides``: optional ``{refdes: PlacedPart}`` mapping that
    fully replaces compute_layout's output for the listed refdes. Lets
    the multi-try iterator ``build_best_canvas_from_plan`` reuse this
    entry point with alternative placements.

    ``placement_hints``: optional ``{refdes: {"x": int, "y": int,
    "rotation": int}}`` partial overrides applied AFTER compute_layout
    runs. Used by the agent-in-loop refinement workflow: the agent
    reads the SVG, decides a few specific refdes should be anchored
    somewhere different, and passes the deltas without having to
    construct full PlacedPart objects. Non-hinted refdes still get the
    algorithmic placement.

    ``strict_shorts``: when True (default), routing shorts produce
    hard failures (``result.ok = False``) so the canvas never reaches
    Altium emit. When False, shorts are reported as WARNINGS instead
    of failures -- used by pairwise vote generation so bad layouts
    can be shown to the user (so they can vote them down) rather than
    hidden. Emit-to-Altium paths always use strict=True.
    """
    result = PipelineResult()

    # 1. Extract symbols. Skip needs_creation parts up front -- they
    # can't be placed and the planner is expected to resolve them.
    refs: list[tuple[str, str]] = []
    placeable_refdes: set[str] = set()
    for part in plan.parts:
        if part.status == PartStatus.NEEDS_CREATION:
            result.notes.append(PipelineNote(
                severity="warning",
                text=(
                    f"skipping {part.refdes}: status=needs_creation "
                    f"(lib_ref={part.lib_ref!r})"
                ),
                refdes=part.refdes,
            ))
            continue
        if not part.lib_path:
            result.failures.append(PipelineNote(
                severity="error",
                text=(
                    f"part {part.refdes} has status=existing but no "
                    f"lib_path; cannot extract symbol"
                ),
            ))
            continue
        refs.append((part.lib_path, part.lib_ref))
        placeable_refdes.add(part.refdes)
    symbols = extractor.extract_many(refs)
    # Surface symbol-extraction failures up front so the user sees them
    # without scanning the canvas.
    missing: set[tuple[str, str]] = set(refs) - set(symbols.keys())
    for lib_path, lib_ref in missing:
        result.failures.append(PipelineNote(
            severity="error",
            text=(
                f"symbol extraction failed: lib_ref={lib_ref!r} "
                f"lib_path={lib_path!r}. The .SchLib must be openable "
                f"in Altium and contain a component with that name."
            ),
        ))
    if result.failures:
        return result

    # 2. Placement. Two-way pick:
    #    a) layout_overrides supplied -> use those (multi-try iterator path).
    #    b) Otherwise run _placement_pass (composer + Sugiyama fallback).
    if layout_overrides:
        placements = list(layout_overrides.values())
    else:
        placements = _placement_pass(plan, result)
    if placement_hints:
        placements = _apply_placement_hints(placements, placement_hints, result)

    # 2b. Apply learned placement priors as a post-Sugiyama bias.
    # Priors live in placement_priors.json (shipped with the package or
    # supplied via EDA_AGENT_PRIORS). When no priors exist (fresh
    # install with no edits yet), this is a no-op.
    priors = load_priors()
    if priors:
        placements = apply_placement_priors(placements, plan, priors)
        result.notes.append(PipelineNote(
            severity="info",
            text=f"applied placement priors ({len(priors)} role pairs)",
        ))

    # 2c. Final overlap repair. Both the motif composer and the priors
    # layer overlay positions without consulting each other or the
    # initial shove pass that compute_layout ran. The result can have
    # bbox overlaps (e.g., two passives that priors moved to the same
    # x column with rotation that puts their bodies on the same line).
    # Run the audit-aware shove one more time so the wiring stage sees
    # a clean placement.
    placements, residual_overlaps = _hard_shove_pass(plan, placements)
    if residual_overlaps:
        result.notes.append(PipelineNote(
            severity="warning",
            text=(
                f"post-priors shove left {residual_overlaps} residual "
                f"overlap(s); wires may pass through component bodies"
            ),
        ))

    # 2c'. Re-tighten crystal oscillator clusters. The shove sizes parts by
    # pin count, so it reads a crystal's two small load caps (400 mils off the
    # crystal) as overlapping and scatters them -- undoing the symmetric prior.
    # Re-snap them to the crystal's post-shove position so XIN/XOUT stay short.
    placements = resnap_crystal_clusters(plan, placements)

    # 2c''. Same repair for every OTHER self-contained motif (pi filter, diode
    # bridge, voltage divider, RC filters): the shove scatters those tight
    # clusters too, but only crystals had a resnap. Restore each motif's
    # canonical shape around its post-shove centroid.
    placements = resnap_motif_clusters(plan, placements)

    # 2d. Sheet-edge keep-out. Recenter the placement so every part
    # plus a port-glyph margin fits within the sheet rectangle. Without
    # this, parts placed near the sheet edge by Sugiyama push the
    # downstream power-port glyph past the page boundary (see clamp in
    # _emit_port_cluster, which is the LAST defence -- this is the
    # primary one).
    placements = _recenter_within_sheet(placements, plan)

    # 3. Canvas construction. Sheets come from the plan; instances are
    # PlacedPart + SymbolModel pairs.
    canvas = result.canvas
    for sheet in plan.sheets:
        canvas.add_sheet(Sheet(
            name=sheet.name,
            title=sheet.title or "",
            size=sheet.size,
        ))
    part_by_refdes = {p.refdes: p for p in plan.parts}
    for placement in placements:
        part = part_by_refdes.get(placement.refdes)
        if part is None:
            continue  # layout produced a refdes that isn't in the plan?
        if part.status == PartStatus.NEEDS_CREATION:
            continue
        symbol = symbols.get((part.lib_path or "", part.lib_ref))
        if symbol is None:
            # This shouldn't happen if we already short-circuited on
            # missing extraction above, but stay defensive.
            result.failures.append(PipelineNote(
                severity="error",
                text=(
                    f"symbol unavailable at canvas-build time for "
                    f"{placement.refdes}; lib_ref={part.lib_ref!r}"
                ),
            ))
            continue
        canvas.add_instance(SymbolInstance(
            refdes=placement.refdes,
            symbol=symbol,
            x=placement.x_mils,
            y=placement.y_mils,
            rotation=placement.rotation,
            sheet=placement.sheet,
            flipped=getattr(placement, "flipped", False),
            value=(part.value or ""),
        ))
    result.placement_count = len(canvas.instances)

    # 3b. Parameter stamps. Bind Value / Manufacturer / MPN / Footprint
    # (and Datasheet when the part carries datasheet_url) so the emitter
    # can stamp them on each placed instance in one bulk call. Same
    # resolution order as the legacy executor: Part fields > BomLine fallback.
    bom_lookup = _bom_lookup(plan)
    for part in plan.parts:
        if part.status == PartStatus.NEEDS_CREATION:
            continue
        stamps = dict(_part_parameters(part, bom_lookup))
        if part.datasheet_url:
            stamps["Datasheet"] = part.datasheet_url
        if stamps:
            result.parameter_stamps[part.refdes] = stamps

    # 4. Wiring per sheet.
    refdes_to_sheet = {p.refdes: p.sheet for p in plan.parts}
    refdes_to_zone = {p.refdes: p.zone for p in plan.parts}

    nets_by_sheet: dict[str, list[Net]] = {}
    for net in plan.nets:
        sheets_touched: set[str] = set()
        for pin_ref in net.pins:
            s = refdes_to_sheet.get(pin_ref.refdes)
            if s:
                sheets_touched.add(s)
        for s in sheets_touched:
            nets_by_sheet.setdefault(s, []).append(net)

    for sheet_obj in canvas.sheets:
        nets = nets_by_sheet.get(sheet_obj.name, [])
        if not nets:
            continue
        _wire_sheet(
            canvas=canvas,
            sheet_name=sheet_obj.name,
            nets=nets,
            placeable_refdes=placeable_refdes,
            refdes_to_sheet=refdes_to_sheet,
            refdes_to_zone=refdes_to_zone,
            result=result,
            plan=plan,
            port_hints=port_hints or {},
        )

    # 4b. Bus drawing. Redraw any detected wide inter-IC bus (>= 4 nets) as a
    # bus glyph -- a thick bus line + 45-degree entries + per-pin labels --
    # instead of N per-pin labels. Gated to NEVER add crossings and to fall
    # back to the per-pin form when a clean bus can't be drawn, so it is a
    # no-op on designs without a bus and never a regression.
    from eda_agent.design.buses import apply_bus_drawing
    apply_bus_drawing(canvas, plan)

    result.wire_count = len(canvas.wires)
    result.label_count = len(canvas.labels)
    result.power_port_count = len(canvas.power_ports)
    result.junction_count = len(canvas.junctions)

    # 5. Canvas validation. Catch the class of bug where a plan net
    # silently failed to produce any wire/label/port on the canvas
    # (would emit to Altium as a no-op, then surface much later as an
    # unconnected-pin ERC violation). Cheap last-mile check.
    _validate_canvas_against_plan(plan, canvas, result)
    # 6. Routing-shorts detector. Strict: if a wire on net N passes
    # through or terminates on a pin that's NOT on net N, Altium will
    # auto-merge them into a single net at compile time. ERC won't
    # catch this (the merged net has both pins, which often looks
    # "fully connected") -- the design just silently does the wrong
    # thing. This pass turns those into hard failures BEFORE the emit
    # so the bad layout never reaches Altium.
    #
    # In strict_shorts=False mode (pairwise voting), demote shorts
    # from failures to warning notes: the caller WANTS to see bad
    # layouts so the user can vote against them. The downstream emit
    # path always re-checks with strict=True.
    if strict_shorts:
        _detect_routing_shorts(plan, canvas, result)
    else:
        _detect_routing_shorts_nonfatal(plan, canvas, result)
    return result


def _recenter_within_sheet(
    placements: list,
    plan: DesignPlan,
) -> list:
    """Shift placements so the part bbox sits inside the sheet rect
    with margin for power-port glyphs.

    Each sheet in the plan carries its own size (A4, A3, B, ...) -- the
    Sheet object computes width_mils / height_mils from that string. We
    use those dimensions for the clamp; never assume a default page.

    Behaviour: if the part bbox already fits with margin, no change.
    If a side breaches the margin, shift the whole group toward sheet
    centre by exactly the breach amount (no zoom, no per-part nudging).
    If the bbox is wider/taller than the sheet's interior, leave the
    placements alone -- bigger problem than a recenter can fix.
    """
    if not placements:
        return placements

    # Build a lookup: refdes -> sheet name from the plan.
    sheet_by_refdes = {p.refdes: p.sheet for p in plan.parts}
    # Sheet dimensions by name. Plan.sheets is a list of Sheet dicts;
    # construct a temporary canvas Sheet to get width_mils / height_mils.
    from eda_agent.design.canvas import Sheet as CanvasSheet
    sheet_dims: dict[str, tuple[int, int]] = {}
    for s in plan.sheets:
        cs = CanvasSheet(name=s.name, title=s.title or "", size=s.size)
        sheet_dims[s.name] = (cs.width_mils, cs.height_mils)

    # Margin: enough headroom for a power-port glyph + label (~400)
    # plus a 200-mil buffer so the glyph isn't crammed against the edge.
    margin = 600

    # Group placements by sheet and shift each group independently.
    by_sheet: dict[str, list] = {}
    for p in placements:
        by_sheet.setdefault(sheet_by_refdes.get(p.refdes, p.sheet), []).append(p)

    from eda_agent.design.layout import PlacedPart
    shifted_by_refdes: dict[str, PlacedPart] = {}
    for sheet_name, group in by_sheet.items():
        if not group or sheet_name not in sheet_dims:
            for p in group:
                shifted_by_refdes[p.refdes] = p
            continue
        sw, sh = sheet_dims[sheet_name]
        xs = [p.x_mils for p in group]
        ys = [p.y_mils for p in group]
        x_min, x_max = min(xs), max(xs)
        y_min, y_max = min(ys), max(ys)
        # If the group already fits inside (margin, sheet - margin), no shift.
        dx = 0
        dy = 0
        if x_min < margin:
            dx = margin - x_min
        elif x_max > sw - margin:
            dx = (sw - margin) - x_max
        if y_min < margin:
            dy = margin - y_min
        elif y_max > sh - margin:
            dy = (sh - margin) - y_max
        # Snap shift to 100-mil grid so placements stay grid-aligned.
        dx = (dx // 100) * 100
        dy = (dy // 100) * 100
        for p in group:
            if dx == 0 and dy == 0:
                shifted_by_refdes[p.refdes] = p
            else:
                shifted_by_refdes[p.refdes] = PlacedPart(
                    refdes=p.refdes, sheet=p.sheet,
                    x_mils=p.x_mils + dx, y_mils=p.y_mils + dy,
                    rotation=p.rotation,
                )

    # Preserve input order.
    return [shifted_by_refdes[p.refdes] for p in placements]


def _apply_placement_hints(
    placements: list,
    hints: dict[str, dict[str, int]],
    result: PipelineResult,
) -> list:
    """Override (x, y, rotation) on hinted refdes, leave others alone.

    Returns a new list; non-hinted PlacedParts pass through unchanged.
    Unknown hint keys (refdes not in placements) get a warning note --
    the agent probably typo'd a refdes. Partial hints (e.g. rotation
    omitted) preserve the placement's existing value for that field.
    """
    from eda_agent.design.layout import PlacedPart
    placement_by_refdes = {p.refdes: p for p in placements}
    known_refdes = set(placement_by_refdes.keys())
    out: list = []
    for placement in placements:
        hint = hints.get(placement.refdes)
        if hint is None:
            out.append(placement)
            continue
        new_x = int(hint.get("x", placement.x_mils))
        new_y = int(hint.get("y", placement.y_mils))
        new_rot = int(hint.get("rotation", placement.rotation)) % 360
        # Flip is carried separately as `flipped: bool`. PlacedPart
        # doesn't have a field yet; we encode it by extending PlacedPart
        # below if the hint asks for a flip. Default unchanged.
        flipped = bool(hint.get("flipped", getattr(placement, "flipped", False)))
        # Snap to 100-mil grid so anchored positions don't accidentally
        # land off-grid (which Altium would auto-snap anyway, but worse:
        # the wires routed by the pipeline expect grid alignment).
        new_x = (new_x // 100) * 100
        new_y = (new_y // 100) * 100
        kwargs = dict(
            refdes=placement.refdes, sheet=placement.sheet,
            x_mils=new_x, y_mils=new_y, rotation=new_rot,
        )
        # PlacedPart may or may not yet have a `flipped` field. Pass it
        # only when supported so we don't break older PlacedPart shape.
        try:
            new_placement = PlacedPart(**kwargs, flipped=flipped)
        except TypeError:
            new_placement = PlacedPart(**kwargs)
            new_placement.__dict__["flipped"] = flipped
        out.append(new_placement)
    # Flag unknown refdes hints so the agent sees them.
    for refdes in hints.keys():
        if refdes not in known_refdes:
            result.notes.append(PipelineNote(
                severity="warning",
                text=(
                    f"placement_hint references unknown refdes {refdes!r} "
                    f"(known: {sorted(known_refdes)}). Hint ignored."
                ),
            ))
    if hints:
        result.notes.append(PipelineNote(
            severity="info",
            text=f"applied {len(hints)} placement hint(s)",
        ))
    return out


def build_best_canvas_from_plan(
    plan: DesignPlan,
    extractor: SymbolExtractor,
    *,
    n_tries: int = 5,
    placement_hints: Optional[dict[str, dict[str, int]]] = None,
    port_hints: Optional[dict[str, dict[str, int]]] = None,
    strict_shorts: bool = True,
) -> PipelineResult:
    """Multi-try plan -> canvas; return the lowest-scoring variant.

    Closes the SVG-iteration loop the renderer was always meant to
    serve. Strategy:

    1. Run ``build_canvas_from_plan`` once to get the base placement.
    2. Generate ``n_tries`` placement variants by rescaling the base
       placements to different bbox aspect ratios. Each rescale
       preserves relative ordering but reshapes the layout's overall
       footprint (e.g. tall-thin -> square -> wide-short).
    3. Re-run ``build_canvas_from_plan`` with each variant as
       ``layout_overrides``, score every resulting canvas, return
       the lowest-score one.

    The variants are intentionally narrow for now (aspect rescaling
    only); the real win is exercising the score-pick-best plumbing.
    Future expansion: vary force-directed seeds, swap Sugiyama
    parameters, or accept agent-supplied placement anchors as a
    second-tier escalation when no variant lands below a quality
    threshold.

    On failure (base canvas couldn't be built, all variants failed),
    returns the base result with its failures intact.
    """
    base = build_canvas_from_plan(
        plan, extractor, placement_hints=placement_hints,
        port_hints=port_hints, strict_shorts=strict_shorts,
    )
    base_label = "base"

    # Force-directed alternative placement. The base used Sugiyama (the plan
    # has an anchor role), which excludes power/ground from layering -- so on a
    # board whose signal graph is split by a power-only bridge (a regulator
    # that connects ONLY through rails) it leaves parts floating and sprawls.
    # FD's spring graph uses ALL nets, so it places the whole power tree; it
    # wins on those boards and loses on clean signal chains. It is an
    # INDEPENDENT placement (does not reuse base positions), so it can even
    # rescue a base that failed to route -- evaluate it before the early-out.
    def _cand_key(res: PipelineResult) -> tuple[int, float]:
        if not res.canvas.instances:
            return (2, float("inf"))
        total = score_canvas(res.canvas, plan).total
        return (0 if res.ok else 1, total)

    try:
        from eda_agent.design.layout import compute_layout as _compute_layout
        # Pin-aware force-directed candidate. FD's spring graph uses ALL nets
        # (so it places power-bridged boards Sugiyama leaves floating), and with
        # the IC pin offsets each discrete is pulled toward the specific pin it
        # wires to -- so the output stage settles by OUT, the timing network by
        # DISCH/THRES, etc. Run for every board (not just anchored ones) and
        # score it; it wins where pin-side placement or power-tree handling
        # helps, and loses to Sugiyama on clean signal chains. ic_pin_offsets
        # empty (no ICs) reproduces the old centroid FD exactly.
        ic_off = _ic_pin_offsets(plan, extractor)
        # FD is chaotic in the pin-attractor stiffness -- one value lands a
        # clean side-grouped layout while a neighbouring value sprawls. Rather
        # than trust a single tuned constant (overfitting to one board), SWEEP a
        # few strengths, build + score each, and keep the lowest. With no ICs
        # the sweep collapses to one centroid-only FD run (old behaviour).
        # FD's pin-attractor stiffness has a chaotic, multi-modal score
        # landscape (good minima sit next to sprawled ones, and the best K
        # varies per board), so a few hand-picked values miss the optimum.
        # Sweep it DENSELY (module constant ``_FD_K_SWEEP``) and let the scorer
        # pick per board -- offline, ~50 ms per eval. No ICs -> one centroid FD
        # run (old behaviour). The test conftest patches the sweep down for
        # speed; the pin-side regression test restores the full density.
        ks: tuple = (None,) if not ic_off else _FD_K_SWEEP
        for k in ks:
            fd_placed = _compute_layout(
                plan, engine="force_directed", ic_pin_offsets=ic_off,
                pin_attract_k=k)
            fd_cand = build_canvas_from_plan(
                plan, extractor,
                layout_overrides={p.refdes: p for p in fd_placed},
                placement_hints=placement_hints, port_hints=port_hints,
                strict_shorts=strict_shorts,
            )
            # Prefer an OK candidate, then the lower score.
            if _cand_key(fd_cand) < _cand_key(base):
                base, base_label = fd_cand, (
                    f"pin_aware_fd(k={k})" if ic_off else "force_directed")
    except Exception as fd_exc:
        # FD alternative is best-effort; never block the base result -- but
        # say so, or a persistently-broken FD path silently degrades every
        # layout to the base engine.
        base.notes.append(PipelineNote(
            severity="warning",
            text=(
                "force-directed layout alternative failed and was skipped: "
                f"{type(fd_exc).__name__}: {fd_exc}"),
        ))
        ic_off = {}

    # Pin-side-aware Sugiyama candidate. The base Sugiyama layers by hop
    # distance only, so a timing network can land in the column RIGHT of
    # its IC while wiring to LEFT-side pins (every wire loops around the
    # body). With the symbol pin offsets, small parts move to the side of
    # the IC their pins sit on; scored like every other variant, so it
    # only wins when the geometry actually improves.
    try:
        if ic_off:
            from eda_agent.design.layout import compute_layout as _cl2
            ps_placed = _cl2(plan, engine="sugiyama", ic_pin_offsets=ic_off)
            ps_cand = build_canvas_from_plan(
                plan, extractor,
                layout_overrides={p.refdes: p for p in ps_placed},
                placement_hints=placement_hints, port_hints=port_hints,
                strict_shorts=strict_shorts,
            )
            if _cand_key(ps_cand) < _cand_key(base):
                base, base_label = ps_cand, "pin_side_sugiyama"
    except Exception as ps_exc:
        base.notes.append(PipelineNote(
            severity="warning",
            text=(
                "pin-side sugiyama alternative failed and was skipped: "
                f"{type(ps_exc).__name__}: {ps_exc}"),
        ))

    if not base.ok or not base.canvas.instances:
        return base

    base_score = score_canvas(base.canvas, plan)
    best_score: LayoutScore = base_score
    best_result: PipelineResult = base
    best_label = base_label
    base.notes.append(PipelineNote(
        severity="info",
        text=(
            f"layout score baseline: total={base_score.total:.1f} "
            f"(crossings={base_score.wire_crossings}, "
            f"through_body={base_score.wires_through_bodies}, "
            f"overlaps={base_score.body_overlaps}, "
            f"aspect={base_score.aspect_ratio_penalty:.2f}, "
            f"length={base_score.total_wire_length}, "
            f"ports={base_score.port_count})"
        ),
    ))

    # Aspect-rescaling variants. Tall layouts (aspect >> 1) often
    # compress better at square 1.0 or modest 1.33; wide layouts at
    # 0.75 or 0.66. Each variant is scored independently and the
    # lowest-score one wins.
    target_aspects = [1.0, 1.33, 0.75, 1.5, 0.66][: max(0, n_tries - 1)]
    for aspect in target_aspects:
        variant_placements = _rescale_placements(
            [_canvas_instance_to_placement(i) for i in base.canvas.instances],
            target_aspect=aspect,
        )
        overrides = {p.refdes: p for p in variant_placements}
        variant = build_canvas_from_plan(
            plan, extractor,
            layout_overrides=overrides,
            placement_hints=placement_hints,
            port_hints=port_hints,
            strict_shorts=strict_shorts,
        )
        if not variant.ok or not variant.canvas.instances:
            continue
        variant_score = score_canvas(variant.canvas, plan)
        variant.notes.append(PipelineNote(
            severity="info",
            text=(
                f"variant aspect={aspect}: score={variant_score.total:.1f}"
            ),
        ))
        if variant_score.total < best_score.total:
            best_score = variant_score
            best_result = variant
            best_label = f"aspect={aspect}"

    # NOTE: the deterministic neat-layout engine (schematic_layout.py) was
    # trialled here as an extra positions-only variant, but it consistently
    # lost to the Sugiyama-based placer that the canvas already uses: feeding
    # only its centres into the canvas discards its crossing-minimal routing,
    # and the canvas re-routes them with more crossings. It stays available as
    # a standalone preview (design_layout_schematic) and via
    # `_neat_engine_overrides`; it is not run in this hot path.
    n_variants = 1 + len(target_aspects)
    best_result.notes.append(PipelineNote(
        severity="info",
        text=(
            f"selected layout: {best_label} score={best_score.total:.1f} "
            f"out of {n_variants} variants"
        ),
    ))
    return best_result


def _neat_engine_overrides(plan):  # type: ignore[no-untyped-def]
    """Placement overrides from the deterministic neat-layout engine.

    Best-effort: runs ``compute_schematic_layout`` and maps its placed
    symbols to canvas :class:`PlacedPart` overrides. Returns ``None`` on any
    failure so the pipeline degrades to the rescale variants alone.
    """
    try:
        from eda_agent.design.layout import PlacedPart
        from eda_agent.design.schematic_layout import compute_schematic_layout
        layout = compute_schematic_layout(plan)
        if not layout.placed:
            return None
        return {
            r: PlacedPart(refdes=s.refdes, sheet=s.sheet,
                          x_mils=s.x_mils, y_mils=s.y_mils, rotation=s.rotation)
            for r, s in layout.placed.items()
        }
    except Exception:
        return None


def _canvas_instance_to_placement(inst):  # type: ignore[no-untyped-def]
    """Pull a PlacedPart out of a canvas SymbolInstance for variant generation."""
    from eda_agent.design.layout import PlacedPart
    return PlacedPart(
        refdes=inst.refdes, sheet=inst.sheet,
        x_mils=inst.x, y_mils=inst.y, rotation=inst.rotation,
    )


def _rescale_placements(placements, target_aspect: float):
    """Rescale placements so the bbox approximates target_aspect = w/h.

    Preserves relative ordering and shape but compresses/stretches one
    axis. Output is snapped to the 100-mil grid. Only shrinks (never
    grows) along each axis so the resulting bbox stays within the sheet.
    """
    if not placements:
        return list(placements)
    xs = [p.x_mils for p in placements]
    ys = [p.y_mils for p in placements]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)
    w = max(1, x_max - x_min)
    h = max(1, y_max - y_min)
    # Target bbox preserves area; compute new w, h with target aspect.
    import math
    area = w * h
    target_h = max(1, int(math.sqrt(area / target_aspect)))
    target_w = max(1, int(target_h * target_aspect))
    # Cap each dimension so we never grow beyond original (keeps everything
    # on-sheet; if growth is desired, raise the cap).
    target_w = min(target_w, max(w, 1500))
    target_h = min(target_h, max(h, 1500))
    sx = target_w / w
    sy = target_h / h
    out = []
    for p in placements:
        new_x = x_min + int((p.x_mils - x_min) * sx)
        new_y = y_min + int((p.y_mils - y_min) * sy)
        # Snap to 100-mil grid.
        new_x = (new_x // 100) * 100
        new_y = (new_y // 100) * 100
        # Re-import PlacedPart here so the function stays importable
        # in isolation (the module-level layout import is also fine).
        from eda_agent.design.layout import PlacedPart
        out.append(PlacedPart(
            refdes=p.refdes, sheet=p.sheet,
            x_mils=new_x, y_mils=new_y, rotation=p.rotation,
        ))
    return out


def _detect_routing_shorts_nonfatal(
    plan: DesignPlan,
    canvas: SchematicCanvas,
    result: PipelineResult,
) -> None:
    """Same as _detect_routing_shorts but downgrades failures to warnings.

    Used by pairwise vote generation: we want to SHOW bad layouts to
    the user (so they can vote against them) rather than reject them.
    The downstream emit path re-runs the strict version.
    """
    sink = PipelineResult(canvas=result.canvas)
    _detect_routing_shorts(plan, canvas, sink)
    # Move what would be failures into warning notes on the real result.
    for f in sink.failures:
        result.notes.append(PipelineNote(severity="warning", text=f.text))


def _detect_routing_shorts(
    plan: DesignPlan,
    canvas: SchematicCanvas,
    result: PipelineResult,
) -> None:
    """Flag wires that bridge unrelated nets via coincident pins.

    For every wire ``w`` on a named net ``N``, every pin endpoint that
    is NOT on ``N`` is a potential short:

    1. Pin endpoint coincides with one of the wire's two endpoints, OR
    2. Pin endpoint lies strictly between the wire's endpoints on an
       axis-aligned segment.

    When either happens, Altium will auto-merge the wire's net with
    whatever the offending pin's plan-net is. ERC sees one fully-
    connected net and stays silent. Catching the geometric coincidence
    pre-emit is the only reliable signal.

    Per-pin net membership is computed from plan.nets; if a pin isn't
    in any plan net it's treated as un-netted (no shorting possible).
    """
    # Build refdes/pin_id -> plan_net_name lookup.
    pin_to_net: dict[tuple[str, str], str] = {}
    for net in plan.nets:
        for pin_ref in net.pins:
            pin_to_net[(pin_ref.refdes, pin_ref.pin)] = net.name

    # Build (x, y) -> {(refdes, pin_id, net_name)} for every placed
    # instance's pin world coords. Aliased pin IDs (designator vs name)
    # both map to the same coordinate, so we deduplicate by storing the
    # pin's canonical designator only.
    points: dict[tuple[int, int], list[tuple[str, str, str]]] = {}
    for inst in canvas.instances:
        for endpoint in inst.all_pin_endpoints():
            key = (endpoint.x, endpoint.y)
            net_name = pin_to_net.get((inst.refdes, endpoint.pin_id), "")
            points.setdefault(key, []).append(
                (inst.refdes, endpoint.pin_id, net_name)
            )

    shorts: list[tuple[str, str, str, str, int, int]] = []
    # (wire_net, offending_refdes, offending_pin, offending_net, x, y)

    for wire in canvas.wires:
        if not wire.net:
            continue
        # Set of (refdes, pin_id) pairs that ARE on this wire's net per
        # the plan -- those are the legitimate touch points and must
        # not be flagged.
        own_pins = {
            (pr.refdes, pr.pin)
            for n in plan.nets
            if n.name == wire.net
            for pr in n.pins
        }
        for (px, py), pin_entries in points.items():
            if not _point_on_segment(px, py, wire.x1, wire.y1,
                                     wire.x2, wire.y2):
                continue
            for refdes, pin_id, pin_net in pin_entries:
                if (refdes, pin_id) in own_pins:
                    continue
                # Pin is NOT on the wire's net. Two bad cases:
                # (a) Pin is on a DIFFERENT plan net -> cross-net short.
                # (b) Pin has no plan-net assignment -> stray connection
                #     (the wire would bridge the plan's net into this
                #     part's auto-named net, an unplanned connection).
                shorts.append((
                    wire.net, refdes, pin_id, pin_net or "_unnetted_",
                    px, py,
                ))

    # Deduplicate -- same short often surfaces via many wire segments.
    seen: set[tuple[str, str, str, str]] = set()
    for wire_net, refdes, pin_id, pin_net, x, y in shorts:
        key = (wire_net, refdes, pin_id, pin_net)
        if key in seen:
            continue
        seen.add(key)
        result.failures.append(PipelineNote(
            severity="error",
            text=(
                f"routing short: wire on net {wire_net!r} passes through "
                f"pin {refdes}.{pin_id} (plan net {pin_net!r}) at "
                f"({x}, {y}). Altium would auto-merge the two nets; "
                f"emit blocked."
            ),
        ))

    # Net-label coincidences. A net label attaches its net to whatever pin or
    # wire sits at its point, so a label of net A landing on a FOREIGN pin or
    # on a FOREIGN net's wire merges A into that net -- a short Altium realises
    # on compile that neither the wire-vs-pin check above nor ERC reports.
    label_shorts: list[tuple[str, str, int, int]] = []
    for lb in canvas.labels:
        for refdes, pin_id, pin_net in points.get((lb.x, lb.y), []):
            if pin_net and pin_net != lb.text:
                label_shorts.append(
                    (lb.text, f"pin {refdes}.{pin_id} (net {pin_net!r})",
                     lb.x, lb.y))
        for wire in canvas.wires:
            if not wire.net or wire.net == lb.text:
                continue
            if _point_on_segment(lb.x, lb.y, wire.x1, wire.y1,
                                  wire.x2, wire.y2):
                label_shorts.append(
                    (lb.text, f"wire on net {wire.net!r}", lb.x, lb.y))
                break
    seen_labels: set[tuple[str, str]] = set()
    for text, what, x, y in label_shorts:
        key = (text, what)
        if key in seen_labels:
            continue
        seen_labels.add(key)
        result.failures.append(PipelineNote(
            severity="error",
            text=(
                f"routing short: net label {text!r} at ({x}, {y}) sits on "
                f"{what}; Altium would merge the nets; emit blocked."
            ),
        ))


def _point_on_segment(
    px: int, py: int, x1: int, y1: int, x2: int, y2: int,
) -> bool:
    """True iff (px, py) lies on the axis-aligned segment (x1,y1)-(x2,y2).

    Only axis-aligned segments are emitted by the router, so we only
    handle horizontal / vertical. Endpoints count as 'on' the segment
    (the wire physically terminates there); coincident endpoint is the
    most common shorting mode.
    """
    if x1 == x2:
        if px != x1:
            return False
        lo, hi = (y1, y2) if y1 <= y2 else (y2, y1)
        return lo <= py <= hi
    if y1 == y2:
        if py != y1:
            return False
        lo, hi = (x1, x2) if x1 <= x2 else (x2, x1)
        return lo <= px <= hi
    return False  # diagonal segments not used by the router


def _validate_canvas_against_plan(
    plan: DesignPlan,
    canvas: SchematicCanvas,
    result: PipelineResult,
) -> None:
    """Sanity-check every plan net got SOME representation on the canvas.

    A wire whose ``net`` attribute matches, a label whose ``text``
    matches, or a power port whose ``text`` matches all count. We don't
    distinguish wire-vs-label-vs-port -- if a net has zero of all three,
    something dropped it. That's not necessarily a hard failure (cross-
    sheet nets that span the canvas to a sheet we didn't render would
    legitimately have nothing here), but it's worth flagging as a
    warning so the caller can investigate.

    Pins-on-placed-instances are also checked: if a plan pin references
    a refdes that DID get placed but the pin id isn't on the symbol,
    that's a hard failure (the emit would silently drop the connection).
    The pipeline already catches this during wiring, but a redundant
    check here means a future refactor that bypasses the wiring loop
    still gets caught.
    """
    wire_nets = {w.net for w in canvas.wires if w.net}
    label_texts = {l.text for l in canvas.labels}
    port_texts = {p.text for p in canvas.power_ports}
    represented = wire_nets | label_texts | port_texts

    placed = {i.refdes: i for i in canvas.instances}
    for net in plan.nets:
        if net.name in represented:
            continue
        # Check whether ANY of this net's pins are on placed instances.
        # If not, the net is genuinely off this canvas (multi-sheet
        # design where this net lives elsewhere) -- silent skip.
        any_pin_on_canvas = any(
            pin_ref.refdes in placed for pin_ref in net.pins
        )
        if not any_pin_on_canvas:
            continue
        result.notes.append(PipelineNote(
            severity="warning",
            text=(
                f"plan net {net.name!r} has placed pins on the canvas "
                f"but no wire/label/port references it. Will emit as "
                f"electrically disconnected."
            ),
        ))


def _wire_sheet(
    *,
    canvas: SchematicCanvas,
    sheet_name: str,
    nets: list[Net],
    placeable_refdes: set[str],
    refdes_to_sheet: dict[str, str],
    refdes_to_zone: dict[str, Optional[str]],
    result: PipelineResult,
    plan: DesignPlan,
    port_hints: Optional[dict[str, dict[str, int]]] = None,
) -> None:
    """Compute wires + labels + ports for one sheet.

    Two-pass (matches executor logic):
      - Pass 1: collect every (net, pin) stub-end, emit the stub wire.
      - Pass 2: route each net's wires/labels/ports treating other
        nets' stub-ends as point obstacles (cluster radius 50 mils).
    """
    instances = canvas.instances_on(sheet_name)
    if not instances:
        return

    body_obstacles: list[tuple[int, int, int, int]] = []
    for inst in instances:
        bb = inst.world_bbox()
        body_obstacles.append((bb.x_min, bb.y_min, bb.x_max, bb.y_max))

    # Stagger counter per (refdes, direction) so two adjacent same-
    # direction stubs don't share an L-bend column.
    stagger_counter: dict[tuple[str, int, int], int] = {}

    # Per-net action list: (pin_ref, (end_x, end_y), pin_orient)
    sheet_net_actions: dict[
        str, list[tuple[Any, tuple[int, int], int]]
    ] = {}
    sheet_wire_segments: list[tuple[int, int, int, int, str]] = []

    # Pass 1: stub wires + endpoint collection.
    for net in nets:
        net_actions: list[tuple[Any, tuple[int, int], int]] = []
        for pin_ref in net.pins:
            if pin_ref.refdes not in placeable_refdes:
                result.failures.append(PipelineNote(
                    severity="error",
                    text=(
                        f"net {net.name!r} references unplaceable "
                        f"refdes {pin_ref.refdes!r}"
                    ),
                ))
                continue
            if refdes_to_sheet.get(pin_ref.refdes) != sheet_name:
                continue  # cross-sheet, handled on its home sheet
            endpoint = canvas.pin_world(pin_ref.refdes, pin_ref.pin)
            if endpoint is None:
                result.failures.append(PipelineNote(
                    severity="error",
                    text=(
                        f"pin {pin_ref.pin!r} not found on "
                        f"{pin_ref.refdes} (symbol mismatch)"
                    ),
                ))
                continue
            dx_dir, dy_dir = _pin_direction_vector(endpoint.orientation)
            stagger_key = (pin_ref.refdes, dx_dir, dy_dir)
            extra = stagger_counter.get(stagger_key, 0) * 100
            stagger_counter[stagger_key] = (
                stagger_counter.get(stagger_key, 0) + 1
            )
            (hot_x, hot_y), (end_x, end_y) = _stub_endpoints(
                endpoint.x, endpoint.y, endpoint.orientation,
                endpoint.length,
                obstacles=body_obstacles,
                extra_length_mils=extra,
            )
            sheet_wire_segments.append((hot_x, hot_y, end_x, end_y, net.name))
            net_actions.append((pin_ref, (end_x, end_y), endpoint.orientation))
        if net_actions:
            sheet_net_actions[net.name] = net_actions

    # Pass 2 setup: every-other-net's stub-end becomes a point obstacle.
    all_stub_end_points: set[tuple[int, int]] = set()
    for actions in sheet_net_actions.values():
        for _, (ex, ey), _ in actions:
            all_stub_end_points.add((ex, ey))

    # Pin world coords per net, used by port routing so power-spokes
    # don't bridge through unrelated pins. Built once per sheet.
    # (refdes, pin_id) -> net_name lookup for fast filtering.
    plan_pin_to_net: dict[tuple[str, str], str] = {}
    for n in plan.nets:
        for pr in n.pins:
            plan_pin_to_net[(pr.refdes, pr.pin)] = n.name
    # All placed-pin world coords on this sheet.
    pin_world_coords: list[tuple[int, int, str]] = []  # (x, y, net_name)
    for inst in canvas.instances_on(sheet_name):
        for endpoint in inst.all_pin_endpoints():
            pn = plan_pin_to_net.get((inst.refdes, endpoint.pin_id), "")
            pin_world_coords.append((endpoint.x, endpoint.y, pn))

    shorted_to_label = 0
    for net in nets:
        net_actions = sheet_net_actions.get(net.name)
        if not net_actions:
            continue
        own_stub_ends: set[tuple[int, int]] = {a[1] for a in net_actions}
        other_stub_end_bboxes = [
            (x - 50, y - 50, x + 50, y + 50)
            for (x, y) in all_stub_end_points
            if (x, y) not in own_stub_ends
        ]
        routing_obstacles = list(body_obstacles) + other_stub_end_bboxes
        stub_ends = [a[1] for a in net_actions]
        representation = _net_representation(net, refdes_to_zone)

        if representation == "port":
            # Pins on OTHER nets become point obstacles so the port
            # centroid + spoke routing can't run a wire through them
            # (Altium auto-merges coincident endpoints; ERC wouldn't
            # catch the resulting silent short).
            other_net_pin_points = [
                (x, y) for (x, y, pn) in pin_world_coords
                if pn and pn != net.name
            ]
            # Look up the actual sheet bounds for clamping. The Sheet
            # object always carries width_mils / height_mils set from
            # the plan's size string (A4, A3, B, ...) by Sheet.__init__,
            # so there's no need for a hardcoded fallback.
            sheet_obj_match = next(
                s for s in canvas.sheets if s.name == sheet_name
            )
            sw = sheet_obj_match.width_mils
            sh = sheet_obj_match.height_mils
            _emit_port_cluster(
                canvas=canvas,
                sheet_name=sheet_name,
                net=net,
                net_actions=net_actions,
                sheet_wire_segments=sheet_wire_segments,
                routing_obstacles=routing_obstacles,
                other_net_pin_points=other_net_pin_points,
                port_hint=(port_hints or {}).get(net.name),
                sheet_width_mils=sw,
                sheet_height_mils=sh,
            )
        elif representation == "wire":
            segs = _route_signal_pins(stub_ends, routing_obstacles)
            # A routed segment passing through a pin NOT on this net is a
            # short Altium would auto-merge. At density the obstacle-aware
            # router can't always avoid this; rather than block the whole
            # emit, fall back to per-pin net labels for THIS net (labels
            # never short). A labelled connection beats no output.
            foreign_pins = [(x, y) for (x, y, pn) in pin_world_coords
                            if pn != net.name]
            would_short = any(
                _point_on_segment(px, py, s[0], s[1], s[2], s[3])
                for s in segs for (px, py) in foreign_pins
            )
            if would_short:
                shorted_to_label += 1
                for (end_x, end_y) in stub_ends:
                    canvas.add_labels([NetLabel(
                        text=net.name, x=end_x, y=end_y,
                        orientation=0, sheet=sheet_name)])
            else:
                for seg in segs:
                    sheet_wire_segments.append(
                        (seg[0], seg[1], seg[2], seg[3], net.name))
        else:  # "label_per_pin"
            for (end_x, end_y) in stub_ends:
                canvas.add_labels([NetLabel(
                    text=net.name, x=end_x, y=end_y,
                    orientation=0, sheet=sheet_name,
                )])

    # Cross-net WIRE meetings: two nets whose wires share an endpoint, or one
    # ending on the other's segment, are auto-junctioned by Altium on compile
    # -- a silent short the pin-based guard above does not see (it is wire-on-
    # wire, not at a pin). Fall the worst offender back to labels (no wires =>
    # no meeting) and repeat until none remain. Dropping a net removes ALL its
    # segments, so the loop terminates in at most one pass per offending net.
    while True:
        offenders = _cross_net_meeting_counts(sheet_wire_segments)
        if not offenders:
            break
        worst = max(offenders, key=lambda n: (offenders[n], n))
        sheet_wire_segments[:] = [
            s for s in sheet_wire_segments if s[4] != worst
        ]
        for (_pin_ref, (end_x, end_y), _orient) in sheet_net_actions.get(worst, []):
            canvas.add_labels([NetLabel(
                text=worst, x=end_x, y=end_y, orientation=0, sheet=sheet_name)])
        shorted_to_label += 1

    # Guarantee power/ground connectivity. A power spoke that the cull loop
    # above dropped leaves its pins on bare net labels -- but a net label sat
    # on a pin with no wire under it does NOT connect the pin in Altium (it
    # reads as a floating label + floating power object in ERC). Repair every
    # such pin with a power port placed COINCIDENT with the pin: a power port
    # on a pin connects directly, with no wire to route, cull, or short.
    _repair_floating_power_pins(canvas, sheet_name, plan, sheet_wire_segments)

    if shorted_to_label > 0:
        result.forced_label_count += shorted_to_label
        result.notes.append(PipelineNote(
            severity="warning",
            text=(
                f"sheet {sheet_name!r}: {shorted_to_label} signal net(s) "
                f"labelled instead of wired because wiring them would short on "
                f"another net's pin or wire at this placement density. "
                f"Connectivity is preserved via the labels (a net label is "
                f"electrically identical to a wire); this is a local placement-"
                f"density artifact, not an error."
            ),
        ))

    # Flush wires to canvas + detect junctions on the assembled list.
    wire_objects = [
        WireSegment(x1=x1, y1=y1, x2=x2, y2=y2, sheet=sheet_name, net=net_name)
        for (x1, y1, x2, y2, net_name) in sheet_wire_segments
    ]
    canvas.add_wires(wire_objects)
    # Pass the net tag so a junction dot is only placed where SAME-net wires
    # meet -- a dot at a cross-net wire crossing would short the two nets.
    for jx, jy in _detect_junctions(sheet_wire_segments):
        canvas.add_junctions([Junction(x=jx, y=jy, sheet=sheet_name)])


def _cluster_radius_for_net(
    net_actions: list[tuple[Any, tuple[int, int], int]],
) -> int:
    """Pick a Manhattan clustering radius for a power/ground net's pins.

    Power and ground pins within one radius of each other share a single
    rail glyph (a local GND/VCC symbol) wired with short spokes; pins
    farther apart each get their OWN symbol. This is the universal
    schematic convention -- a reviewer reads every GND glyph as the same
    net, and per-pin symbols beat cross-sheet rail wires that tangle the
    drawing. An earlier rule made nets of <=6 pins one giant cluster to
    avoid "multiple GND glyphs", but that produced a long-spoke rats-nest
    (a 6-pin GND spread over a sheet became 18 wire segments and 13
    crossings); per-pin glyphs cut that to 6 crossings.

    ``POWER_RAIL_CLUSTER_RADIUS_MILS`` (1000 mils = 1 inch) is shared with
    the executor's apply path so the preview matches what is placed.
    """
    return POWER_RAIL_CLUSTER_RADIUS_MILS


def _shift_centroid_clear_of_pins(
    centroid_x: int,
    forbidden_xs: set[int],
    grid_mils: int = 100,
    max_shift_mils: int = 1000,
) -> int:
    """Return a centroid x that does not coincide with any forbidden pin x.

    The port glyph sits at (centroid_x, port_y) and every spoke's vertical
    segment runs along x = centroid_x. If any pin from another net has
    the same world x, the spoke physically passes through that pin's
    location and Altium auto-merges the two nets. Shift the centroid
    along the grid until clear. Searches both directions, prefers the
    smaller absolute shift.
    """
    if centroid_x not in forbidden_xs:
        return centroid_x
    for delta in range(grid_mils, max_shift_mils + grid_mils, grid_mils):
        for sign in (+1, -1):
            candidate = centroid_x + sign * delta
            if candidate not in forbidden_xs:
                return candidate
    # All near-by columns are taken (unlikely); fall back to the original
    # so we at least emit something. The shorts detector will catch it.
    return centroid_x


def _emit_port_cluster(
    *,
    canvas: SchematicCanvas,
    sheet_name: str,
    net: Net,
    net_actions: list[tuple[Any, tuple[int, int], int]],
    sheet_wire_segments: list[tuple[int, int, int, int, str]],
    routing_obstacles: list[tuple[int, int, int, int]],
    sheet_width_mils: int,
    sheet_height_mils: int,
    other_net_pin_points: Optional[list[tuple[int, int]]] = None,
    port_hint: Optional[dict[str, int]] = None,
) -> None:
    """Cluster a power/ground net's pins and emit ONE port per cluster.

    Mirrors executor logic: greedy clustering by Manhattan radius, port
    above (VCC) or below (GND) the cluster centroid, wires from every
    pin to the port via _route_l_path through the existing obstacle set.
    The radius is now adaptive (``_cluster_radius_for_net``) so small
    boards don't get fragmented power-port glyphs.

    ``other_net_pin_points`` is the list of world-frame pin locations
    that belong to OTHER nets on the same sheet. The port centroid is
    nudged off any column shared with such a pin, and each spoke's
    L-path treats them as small bbox obstacles so the spoke never runs
    through one. Together these eliminate the silent-short failure mode
    where the spoke wire bridges unrelated nets via coincident endpoints.
    """
    is_gnd = _is_ground_net(net)
    style = _ground_style(net.name) if is_gnd else "bar"
    cluster_radius = _cluster_radius_for_net(net_actions)
    clusters: list[list[int]] = []
    for i, (_, (ex, ey), _) in enumerate(net_actions):
        joined = False
        for cl in clusters:
            for j in cl:
                mx, my = net_actions[j][1]
                if abs(ex - mx) + abs(ey - my) <= cluster_radius:
                    cl.append(i)
                    joined = True
                    break
            if joined:
                break
        if not joined:
            clusters.append([i])

    other_pins = other_net_pin_points or []
    forbidden_xs = {x for (x, _) in other_pins}
    # Pin-point obstacles for L-path routing: small bbox around each
    # other-net pin so the path geometry avoids them.
    pin_point_bboxes = [(x - 25, y - 25, x + 25, y + 25) for (x, y) in other_pins]
    spoke_obstacles = list(routing_obstacles) + pin_point_bboxes

    for cl in clusters:
        cluster_pts = [net_actions[i][1] for i in cl]
        cluster_orients = [net_actions[i][2] for i in cl]
        # User-supplied port_hint wins over centroid calculation. The
        # drag-edit UI feeds these in: the user moves a port glyph,
        # the server records its new (x, y), the pipeline pins the
        # port there and routes spokes accordingly.
        if port_hint is not None:
            centroid_x = (int(port_hint.get("x", 0)) // 100) * 100
            port_y = (int(port_hint.get("y", 0)) // 100) * 100
        else:
            centroid_x = sum(pt[0] for pt in cluster_pts) // len(cluster_pts)
            centroid_x = (centroid_x // 100) * 100
            # Nudge centroid off any other-net pin column so the spoke's
            # vertical segment doesn't run straight through a different pin.
            centroid_x = _shift_centroid_clear_of_pins(centroid_x, forbidden_xs)
            if is_gnd:
                port_y = min(pt[1] for pt in cluster_pts) - 400
            else:
                port_y = max(pt[1] for pt in cluster_pts) + 400
            port_y = (port_y // 100) * 100
            # Clamp port placement to within the sheet rectangle. Without
            # this, a cluster pin near the sheet edge pushes the port
            # glyph off-sheet (glyph_y = cluster_max_y + 400, which can
            # exceed the sheet's top edge). Margin keeps the bar fully
            # inside the page.
            _SHEET_MARGIN = 200
            if port_y < _SHEET_MARGIN:
                port_y = _SHEET_MARGIN
            if port_y > sheet_height_mils - _SHEET_MARGIN:
                port_y = sheet_height_mils - _SHEET_MARGIN
            if centroid_x < _SHEET_MARGIN:
                centroid_x = _SHEET_MARGIN
            if centroid_x > sheet_width_mils - _SHEET_MARGIN:
                centroid_x = sheet_width_mils - _SHEET_MARGIN
            # Re-snap after clamping.
            port_y = (port_y // 100) * 100
            centroid_x = (centroid_x // 100) * 100
        # port orientation tracked for the emitter so it knows whether
        # the glyph mounts above or below the connection; the canvas
        # stores it in the PowerPort.style + emitter will translate.
        port_orient_unused = _power_port_orientation(
            cluster_orients[0], is_ground=is_gnd
        )
        del port_orient_unused
        canvas.add_power_ports([PowerPort(
            text=net.name,
            x=centroid_x,
            y=port_y,
            style=style,
            sheet=sheet_name,
        )])
        for pt in cluster_pts:
            if pt == (centroid_x, port_y):
                continue
            for seg in _route_l_path(
                pt[0], pt[1], centroid_x, port_y, spoke_obstacles
            ):
                sheet_wire_segments.append((seg[0], seg[1], seg[2], seg[3], net.name))


def _repair_floating_power_pins(
    canvas: SchematicCanvas,
    sheet_name: str,
    plan: DesignPlan,
    sheet_wire_segments: list[tuple[int, int, int, int, str]],
) -> None:
    """Ensure every power/ground pin actually connects in Altium.

    A power pin connects when a wire ends on it, or a power port sits exactly
    on it. The clustered port + spoke path (``_emit_port_cluster``) wires the
    pins to a shared glyph, but a spoke can be dropped by the cross-net cull
    above; the dropped net then falls to bare labels that float (a net label
    with no wire under it does not bond the pin). This pass finds any power /
    ground pin that ends up neither wire-connected nor under a port and drops a
    power port COINCIDENT with it -- the one Altium primitive that bonds a pin
    with no wire, so it cannot be culled or short. It also clears that net's
    now-redundant floating labels and any orphaned cluster glyph (a port left
    sitting on neither a pin nor a surviving spoke end), which would otherwise
    read as floating power objects in ERC. Fully-wired nets are left untouched.
    """
    pin_xy: dict[tuple[str, str], tuple[int, int]] = {}
    for inst in canvas.instances_on(sheet_name):
        for ep in inst.all_pin_endpoints():
            pin_xy[(inst.refdes, ep.pin_id)] = (ep.x, ep.y)

    for net in plan.nets:
        if not (_is_power_net(net) or _is_ground_net(net)):
            continue
        net_pins = [
            pin_xy[(pr.refdes, pr.pin)]
            for pr in net.pins
            if (pr.refdes, pr.pin) in pin_xy
        ]
        if not net_pins:
            continue
        wire_ends: set[tuple[int, int]] = set()
        for (x1, y1, x2, y2, nm) in sheet_wire_segments:
            if nm == net.name:
                wire_ends.add((x1, y1))
                wire_ends.add((x2, y2))
        port_pts = {
            (p.x, p.y)
            for p in canvas.power_ports
            if p.sheet == sheet_name and p.text == net.name
        }
        floating = [
            pt for pt in net_pins
            if pt not in wire_ends and pt not in port_pts
        ]
        if not floating:
            continue  # net is fully connected -- leave the working path alone

        style = _ground_style(net.name) if _is_ground_net(net) else "bar"
        canvas.add_power_ports([
            PowerPort(text=net.name, x=px, y=py, style=style, sheet=sheet_name)
            for (px, py) in floating
        ])
        # This net's labels never bonded (power nets carry ports, not labels);
        # drop them so they do not linger as floating net labels.
        canvas.labels[:] = [
            l for l in canvas.labels
            if not (l.sheet == sheet_name and l.text == net.name)
        ]
        # Drop orphaned glyphs: a port of this net sitting on neither a pin nor
        # a surviving spoke end is electrically floating.
        keep = set(net_pins) | wire_ends
        canvas.power_ports[:] = [
            p for p in canvas.power_ports
            if not (
                p.sheet == sheet_name
                and p.text == net.name
                and (p.x, p.y) not in keep
            )
        ]


def _ic_pin_offsets(
    plan: DesignPlan,
    extractor: SymbolExtractor,
    *,
    ic_pin_threshold: int = 4,
) -> dict[str, dict[str, tuple[int, int]]]:
    """Each IC pin's WIRE-end offset from the IC centre, native (rot-0) frame.

    ``{ic_refdes: {pin_id: (dx, dy)}}`` for every part with at least
    ``ic_pin_threshold`` pins. Feeds the pin-aware force-directed placer so a
    discrete is pulled toward the specific pin it wires to. Built from the
    extracted symbol geometry (the same wire end the router and the canvas use
    -- never the label/body end). Best-effort: returns what it can resolve.
    """
    pin_count: dict[str, int] = {}
    for net in plan.nets:
        for pr in net.pins:
            pin_count[pr.refdes] = pin_count.get(pr.refdes, 0) + 1
    ics = {p.refdes for p in plan.parts
           if pin_count.get(p.refdes, 0) >= ic_pin_threshold}
    if not ics:
        return {}
    refs = list({(p.lib_path, p.lib_ref) for p in plan.parts
                 if p.refdes in ics and p.lib_path})
    if not refs:
        return {}
    try:
        symbols = extractor.extract_many(refs)
    except Exception:
        return {}
    out: dict[str, dict[str, tuple[int, int]]] = {}
    for part in plan.parts:
        if part.refdes not in ics:
            continue
        s = symbols.get((part.lib_path, part.lib_ref))
        if s is None:
            continue
        inst = SymbolInstance(refdes=part.refdes, symbol=s, x=0, y=0, rotation=0)
        out[part.refdes] = {
            ep.pin_id: (ep.x, ep.y) for ep in inst.all_pin_endpoints()
        }
    return out
