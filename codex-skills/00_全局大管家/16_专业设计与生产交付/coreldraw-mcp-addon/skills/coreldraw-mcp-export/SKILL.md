---
name: coreldraw-mcp-export
description: Exports and imports files through the coreldraw MCP server — PNG/JPEG/TIFF rasters at a chosen dpi, PDF/SVG/EPS/AI/DXF vectors, whole documents or the selection — and checks the result actually landed on disk. Use when the user asks to "экспортируй в PNG", "сохрани в PDF", "сделай превью 300 dpi", "export the drawing as SVG", "выгрузи все страницы", "вставь картинку в макет", or asks why an export failed or came out wrong.
---

# Export and import through CorelDRAW

Export is a CorelDRAW save operation performed in the running application: the file appears where
you point it, with CorelDRAW's own exporter and its colour management.

## Instructions

### Step 1: Know what you are exporting

1. `get_document_info` — path, page count, **active page**, document unit. The document must be
   open; there is no export from a file the add-on has not loaded.
2. Decide the **range** deliberately:

| `range` | Effect |
|---|---|
| `page` (default) | the **active** page only |
| `all` | every page |
| `selection` | the current selection — call `select_shapes` first; the shapes resolved by the selector also **become** the CorelDRAW selection, replacing what the user had picked |

`export_pdf`, `export_png`, `export_svg`, `export_dxf` take the same `range` and are shortcuts for
`export` with a fixed format. `export_pdf` takes no size arguments at all.

### Step 2: Pick the format, then the size

`export(path, format)` takes the format without a dot, so one tool covers everything.

- **Vector**: `pdf`, `svg`, `svgz`, `eps`, `ai`, `dxf`, `plt`, `wmf`, `emf`.
- **Raster**: `png`, `jpg`/`jpeg`, `tif`/`tiff`, `gif`, `bmp`, `webp`, `psd`, `pcx`, `tga`, `ico`.

A raster export **requires an explicit size** — either `dpi` (18–1200) or `width`/`height` in pixels
(`width`/`height` override `dpi`, and the two must be given **together**). Without one the call is
rejected; do not guess the user's intent, ask or default to 300 dpi and say so.

Optional raster settings, all defaulting sensibly: `transparent` (alpha, default false),
`antiAliasing` (`none`/`normal`/`supersampling`), `dithered`, `colorProfile` (default true),
`maintainLayers` (default true), `compression` (`none`/`zip`/`lzw`).

### Step 3: Use a path that is allowed

`path` must be inside `AllowedRoots` when that field is set in `config.json`; otherwise the tool
rejects it. Prefer the document's own folder or an obvious output folder, and pass a **full** path —
a bare file name lands wherever CorelDRAW's working directory happens to be.

Write the path in a form CorelDRAW accepts on Windows (`C:\out\card.png`), and create the folder
beforehand if it does not exist.

### Step 4: Verify instead of assuming

After the call:

1. The tool's answer reports the file it wrote — read it.
2. Confirm on disk: file exists and has a plausible size (a 0-byte or 2 KB "PNG" means the exporter
   failed silently).
3. If the export is a render of the drawing, `get_shape_info` on a couple of shapes is a cheap way
   to prove the right document is open.

Report the absolute path, the format, the range and the pixel size or dpi — the user needs those to
place the file.

### Step 5: Importing assets into a document

`import_image(path)` and `import_svg(path)` place a file on the **active layer** of the active
document. Same `AllowedRoots` rule. After importing, `list_shapes` gives the new shape's index (it
sits at the top) and `set_shape_position` / `set_shape_size` place it. An SVG comes in as curves, so
it can be recoloured with `set_fill_color` / `set_outline_color` afterwards.

## Examples

**«Сделай превью текущей страницы в PNG 300 dpi»**

```
get_document_info                      -> active page 2 of 3, unit mm
export path="C:\work\card.png" format="png" range="page" dpi=300
```

**«Выгрузи весь документ в PDF»**

```
export_pdf path="C:\work\brochure.pdf" range="all"
```

**«Экспортируй только выделенное в SVG»**

```
get_selection                          -> 4 shapes, non-empty
export_svg path="C:\work\logo.svg" range="selection"
```

**«Поставь логотип.svg в макет»**

```
import_svg path="C:\work\logo.svg"
list_shapes                            -> new shape at index 1
set_shape_size index=1 width=40 height=40
set_shape_position index=1 x=70 y=8
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "raster export needs a size" | no `dpi` and no `width`/`height` | pass `dpi` (300 for print, 72–150 for screen) |
| Export rejected with a path error | path outside `AllowedRoots`, or folder missing | move the file under an allowed root, create the folder |
| Empty or almost empty file | exporter failed, wrong document open | re-check `get_document_info`, read `server_log` |
| Only one page came out | `range` defaulted to `page` | pass `range: "all"` |
| Selection exported as the whole page | selection was empty | `select_shapes` first, confirm with `get_selection` |
| PNG has a black or white background instead of transparency | `transparent` defaults to false | pass `transparent: true` for PNG |
| Text missing from an SVG | font substitution on the consumer side | export text as curves first (`convert_text_to_curves`), then export |
| DXF has no colours | DXF is a line format | export `pdf`/`svg` when colour matters |

## Important

- **Never invent a path.** Exporting overwrites without asking — confirm with the user before
  writing over an existing file that they did not name.
- CorelDRAW may export with its current colour profile; if the user cares about exact colour, say
  which profile was used (`colorProfile` is on by default).
- Export does not save the drawing. If the user wants the `.cdr` itself, call `save_document` (or
  `save_document_as` with a path) — a different operation from `export`.
- Multi-page PDF: `range: "all"` produces one PDF with all pages; per-page files need one call per
  page with `set_active_page` between them.

## References

- `references/formats.md` — format lists and the options each one honours
