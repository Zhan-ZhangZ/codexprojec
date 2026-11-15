# Export formats and the options that apply

`export` takes `format` without the leading dot. Everything else is optional.

## Vector formats

`pdf`, `svg`, `svgz`, `eps`, `ai`, `dxf`, `plt`, `wmf`, `emf`

- No size argument is needed or used — vector output keeps the document geometry.
- `range` still applies: `page` (active), `all`, `selection`.
- `dxf` is a CAD interchange format: it carries lines and curves, not fills or effects. Use it when
  the consumer is a laser cutter or a CAD tool, and tell the user what it drops.
- `svg`/`svgz` are the portable choice for web and for re-import; text stays text unless converted
  to curves, so a consumer without the font will substitute it.

## Raster formats

`png`, `jpg`/`jpeg`, `tif`/`tiff`, `gif`, `bmp`, `webp`, `psd`, `pcx`, `tga`, `ico`

A size is mandatory: `dpi` between 18 and 1200, or `width`/`height` in pixels given **together**.
`width` and `height` override `dpi`.

| Option | Default | Applies to | Meaning |
|---|---|---|---|
| `dpi` | — | all raster | resolution relative to the document's physical size; 18–1200 |
| `width` / `height` | — | all raster | pixel size, overrides `dpi` |
| `transparent` | `false` | formats with alpha (png, webp, tiff, psd) | transparent background |
| `antiAliasing` | `normal` | all raster | `none`, `normal`, `supersampling` |
| `dithered` | `false` | indexed formats (gif, ico, pcx) | dithering of the palette |
| `colorProfile` | `true` | all raster | embed/convert with the document colour profile |
| `maintainLayers` | `true` | layered formats (psd, tiff) | keep layers as separate objects |
| `compression` | `zip` | tiff, and others that support it | `none`, `zip`, `lzw` |

## Shortcut tools

| Tool | Equivalent |
|---|---|
| `export_pdf` | `export(format: "pdf")` |
| `export_png` | `export(format: "png")` |
| `export_svg` | `export(format: "svg")` |
| `export_dxf` | `export(format: "dxf")` |

They take `path` and `range`. `export_png` still needs a size, `export_pdf` takes none. For anything
else — `jpg`, `tiff`, `eps`, `ai`, `webp`, `psd`, `plt`, `wmf`, `emf`, `gif`, `bmp`, `pcx`, `tga`,
`ico` — call `export` with `format`.

## Choosing dpi

| Target | dpi |
|---|---|
| Screen / web preview | 72–150 |
| Office print, proofs | 150–200 |
| Commercial print | 300 |
| Large-format banners (viewed from distance) | 100–150 at final size |

Pixel maths when the user gives a target size instead of a dpi: `px = mm / 25.4 × dpi`. For a
90 × 50 mm card at 300 dpi that is 1063 × 591 px.

## Importing

`import_image` and `import_svg` read from `AllowedRoots`-restricted paths and place the file on the
active layer. After import: `list_shapes` for the new index, then `set_shape_size` /
`set_shape_position`. SVG arrives as curves — recolour with `set_fill_color`, `set_outline_color`.
