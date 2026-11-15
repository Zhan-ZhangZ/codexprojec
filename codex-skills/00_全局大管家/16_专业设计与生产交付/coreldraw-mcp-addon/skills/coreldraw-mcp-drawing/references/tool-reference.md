# Tool reference — arguments worth remembering

Source of truth is always `tools/list` on the running server; this file records the groups and the
arguments that change behaviour. Coordinates are document units, Y up from the page's bottom-left.

## Documents and pages

| Tool | Key arguments |
|---|---|
| `create_document` | `unit` (`mm`, `cm`, `inch`, `px`) |
| `open_document` | `path`, optional `unit` — CorelDRAW may reopen a document in inches, so pass `unit` |
| `save_document` / `save_document_as` | `path` for the latter |
| `close_document` | `save` (boolean, default false) |
| `list_documents` / `get_document_info` / `get_pages` | — |
| `add_page`, `set_active_page` | page index / name |
| `set_page_size`, `set_page_orientation`, `set_document_unit` | `width`/`height`, `portrait`/`landscape`, unit name |

## Shapes

| Tool | Key arguments |
|---|---|
| `create_rectangle` | `left`, `top`, `right`, `bottom`, `cornerRadius` 0–100 |
| `create_ellipse` | `left`, `top`, `right`, `bottom` |
| `create_line` | `startX`, `startY`, `endX`, `endY` |
| `create_polygon` | `cx`, `cy`, `radius`, `sides` (first vertex on +X: sides 4 = diamond) |
| `create_star` | `cx`, `cy`, `radius`, `points`, `innerRatio` 0.4, first ray up |
| `create_spiral` | bounding box, `revolutions`, `spiralType`, `growthRate` |
| `create_graph_paper` | bounding box, `columns`, `rows` |
| `create_curve` | `points` (`[x,y]` or `{x,y,c1x,c1y,c2x,c2y}`), `mode` polyline/smooth/bezier, `closed` |
| `import_image` / `import_svg` | `path` (must be inside `AllowedRoots` when set) |
| `list_shapes` / `get_shape_info` / `delete_shape` | selector, or `index`/`name` for delete |

## Text

| Tool | Key arguments |
|---|---|
| `create_text` | `text`, `x`, `y` (baseline), `font`, `size`, `alignment` |
| `create_paragraph_text` | `left`, `top`, `right`, `bottom`, `text`, `font`, `size`, `alignment` |
| `get_text`, `replace_text` | optional selector; **without** one they cover every page |
| `convert_text_to_curves` | optional selector; untargeted = every page |
| `convert_text_type` | `textType` artistic/paragraph |
| `fit_text_to_path` | `pathIndex` or `pathName` |
| `place_text_inside` | `containerIndex` or `containerName`; paragraph text only |

## Dimensions and connectors

| Tool | Key arguments |
|---|---|
| `create_dimension` | `points` (two `[x, y]`, or three for `angular` — centre, first, second), `type` horizontal/vertical/slanted/angular, `placement` above/within/below, `precision` 0–9, `prefix`, `suffix`, `textSize` (points), `textX`/`textY` for the dimension line |
| `create_connector` | `from` and `to` (`[x, y]` or `{x, y}`), `type` straight/rightAngle/bspline/bezier, `cornerRadius` for `rightAngle` |

**The label comes out in millimetres whatever the document unit is.** The tool asks CorelDRAW for
the document's unit, but 27.x ignores it for the text it generates (and normalises
`Dimension.Linear.Units` back to mm), so a two-inch line is labelled `50,80 мм`. Say the unit out
loud, or pass `suffix` to correct it. Angular dimensions need three points; a linear one needs
exactly two.

## Objects and naming (inside groups)

| Tool | Key arguments |
|---|---|
| `list_objects` | `layer` (default: active), `group` — lists the layer or one group as a **tree**, every entry carrying its `path`; groups nest up to 6 levels, deeper ones are marked `truncated` |
| `set_object_name` | `path` (as reported by `list_objects`), `name`, optional `layer` to anchor a relative path |

A path looks like `Layer / Group / Object`; an unnamed object is addressed by its position as `[3]`.
These two are the only way to reach a shape **inside** a group: `list_shapes` and the selector see
the top level of a layer only. Naming an object (`set_object_name`) is also what makes later calls
survivable — a name does not shift when shapes are inserted, an index does.

## Colour, fill, outline

| Tool | Key arguments |
|---|---|
| `set_fill_color` / `set_outline_color` | `color` hex, `cmyk` "C,M,Y,K", `gray` 0–100 |
| `set_fill_gradient` | `from`, `to`, `gradientType` linear/radial/conical/square, `angle`, `steps`, `midpoint` |
| `set_fill_pattern` | `patternType` twoColor/fullColor/bitmap, `pattern` (name or bitmap file path), `foreground`, `background`, `fillWidth`; `index` = pattern number **and** shape index |
| `set_fill_texture` | `library`, `texture` |
| `set_fill_postscript` | `name`, or `index` — which also selects the shape by index |
| `set_fill_none`, `set_outline_none` | selector |
| `set_outline_width` | `width` in document units |
| `set_transparency` / `clear_transparency` | `percent` 0–100 |
| `get_shape_color` | selector; returns fill type, hex/RGB/CMYK, outline colour, transparency |

## Transform and edit

