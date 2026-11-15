---
name: coreldraw-mcp-drawing
description: Draws and edits inside a running CorelDRAW through the coreldraw MCP server — shapes, curves, text, fills, outlines, effects, boolean operations, dimensions and connectors, layers, guides and the object tree (groups, names, paths) — with the coordinate, selector and index rules that keep the result predictable. Use when the user asks to "нарисуй в CorelDRAW", "сделай макет/визитку/логотип", "create a rectangle/text/circle in CorelDRAW", "add a drop shadow", "weld these shapes", "поменяй цвет заливки", "поставь текст по кривой", "проставь размеры", "соедини фигуры линией", "назови объекты / покажи дерево объектов", or wants an AI agent to modify the open CorelDRAW document.
---

# Drawing in CorelDRAW through MCP

Everything happens in the document that is **open in CorelDRAW**, on CorelDRAW's UI thread, and it
lands in CorelDRAW's own undo history. There is no sandbox copy: a wrong call edits the real file.

## Instructions

### Step 1: Establish the state before drawing anything

1. `get_document_info` — name, path, page count, **document unit**, active page.
2. `list_layers` — layer names, which one is active. New shapes go on the active layer.
3. `set_document_unit` if the user's numbers are in mm but the document is in inches (or the
   reverse). Do this **before** computing coordinates, never after.
4. No document open (`no active document`)? `create_document` first, then `set_page_size`.

### Step 2: Coordinates are document units, Y grows upwards

- Origin is the **bottom-left corner of the page**; `top` is numerically larger than `bottom`.
  A 100 mm tall page: `top = 100`, `bottom = 0`.
- `get_document_info.referencePoint` is a ruler display setting. It does **not** move the origin.
- Sizes and offsets are the same unit — `set_shape_size(100, 50)` means 100 × 50 document units.
- Shapes on a page other than the first report positions in a **document-wide frame**. Address them
  by `index` or `name`, not by absolute coordinates, or call `set_active_page` first and re-read.

### Step 3: Address shapes with the common selector

Almost every tool that acts on existing shapes takes the same selector arguments (the four
exceptions are called out below):

| Argument | Meaning |
|---|---|
| `index` | 1-based index on the **active layer** — wins over everything else |
| `name` | shape name |
| `type` | `rectangle`, `ellipse`, `curve`, `polygon`, `text`, `group`, `bitmap` |
| `all` | every shape in the target container |
| `layer` / `group` | *where* the filters look (a layer name, or a group path like `Logo / Icon`); on their own they select nothing |
| *(nothing)* | the current CorelDRAW selection |

Four tools are narrower: `get_shape_info`, `set_shape_position`, `delete_shape` and
`convert_text_to_curves` take only `index` or `name` on the active layer — no `type`, no `all`.
Shapes **inside a group** are invisible to the selector; reach them with `list_objects` +
`set_object_name`, then address the group itself.

Multi-shape tools (blend, group, boolean) need `select_shapes` with `indices: [1, 3]` first — a
single selector replaces the selection with one shape.

**Indices move.** A new shape is inserted at index 1, and index-inserting effects (`drop_shadow`)
shift everything below. Re-read `list_shapes` after any call that creates or inserts a shape; never
reuse an index across such a call.

### Step 4: Create primitives, then fix their outline

`create_rectangle` (`left`/`top`/`right`/`bottom`, optional `cornerRadius` 0–100),
`create_ellipse` (`left`/`top`/`right`/`bottom`), `create_line` (`startX`/`startY`/`endX`/`endY`),
`create_polygon` (`cx`/`cy`/`radius`/`sides`), `create_star` (`cx`/`cy`/`radius`/`points`,
`innerRatio` default 0.4), `create_spiral`, `create_graph_paper`, `create_curve` (`points`, `mode`,
`closed`), `create_connector` (`from`/`to`, `type` straight/rightAngle/bspline/bezier),
`create_dimension` (`points` — two, or three for `angular`; `type`, `placement`, `precision`,
`prefix`/`suffix`, `textSize`).

Two facts that surprise everyone:

- **`create_*` keeps CorelDRAW's default hairline outline.** For a pure fill, follow with
  `set_outline_none`. For a visible edge use `set_outline_color` + `set_outline_width`.
- **`create_polygon` with `sides: 4` is a diamond**, because the first vertex sits on the +X axis.
  For a square, create it as a rectangle, or rotate the polygon by 45°.

`create_curve` takes `[x, y]` pairs or `{ x, y, c1x, c1y, c2x, c2y }` objects, where `c1` is the
point's **incoming** handle and `c2` its outgoing one. An omitted handle is smoothed with a
Catmull-Rom tangent, so `mode: "smooth"` reproduces the Freehand/Pen feel and `polyline` stays
exact. Pass `closed: true` for a closed path.

### Step 5: Text

- `create_text` — artistic text at a baseline point (`x`, `y`).
- `create_paragraph_text` — inside a frame (`left`/`top`/`right`/`bottom`).
- Both accept `font`, `size` (points), `alignment`.
- `place_text_inside` requires **paragraph** text; CorelDRAW rejects artistic text there.
  `fit_text_to_path` puts text on an open or closed path.
- `get_text`, `replace_text` and an untargeted `convert_text_to_curves` cover **every page**. Other
  page-scoped tools follow the page active in CorelDRAW — move it with `set_active_page`.

### Step 6: Fill, outline, colour

