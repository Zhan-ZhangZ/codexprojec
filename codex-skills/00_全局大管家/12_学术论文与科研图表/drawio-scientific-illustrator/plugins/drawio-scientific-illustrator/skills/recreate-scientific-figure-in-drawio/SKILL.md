---
name: recreate-scientific-figure-in-drawio
description: Recreate, trace, revise, inspect, or export static scientific figures and schematic illustrations live inside the visible draw.io desktop canvas through draw.io's own graph API. Use when the user wants to watch an MCP draw a reference figure step by step in draw.io, explicitly rejects XML-first generation or operating-system mouse/screen control, provides a PNG/JPEG/SVG/PDF reference to rebuild as editable draw.io geometry, requests targeted live changes, or needs final .drawio/PNG/SVG/PDF/JPG deliverables.
---

# Recreate Scientific Figures in draw.io

Use the plugin's live MCP tools whose names end in `drawio_live_launch`, `drawio_live_status`, `drawio_live_screenshot`, `drawio_live_add_shape`, `drawio_live_add_edge`, `drawio_live_update_cell`, `drawio_live_draw_sequence`, `drawio_live_fit`, `drawio_live_inspect`, and `drawio_live_save_snapshot`. Use file tools ending in `drawio_validate` and `drawio_export` only after the visible drawing has been saved.

## Hard boundary

- Control only draw.io's internal graph/model API through the live MCP server.
- Never use operating-system mouse, keyboard, window, or full-screen automation for this workflow.
- Never pre-build XML and then open it as the drawing method. Serialize `.drawio` only after live shapes and edges already exist on the visible canvas.
- Renderer screenshots are allowed only to inspect the draw.io canvas itself; they are not general computer-screen control.

## Workflow

1. Inspect every provided reference image with vision before creating XML. For a PDF, render the relevant page first. Do not merely embed the raster image and call it recreated.
2. Decompose the figure into editable primitives: canvas/aspect ratio, panels, containers, nodes, text, arrows, legends, repeated motifs, colors, stroke widths, fonts, and z-order. Identify any portions that must remain raster because draw.io primitives cannot reproduce them faithfully.
3. Call `drawio_live_launch` with a visible per-step delay, normally 400–1000 ms. Call `drawio_live_status` and require `graph_ready=true` before drawing.
4. Add geometry directly to the live canvas:
   - Use `drawio_live_add_shape` and `drawio_live_add_edge` for one deliberate visible step at a time.
   - Use `drawio_live_draw_sequence` only with a nonzero `step_delay_ms`; each operation must remain a separate draw.io model update so the user can watch it appear.
   - Use stable semantic cell ids from the beginning so later edges and edits can target exact elements.
5. Call `drawio_live_screenshot` after each logical section, not after every trivial cell. Inspect only the draw.io renderer and compare it with the reference.
6. Iterate directly in the live graph. Use `drawio_live_inspect` followed by `drawio_live_update_cell` for labels, styles, position, and size. Use `drawio_live_fit` to keep progress visible.
7. After the visible figure is complete, call `drawio_live_save_snapshot`. This is the first point at which `.drawio` XML should be serialized.
8. Call `drawio_validate`. Fix structural errors through the live graph when possible, then save again.
9. Export a review PNG with `embed=false` and `width=2000`. Check element count, wording, topology, alignment, overlap, clipping, arrow direction, color, whitespace, and correspondence to the reference.
10. After approval, export the requested deliverables. Default to an editable `.drawio` plus PNG. Use `embed=true` for final PNG/SVG/PDF so draw.io XML remains embedded where supported.

## Fidelity rules

- Match scientific meaning before decoration: labels, relationships, directionality, grouping, and panel structure must be correct.
- Recreate text as text and arrows as connectors; do not flatten them into a screenshot.
- Keep coordinates on a 10 px grid unless matching the reference requires finer placement.
- Use consistent fonts, stroke widths, arrowheads, corner radii, and semantic colors.
- Route connectors around unrelated shapes. Pin entry/exit points where multiple edges share a node.
- For microscopy, photographs, heatmaps, molecular renderings, or dense plotted data, explain that the live API currently focuses on editable draw.io primitives. Add a dedicated live image-insertion operation before attempting hybrid figures; do not silently fall back to XML-first construction.
- If a reference is ambiguous or too low-resolution to read, state the uncertain labels/elements instead of inventing them.

## Delivery

Return clickable paths for the `.drawio` source and each export. State validation status and briefly identify any intentionally rasterized portions.