`set_shape_position` (`x`,`y`), `set_shape_size` (`width`,`height`), `scale_shape` (`factor`,
`factorY`), `move_shape` (`dx`,`dy`), `rotate_shape` (`angle`, optional `centerX`/`centerY`),
`skew_shape` (`angleX`,`angleY`), `duplicate_shape` (`count`,`offsetX`,`offsetY`), `clone_shape`
(`offsetX`,`offsetY`), `order_shape` (`position` front/back/forward/backward), `align_shapes`
(`align` left/right/hcenter/top/bottom/vcenter, `to` page/pagecenter), `copy_properties` (`sourceIndex` or `sourceName` + `fill`/`outlineColor`/`outlinePen`/`textAttrs`,
applied to the selector), `set_locked` (`locked`), `group_shapes`, `ungroup_shapes`.

## Selection

`select_shapes` — `index`, `indices` (`[1,3,5]`), `name`, `type`, `all`, or `layer`/`group` scope;
`clear_selection`; `get_selection`.

## Selector rules worth knowing

- **Precedence**: `index` wins; otherwise `name`/`type`/`all` are applied inside the container named
  by `group`, else by `layer`, else in the active layer; with none of those the tool uses the current
  CorelDRAW selection.
- **`layer` and `group` do not select on their own.** They narrow where a `name`/`type`/`all` filter
  looks. `{"group": "Logo"}` alone falls back to the current selection — pass `all: true` for "every
  object in that group".
- **Four tools take only `index` or `name`**: `get_shape_info`, `set_shape_position`, `delete_shape`
  and `convert_text_to_curves` address the active layer directly and reject `type`/`all`.
- **`index` is overloaded in `set_fill_pattern` and `set_fill_postscript`**: those two read `index`
  as the pattern/PostScript entry number, while the selector reads the same key as the shape index.
  `{"index": 3}` therefore means *shape 3 **and** entry 3*. Use the `name` form of the fill
  (`pattern`, `name`) and select the shape another way (`name`, or a selection) — or accept that the
  two numbers coincide.
- `convert_to_symbol` takes the **new symbol's** name in `name`, so `name` cannot also pick the
  shape there; select first.
- `rotate_shape` honours `centerX`/`centerY` only when **both** are given; one alone is ignored and
  the rotation happens around the page origin (0, 0). Same shape of trap in `extrude_shape`
  (`vpX`/`vpY`) and `distort_shape` (`originX`/`originY`).

## Boolean and shaping

`combine_shapes`, `break_apart_shapes`, `weld_shapes`, `trim_shapes`, `intersect_shapes` — act on the
selection, no arguments. `fillet_shape` / `chamfer_shape` (`distanceA`, `distanceB`) / `scallop_shape`
(`radius`) work on curves.

## Effects

| Tool | Key arguments |
|---|---|
| `blend_shapes` | two selected shapes; `steps`, `blendMode`, `spacing`, `angle`, `rotateShapes`, `loop` |
| `contour_shape` | `steps`, `offset`, `direction` inside/outside/toCenter |
| `drop_shadow` | `opacity`, `feather`, `offsetX`, `offsetY`, `color`/`cmyk`/`gray`, `shadowType` (flat/bottom/top/left/right) |
| `envelope_shape` | `mode`, `preset`, `keepLines` |
| `extrude_shape` | `depth`, `extrudeType`, `vpX`/`vpY`, `shading`, `bevelDepth` |
| `lens_shape` | `lensType`, `rate` |
| `distort_shape` | `distortType` pushPull/twister/zipper, `amplitude`, `angle`, `frequency` |
| `adjust_color` | `adjustment` invert/gamma/posterize/colorBalance/bci/hsl + its own values |
| `clear_effect` | `effect` blend/contour/distortion/dropShadow/envelope/extrude/lens/perspective/textOnPath/all |
| `flatten_effects`, `separate_shape` | selector |

## Symbols and PowerClip

`convert_to_symbol` (`name`), `revert_symbol_to_shapes`, `place_in_powerclip`
(`containerIndex`/`containerName`, `center`, `lock`), `extract_powerclip`.

## Layers, layout, navigation

| Tool | Key arguments |
|---|---|
| `create_layer` | `name` |
| `list_layers`, `set_active_layer`, `delete_layer` | layer name |
| `set_layer` | `name` (required), `visible`, `editable` (**true unlocks, false locks**), `printable`, `rename` |
| `move_shapes_to_layer` | destination layer name |
| `add_guide` | `type` horizontal/vertical/slanted, `position` or `positions`, `x`/`y`/`angle` |
| `list_guides`, `delete_guides` | optional orientation filter |
| `set_grid` | `visible`, `spacingX`, `spacingY`, `gridType` dot/line, `snap` |
| `set_zoom` | `percent`, `fit` (page/pageWidth/pageHeight/selection/allObjects/allPages/actual), `originX`/`originY` for pan |

Guides are per document; CorelDRAW keeps its guides layer with an empty shape list, so
`list_guides` reads them from the document's shape list instead.

## Export and import

`export`, `export_pdf`, `export_png`, `export_svg`, `export_dxf`, `import_image`, `import_svg` are
covered by the `coreldraw-mcp-export` skill — formats, size rules and the `AllowedRoots` check.

## Server

`server_status` — `running`, `endpoint`, `protocolVersion`, `server`, `version` (the add-on build
actually running — quote it in a bug report), `toolCount`, `enabledToolCount`, `startedAt`,
`requests`, `authRequired`, `logPath`.
`server_log` — `lines` (1–500, default 50): recent calls with arguments and timings.
