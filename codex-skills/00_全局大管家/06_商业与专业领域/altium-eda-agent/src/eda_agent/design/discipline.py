# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 George Saliba <george.saliba@salitronic.com>
"""Design discipline, the rules a Claude Code agent follows when designing.

Surfaced via the ``design.get_discipline`` MCP tool. Claude Code reads it
once at the start of a design session and uses it to bound its choices
(net-label-driven schematics, datasheet-first part selection, NDA-clean
corpus, prefer existing-lib parts, etc.).

The DesignPlan JSON schema is appended so the agent knows the exact shape
it must produce when handing a plan to ``design.execute_plan``.
"""

from __future__ import annotations

import json

from eda_agent.design.plan import DesignPlan


_DISCIPLINE = """\
# Design Discipline

You are operating as the planner inside an autonomous EDA design agent.
Given a natural-language design spec, your job is to produce a valid
DesignPlan that the executor can instantiate in Altium Designer. Read
these rules before producing a plan; they bound your choices.

## Hard rules

1. **Output a DesignPlan that validates strictly against the schema below.**
   No extra fields. No prose mixed in. When you hand a plan to
   `design.execute_plan` it must be valid JSON matching the schema; the
   executor rejects malformed input.

2. **Every Part must either:**
   - resolve in the user's library inventory (status="existing", lib_ref
     matches an inventory entry exactly), OR
   - be marked status="needs_creation" with a real manufacturer part
     number in `value` and a short `rationale`.

   If you cannot find an existing part, mark it needs_creation rather
   than substituting a wrong existing one. The executor escalates
   needs_creation parts to the user; that is the right behavior.

3. **Connectivity policy: ports > block-local wires > cross-block labels.**
   For every electrical connection, define a Net with all participating
   pins. The executor decides the visual representation per Net using a
   three-tier priority rule:

   **(a) Power and ground = port glyphs.** Set `is_power=true` or
   `is_ground=true` (see rule 4). The executor places a power-port glyph
   at every pin on the net — no wires, no labels.

   **(b) Block-local nets = WIRES (default).** When every pin on a Net
   lives in the same functional block (regulator + its passives, amp +
   its gain network, RF front-end + matching, MCU + its decoupling,
   sensor + its filter, etc.), the executor draws actual wires from pin
   to pin. Local sub-circuit topology MUST be visually traceable — a
   reader looking at the buck block should see the FB divider,
   compensation, bootstrap and LC output as ONE connected drawing, not
   a maze of name-matched label stubs. This is the default for any net
   that isn't power/ground.

   **(c) Cross-block nets = labels.** When pins span two or more
   functional blocks, every pin gets a net label. This is the canonical
   block-diagram-at-the-top-level read; wiring across blocks would
   produce inter-block spaghetti. MCU GPIO is almost always cross-block
   by definition (MCU pin in the MCU block, peripheral pin in an
   audio / RF / sensor block) and so almost always uses labels.

   **Common-sense override:** the priority order is (a) > (b) > (c).
   Within tier (b), a particular intra-block net MAY be promoted to a
   label IF a wire would genuinely tangle the block — e.g. a
   high-fanout local rail that touches every part in a 10-cap
   decoupling stack, or a control line that would have to weave between
   five other components to stay block-local. This is a deviation from
   the default, not the default itself. Every block-local net starts as
   wires; promoting one to a label requires a one-line justification in
   `open_questions` or in the Net comment.

   **Block membership** is expressed via `zones` (rule 11) or a `block`
   field on each Part. The executor reads block membership and applies
   (a)→(b)→(c) automatically; the planner's job is to assign each Part
   to a block and let the executor pick the representation.

   Buses are just named nets, one per signal — the same tier rule
   applies to each.

4. **Power and ground are explicit Nets** with `is_power=true` or
   `is_ground=true`. The executor uses power ports for those instead of
   plain net labels. Standard names: VCC / V3V3 / V5 / V12 / VBAT for
   power, GND for ground.

5. **Datasheet-first.** When choosing actives, base the topology on the
   manufacturer's recommended typical-application circuit. Decoupling
   and pull-ups must be present where the datasheet calls for them. If
   a value is uncertain, use the datasheet recommendation and record
   the assumption in `open_questions`.

6. **Prefer existing-lib parts** even when an arguably-better external
   part exists. Only choose needs_creation when the inventory truly
   lacks the function.

7. **NDA: never reference past designs, project history, or external
   customer work.** Your sources are: the chip's datasheet, the
   manufacturer reference design, and standard textbook topology.
   Cross-project reads breach NDA; never propose them.

8. **Keep the plan small.** If the spec implies 50+ parts, focus on the
   essential subset and use `open_questions` to surface scope decisions
   instead of silently expanding.

9. **Refdes convention:** R# resistors, C# capacitors, L# inductors,
   D# diodes, Q# transistors, U# ICs, J# connectors, SW# switches,
   F# fuses, FB# ferrites. Number from 1 per refdes-letter, no gaps.

10. **Sheets default to one called "main".** Multiple sheets only when
    the spec obviously needs sectioning (>30 parts, or distinct
    functional blocks).

11. **Zones are optional** placement guidance for the executor. Use them
    to cluster decoupling near its IC, separate analog from digital, etc.

12. **Atomic-parts contract.** When `status='existing'`, the planner
    must populate `mpn`, `footprint`, and `datasheet_url` on the Part
    from the inventory snapshot (which exposes those fields for every
    component when retrieved via `design.snapshot_inventory`). This
    matches the KiCad Atomic / Digi-Key Library / atopile / JITX
    standard: every existing symbol carries MPN + footprint + datasheet
    URL bound at the part level so the resulting BOM is complete and
    the PCB has a footprint on every component without human cleanup.
    Missing any of these fields emits an `atomic_parts` warning during
    `design.validate` and produces a BOM with blank MPN / Mfr columns.
    If the inventory snapshot itself is missing one of these fields on
    a component, surface that in `open_questions` rather than silently
    shipping an incomplete Part.

12b. **Agent-generated artifacts go in the local workspace, NEVER under
    the user profile.** Test projects, preview SVGs, snapshot JSON,
    debug dumps -- everything the agent creates as scratch output --
    must land under the current working directory (typically the
    eda-agent repo or wherever the user invoked the tool). Conventional
    locations:
    - `test_projects/` for dev / debug `.PrjPcb` files the agent
      creates while iterating
    - `.preview_*.svg` at the repo root for one-off preview renders
    - `.symbol_cache/` (gitignored) for the symbol-extraction cache

    NEVER default to `%USERPROFILE%\\EDA Agent\\projects\\...` or
    similar user-profile paths. That dir is reserved for the user's
    own deliberate projects and for the eda-agent IPC workspace.

    The agent must pick the project path from the user's explicit
    instruction or default to `<cwd>/test_projects/<name>/<name>.PrjPcb`.
    When the user gives a name only (no path), expand it to the local
    convention -- not a global path.

13. **User libraries are read-only.** Treat every SchLib that the agent
    did not author in the current session as the user's property and
    MUST NOT modify it. That includes:
    - pin geometry (Location, Orientation, length, name)
    - body primitives (rectangles, lines, polygons, arcs, fill color)
    - parameter visibility / position / style
    - parameter values, designator prefix, description
    - component name / alias

    Allowed: USING parts from those libraries in placements, BOM,
    emitted schematics — read-only consumption is fine. Forbidden: any
    write that lands in the user's `.SchLib` file.

    Agent-owned libraries (created this session via
    `lib_create_symbol` or named in the task history as agent-authored)
    are the only ones the agent may restyle, fix, or restructure.
    Bulk operations like "hide Manufacturer params across every symbol"
    must include an explicit allowlist of agent-owned libraries.

    If the user wants the agent to touch their library, they will say
    so explicitly ("clean up the parameters in my caps library").
    Without that, the default is no-write.

14. **Symbol-local origin: top-leftmost pin wire-connection at (0, 0).**
    When authoring any new schematic symbol (`lib_create_symbol` +
    `lib_add_pins`), the local coordinate frame MUST be anchored so
    that the TOP-LEFTMOST pin's WIRE-CONNECTION POINT sits at exactly
    (0, 0). Concretely:
    - Identify the top-leftmost pin: smallest X column among left-side
      pins, then largest Y within that column.
    - Place that pin so its wire-connection (electrical end, where a
      wire would snap) lands at (0, 0).
    - Every other pin's Y is ≤ 0 from there; right-column wire
      connections sit at (W, 0) for the top-rightmost pin, where W is
      the body width (typically 1000 mils for an SOIC-8-style block).
    - Body rectangle top edge aligns with Y = 0 (or just below);
      bottom edge wraps the lowest pin.

    Why: a consistent local origin means placing the same symbol on a
    schematic always behaves the same way (the placed instance's
    reported anchor point matches the wire grid), and wire routing
    code in the pipeline doesn't have to special-case per-symbol
    offsets. Aligns with Altium's own default behaviour for new
    components and keeps the wire grid clean.

    Concretely with the standard 200-mil pin length and 100-mil grid:
    - Top-leftmost pin: Location = (200, 0), Orientation = 2 (leftward)
      → wire snaps at (200 − 200, 0) = (0, 0). ✓
    - Top-rightmost pin: Location = (body_width, 0), Orientation = 0
      → wire snaps at (body_width + 200, 0). ✓
    - Subsequent pins on the same column step DOWN in 100-mil
      increments: Y = −100, −200, etc.

15. **All pin locations AND rectangle corners must lie on the 100-mil
    grid.** Off-grid coordinates break Altium's snap mechanism and
    make wires look frayed when placed instances are dragged. The
    `tools/library.py` helpers (`lib_add_pins`,
    `lib_add_symbol_rectangle`, `lib_add_symbol_lines`,
    `lib_add_symbol_arc`, `lib_add_symbol_polygon`) round every coord
    to the nearest 100 before sending to the bridge, so callers can
    pass approximate values and trust the snap — but never deliberately
    pass off-grid values expecting them to land off-grid.

16. **Hide non-essential parameters on agent-authored symbols.**
    Visible by default on the symbol body: Designator (the refdes
    like U1, R1), Comment / Value (the part value). Hidden by
    default: Manufacturer, Manufacturer Part Number, Datasheet. The
    hidden parameters still exist on the symbol and appear in BOM
    output; they just don't clutter the schematic. When creating a
    new symbol the agent should set `IsHidden = true` on those
    parameters immediately after creation.

17. **Symbol body fill: Altium default yellow.** New symbol bodies
    (the bounding `eRectangle`) should use `AreaColor = 8454143`
    (Altium's standard light-yellow body) with `IsSolid = true`.
    Bare-outline bodies look like first-draft work and don't match
    the rest of the user's library.

18. **IC schematic symbols: functional pin layout, NOT package order.**
    When authoring a schematic symbol for an IC via
    `lib_create_symbol` + `lib_add_pins`, NEVER lay the pins out in
    physical package order. Pins go ONLY on the LEFT and RIGHT sides
    of the body — never top or bottom. Group by function:
    - Inputs on the LEFT (pins pointing left):
      power inputs (VIN / VCC / V+), signal inputs (IN+ / IN- /
      VSENSE / FB), control inputs (EN / SS / SHDN / RESET).
    - Outputs on the RIGHT (pins pointing right):
      power outputs (PH / SW / VREG / VREF), signal outputs (OUT /
      COMP / drive), status outputs (PG / FAULT / NIRQ).
    - Ground (GND / V-) on the LEFT or RIGHT — conventionally
      bottom-LEFT (below the inputs) or bottom-RIGHT, never
      bottom-edge of the body.
    - Bidirectional / paired pins (BOOT-PH, OSC, REF, BST) on
      whichever side keeps the wiring natural for the typical
      application — BOOT next to PH on the right makes the
      bootstrap cap obvious; OSC pair on one side.

    The pin's package number goes into the `designator` field; the
    package pinout is for the PCB footprint, not the schematic. A
    sequential package-order symbol forces every reader to mentally
    re-route the schematic. For passives (2-3 pin parts), the rule
    relaxes — there's only one or two sensible layouts. The rule
    applies to anything with 4+ pins.

## Tool-usage rules (read before driving the tools)

Operational rules for using the MCP tools correctly, independent of any
one design. They apply in every session.

1. **Datasheet before any device claim.** Beyond design-time part choice
   (rule 5), NEVER state a pin function, number, rating, package, polarity,
   or behaviour from symbol metadata / a distributor page / memory. Fetch
   and cite the manufacturer datasheet first, for any device, in any
   context. Tool responses carry a `_datasheet_guidance` block — treat it
   as a checklist, not an FYI.

2. **SPICE models are vendor-only.** When setting up simulation, fetch the
   manufacturer-published `.mdl` / `.ckt` / `.lib` model. NEVER hand-write
   or LLM-generate a SPICE model from datasheet reasoning — the poles/zeros
   and process corners won't match silicon.

3. **Inventory lookup is naming-agnostic.** Read the `design_snapshot_inventory`
   result semantically and pick parts by parametric match (value, package,
   rating). NEVER hard-code or regex against one library's `lib_ref` naming
   layout — the planner is the matcher, not a string template.

4. **Prefer bulk tools over looping.** `obj_batch_modify`, `pcb_move_components`,
   `sch_place_components`, `sch_place_wires`, `sch_set_components_parameters`,
   etc. do N operations in one IPC round-trip. Looping the singular variant
   costs one LLM turn each — 10–100× slower wall-clock. Plan the whole set,
   then issue one batch.

5. **Target the document explicitly.** Schematic placement and most
   mutations act on the ACTIVE document, and a freshly `app_create_document`'d
   sheet is NOT auto-focused — parts can silently land on the wrong open
   sheet. Pass `document_path` to `sch_place_components` (it
   focuses the sheet first and aborts if focus fails), or
   `app_set_active_document` before any active-doc mutation. For deterministic
   reads, prefer `scope=doc:<path>` (e.g. `obj_query`) over active-doc
   tools.

6. **ECO (schematic → PCB) is not headless.** `proj_sync_pcb` fires the real
   Engineering Change Order, but Altium's change-review dialog is
   non-suppressible by design — a human must click **Execute Changes**.
   Don't call `proj_sync_pcb` in an unattended run; it blocks until someone
   interacts. After an attended ECO, the rest of the PCB tools work
   normally.

7. **`pcb_place_components` has two modes.** *Geometry only* (footprint +
   designator) leaves the board UNSYNCED — no link, no pad nets; pads are
   unconnected (DRC flags them) and a later ECO treats the parts as "extra
   in PCB". Fine for artwork, panelization, or testing. *Synced* — also
   pass `unique_id` (the schematic component's UniqueId, from
   `query_objects(eSchComponent, "Designator.Text,UniqueId")`) and
   `pad_nets` `{pad: net}` (from the compiled netlist via
   `proj_get_connectivity_many`). That stamps the sch↔PCB link AND creates +
   assigns each pad's net, giving real connectivity (ratsnest + DRC) with
   NO ECO dialog — the headless way to populate a board from a compiled
   schematic. (`proj_sync_pcb` / a real attended ECO remains the canonical
   path when a human can click the dialog.)

8. **Connectivity review uses the netlist, never the render.** The FIRST
   priority for any review or check that concerns electrical connection (what
   sits on a net, what a pin connects to, missing or extra connections,
   single-pin or no-driver nets, schematic-to-PCB drift) is the actual net
   data, read from the compiled design: `proj_get_nets`, `proj_get_connectivity` /
   `proj_get_connectivity_many`, `obj_crossref_net`, `proj_compare_sch_pcb`,
   `proj_get_unconnected_pins`, `proj_get_erc_violations`. Read the connections; do not
   infer them from a picture.

   The SVG renders (`sch_render_svg`, `pcb_render_svg`, `design_visual_review`)
   are for VISUAL and PLACEMENT review ONLY: schematic layout and readability,
   PCB part placement, silkscreen, spacing, overlaps. They MUST NEVER be used
   to judge connectivity. A wire that looks joined in an image may not share a
   net, and a net can be electrically correct while the drawing looks messy.
   Connectivity comes from the netlist; the render comes from the geometry.
   Do not substitute one for the other.

## Autonomous design workflow

The agent is the planner. There is no hardcoded topology library, no
closed-form solver per converter family, and no curated parts pool. For
each new spec the agent reads the manufacturer datasheet, transcribes
the typical-application circuit and computes values from the
datasheet's own formulas, then assembles a DesignPlan. The system
primitives below are deliberately generic — they apply equally to a
buck, an LDO, an MCU board, an audio amp, or a sensor frontend.

1. **Read the spec carefully.** Extract Vin/Vout/Iout/freq/ripple
   constraints, intended use, environment (industrial / consumer /
   automotive), and any explicit part-family preferences. If the spec
   is ambiguous, record the assumption in `open_questions`.

2. **Read this discipline + schema:** `design.get_discipline`.

3. **Read the user's library inventory:**
   `design.snapshot_inventory(library_paths=[...])`. The inventory
   exposes mpn / manufacturer / footprint / datasheet for every
   component. Prefer existing parts.

4. **Pick a candidate IC** for any active block in the design:
   - If the inventory has a suitable part, use it.
   - Otherwise propose a real MPN from a manufacturer search (TI,
     Analog Devices, MPS, Diodes, Richtek, ST, Microchip, Infineon,
     etc.) and mark the Part `status="needs_creation"` until the user
     adds it to a library OR you author it via `lib_*` tools.

5. **Fetch the datasheet** via WebFetch. Cite the datasheet URL on the
   Part (`datasheet_url`). Extract from the datasheet:
   - The **Typical Application Circuit** figure — the canonical
     topology the manufacturer recommends. Transcribe its parts list
     and connectivity literally; do not invent variations.
   - The **Pin Functions** table — exact pin numbers, names, and
     functional roles.
   - The **Application / Design Procedure** section — formulas for
     external component values (L, Cin, Cout, feedback divider,
     compensation, etc.). Compute the values yourself from those
     formulas; do not import a Python solver. Round to E12 / E96 /
     E6 standard values from the result.
   - The **Layout Guidelines** section — which nets are sensitive
     (feedback, compensation), which are noisy (switch node), which
     carry high current (input loop, output current). These map
     directly to `Net.role` tags (see step 7).

6. **Assemble the DesignPlan** from the datasheet transcription:
   - One `Part` per device shown in the typical-application figure.
     Populate `manufacturer` + `mpn` + `footprint` + `datasheet_url`
     on every existing-status Part (atomic-parts contract). Use the
     `value` field for capacitance / inductance / resistance.
   - One `Net` per electrical connection shown in the typical-app
     circuit, with all participating pins listed.
   - Set `is_power` / `is_ground` on rails so the executor uses power
     ports.

7. **Tag nets with role** (`Net.role`) when the datasheet's layout
   guidelines call out the net's electrical character. This is how
   the downstream PCB pass applies the right rule per net WITHOUT
   the agent or the layout code knowing what topology was generated.
   Common tags and the rule a generic PCB pass should infer from each:
   - `switch` — short and wide; small loop area; keep away from
     `feedback` / `analog_sensitive`. (SMPS SW node, gate-drive
     traces, MOSFET drain on a Class-D amp.)
   - `feedback` — sensitive; route on a quiet layer; keep away from
     `switch`. (FB pin trace, error-amp inputs.)
   - `high_current` — wide trace or copper pour. (VIN rail to bulk
     cap, VOUT rail to load, motor-drive output.)
   - `analog_sensitive` — quiet layer, far from digital / SMPS.
     (Op-amp inputs, ADC analog inputs, sensor signals.)
   - `control` — moderate width, no special handling. (Enable pins,
     GPIO, mode-select.)
   - `differential` — matched pair, length-controlled. (USB D+/D-,
     LVDS, Ethernet, CAN.)
   - `clock` — length-matched, shielded if high speed. (Crystal,
     SPI clock, DDR clock.)
   - Role is free-form; if a datasheet calls out a net category that
     doesn't fit one of these, invent a clear new tag and document
     it on the net in `open_questions`.

8. **`design.validate_plan(plan_json=...)`** — schema + cross-check.
   Cheap, no Altium round-trip.

9. **`design.execute_plan(plan_json=..., project_path=...)`** — opens
   / creates the project, places parts, drops labels / power ports
   at each pin endpoint, stamps Manufacturer / MPN / Value / Footprint
   on every placed symbol, saves.

10. **Read `design.execute_plan`'s return.** Failures with
    `pin_not_found` or `place_failed` are usually inventory / plan
    mismatches (wrong pin number on the symbol, missing part). Fix
    those before validating.

11. **`design.audit_schematic(project_path=...)`** — visual / layout
    audit BEFORE ERC. Three violation classes, each with enough geometry
    to compute a corrective move:
    - `overlaps`: pairs of components whose bboxes intersect → push apart.
    - `wire_crossings`: wires cutting through component bodies (not just
      landing on pins) → re-route around.
    - `stacked_ports`: 3+ power-port glyphs of the same net inside a
      small radius → consolidate or redistribute.
    Feed violations back into layout adjustments before ERC; messy layout
    manufactures spurious ERC noise downstream.

12. **`design.validate(project_path=...)`** — ERC + unconnected pins +
    atomic-parts warnings, structured ValidationReport.

13. **Iterate.** If `passed: false`, read the report's errors
    (`category` / `severity` / `refdes` / `pin` / `sheet` / `text`),
    revise the plan, loop back to step 8. Cap at 3 rounds; escalate
    with the latest report rather than thrashing.

## Notes

- The executor is mechanical: it only reads what is in the plan. Anything
  the planner forgets stays missing. Decoupling caps do not appear unless
  you put them in. Pull-ups, terminations, ESD diodes too.
- "needs_creation" parts halt `design.execute_plan` with a clear error.
  Treat that as a signal to either pick an existing part or branch into a
  library authoring sub-task before resuming.
- Net labels are dropped at the actual pin world coordinate via a Pascal
  helper that iterates pins on the placed component instance. If you see
  `PIN_NOT_FOUND` failures, your plan's pin id (number or name) does not
  match what the symbol exposes; query the inventory or look up the
  symbol to confirm the pin identifiers.
- Power vs ground:
  - `is_power=true` -> `sch_place_power_port` with a circle glyph (or a GND
    glyph variant if the net name contains `GND`).
  - `is_ground=true` -> `sch_place_power_port` with a GND glyph; `AGND` /
    `ANALOG` net names get the signal-ground variant; `EARTH` / `PE`
    get the earth glyph.
  - Plain net (neither flag) -> `sch_place_net_label`.
- Cross-sheet nets get a label on each sheet where a participating pin
  lives. The executor handles this automatically as long as each Part's
  `sheet` field is set correctly.
- ERC only sees what's connected by net labels / power ports. A net with
  one pin and no port is "floating" and ERC will flag it. Power and ground
  nets with `is_power` / `is_ground` set are exempt because the power
  port carries the connection.

## PCB placement discipline (post-ECO, layout phase)

Once parts are on the PCB, moving them is a separate concern from the
DesignPlan executor above. The same agent often drives both phases.
Apply these rules whenever calling `pcb_move_components`.

1. **Plan the whole cluster before moving anything.** Call
   `pcb_get_components` once and read the full layout state: each
   component's current (x, y, rotation, layer, footprint) and its
   `bbox` (axis-aligned bounding rectangle in mils). Sketch the target
   positions on paper or in text BEFORE issuing any move. A move tool
   call is for *applying* a placement decision, not for *exploring*
   one.

2. **Check every proposed move against existing components.** Call
   `pcb_check_placement_collision(designator, x, y, rotation?)` for
   each part you intend to move. The tool returns `clear: true` when
   the proposed bbox doesn't overlap any other component on the same
   side, or `clear: false` with a `colliding` list. Adjust the (x, y)
   until clear, THEN issue the move. Set `margin_mils` to require
   extra clearance.

3. **Place by functional cluster, not in arbitrary order.** Pick a
   functional group (power input + filtering, an IC + its decoupling,
   a connector + its ESD diodes), pick an anchor component, place it,
   place its supporting parts around it, verify clearance per move,
   then move on to the next cluster. This naturally avoids "I moved
   the IC to (X,Y) and now there's nowhere for its caps" thrash.

4. **Respect already-placed components.** Treat anything the user
   placed by hand as fixed unless told otherwise. Don't move
   pre-existing parts to make room; find space around them. If a
   layout genuinely can't fit, surface that to the user rather than
   shuffling their existing work.

5. **Prefer bulk-batch moves when you've planned a whole cluster.**
   `pcb_move_components` accepts a list of moves in one IPC call.
   Use it once per cluster after you've collision-checked every move
   individually, passing a single-element list when you only have one
   pre-computed position.

6. **Mils, not millimetres, in the move tools.** Coordinates in
   `pcb_move_components` and `pcb_check_placement_collision` are
   mils unless explicitly documented otherwise. Bounding boxes
   returned by `pcb_get_components` are also mils.

7. **Bottom-side components don't collide with top-side ones.** The
   collision check applies same-side AABB only. If you flip a
   component to bottom and place it under a top-side IC, that's a
   legal solid-geometry overlap (different layers). Use DRC if you
   need actual clearance rules enforced.
"""


def get_discipline() -> str:
    """Return the discipline doc + the embedded DesignPlan JSON schema."""
    schema_obj = DesignPlan.model_json_schema()
    schema_blob = json.dumps(schema_obj, indent=2)

    return (
        _DISCIPLINE
        + "\n## DesignPlan JSON schema\n\nYour DesignPlan must validate "
        + "against this schema:\n\n```json\n"
        + schema_blob
        + "\n```\n"
    )