Colours are `color` hex (`"#C9A227"`), `cmyk` (`"0,25,90,20"`) or `gray` (`0`–`100`).

- Uniform: `set_fill_color`; none: `set_fill_none`.
- Gradient: `set_fill_gradient` with `from`/`to`, `gradientType`
  (`linear`/`radial`/`conical`/`square`), `angle`, `steps`, `midpoint`. Note `gradientType` — plain
  `type` still selects shapes by type.
- Pattern/texture/PostScript: `set_fill_pattern` / `set_fill_texture` / `set_fill_postscript`.
  Careful with the first and the last: their `index` argument is the **pattern/entry number**, while
  the selector reads `index` as the **shape** index — `{"index": 3}` means shape 3 *and* entry 3.
  Prefer the `pattern`/`name` form and pick the shape by `name` or by selecting it.
- Outline: `set_outline_color`, `set_outline_width`, `set_outline_none`.
- Transparency: `set_transparency(percent)`, `clear_transparency`.
- Reading back: `get_shape_color` returns fill type and colours in hex/RGB/CMYK, outline colour and
  the transparency level — use it to verify instead of assuming.

### Step 7: Compose

`group_shapes` / `ungroup_shapes`, `combine_shapes` / `break_apart_shapes`,
`weld_shapes` / `trim_shapes` / `intersect_shapes`, `order_shape`
(`front`/`back`/`forward`/`backward`), `align_shapes`, `transform` tools
(`set_shape_position`, `set_shape_size`, `scale_shape`, `move_shape`, `rotate_shape`, `skew_shape`),
`duplicate_shape`, `clone_shape`, `copy_properties`, `set_locked`.

Boolean and group tools act on the **selection** — call `select_shapes` with `indices` first and
confirm the count with `get_selection`.

Effects: `blend_shapes`, `contour_shape`, `drop_shadow`, `envelope_shape`, `extrude_shape`,
`lens_shape`, `distort_shape`, `adjust_color`, and `clear_effect` / `flatten_effects` /
`separate_shape` to undo or bake them. A drop shadow inserts a **group** and shifts indices.

### Step 8: Verify, then hand off to export

Re-read `list_shapes` / `get_shape_info` (bounding box, type, name) and `get_shape_color` before
telling the user it is done. `get_document_info` shows the page count and active page when the work
spans pages. `list_objects` gives the tree **including group contents**, with the `path` that
`set_object_name` accepts — use it before reaching into a group, and name anything you will refer to
again. For output, use the `coreldraw-mcp-export` skill.

## Examples

**Визитка 90 × 50 мм, фон + заголовок:**

```
get_document_info                          -> unit: mm
set_document_unit mm                       (если нужно)
create_rectangle left=0 top=50 right=90 bottom=0
set_fill_color index=1 color="#1F1F1F"
set_outline_none index=1
create_text text="Осень" x=6 y=32 font="Arial" size=18
set_fill_color index=1 color="#C9A227"
```

**Логотип: сварить три выделенные фигуры и дать абрис**

```
get_selection                              -> 3 shapes
select_shapes indices=[1,2,3]
weld_shapes
list_shapes                                -> index of the result
set_outline_color index=<i> color="#C9A227"
set_outline_width index=<i> width=2
```

**Текст по кругу:** `create_ellipse` → `select_shapes` → `create_text` → `fit_text_to_path`
(`pathName` = имя эллипса). Для текста **внутри** фигуры — `create_paragraph_text`, затем
`place_text_inside`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Shapes land in the wrong place or upside down | Y-up origin mistaken for screen coordinates | recompute with `bottom` < `top`, origin at bottom-left |
| `index N` hits the wrong shape | indices shifted after an insert | `list_shapes` again, then address by `name` |
| Fill invisible | default hairline outline only, or white fill on white page | `set_outline_none`, check `get_shape_color` |
| `place_text_inside` fails | artistic text passed | create paragraph text instead |
| Boolean/group acts on one shape | plain selector replaced the selection | `select_shapes` with `indices` |
| Nothing happens on a page other than the first | tool follows the active page | `set_active_page` first |
| Knife / eraser / mesh fill / Smart Drawing requested | no programmatic interface in VGCore | explain the limitation; offer `trim_shapes`, `combine`+`break_apart`, or a gradient |

## Important

- **Read before you overwrite.** `list_shapes` output is the only reliable map of indices.
- **Some toolbox items cannot be driven** (knife, eraser, freehand picking, crop, virtual segment
  delete, smudge/roughen/smooth, smart drawing, smart fill, artistic media, mesh fill, interactive
  outline width, colour harmony, eye-dropper, tables, glyphs, callouts, symmetry, rollover and the
  rest of the list in `docs/tools.md`): they have no programmatic interface in CorelDRAW's object
  model. Say so instead of improvising a fake result, and offer the nearest equivalent (`trim_shapes`,
  `combine` + `break_apart`, a gradient instead of a mesh fill).
- Undo is CorelDRAW's — a destructive call is recoverable with `Ctrl+Z`, but only if the user has
  not saved in between. Mention the change you are about to make when it is destructive (`delete_shape`,
  `delete_layer`, `combine_shapes` on a whole selection).
- Work in the unit the user speaks: convert millimetres to the document unit once, in one place,
  and keep every later number in that unit.

## References

- `references/tool-reference.md` — tool groups with the arguments that matter
