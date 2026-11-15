# Connecting an MCP client to CorelDRAW

> Installing or distributing the add-on? See [installing.md](installing.md) for the MSI
> package and the development install script.

Once the add-on is loaded, CorelDRAW hosts an MCP server **inside `CorelDRAW.exe`**.

- Endpoint: `http://127.0.0.1:8765/mcp` (adjust the port in `config.json`)
- Transport: MCP **Streamable HTTP** (JSON-RPC 2.0 over POST)
- Loopback only — nothing is exposed to the network.

Start CorelDRAW and confirm the docker panel ( **Window ▸ Dockers ▸ Corel MCP**, or
**Tools ▸ Corel MCP** ) shows `running`. ("Docker" is CorelDRAW's own term for a docked panel; it
has nothing to do with the container runtime.)

## config.json

Sits next to `CorelMcp.dll` in
`<CorelDRAW install>\Programs64\Addons\CorelMcp\config.json`.

| Field | Default | Meaning |
|---|---|---|
| `Port` | `8765` | TCP port for the endpoint. |
| `BindAddress` | `127.0.0.1` | Loopback only. Do not set `0.0.0.0`. |
| `AutoStart` | `true` | Start the server when CorelDRAW loads the add-on. |
| `AuthToken` | `""` | When set, requests must send `Authorization: Bearer <token>`. |
| `MaxBodyBytes` | `4194304` | Reject larger request bodies. |
| `AllowedRoots` | `""` | Comma-separated directories that file-path arguments may point at; empty means no restriction. |
| `DisabledTools` | `""` | Comma-separated tool names, hidden from `tools/list` and rejected by `tools/call`. |

Changes take effect the next time the server starts (toggle **Stop/Start** in the docker, or
restart CorelDRAW) — with one exception: `DisabledTools` is applied to the running server
immediately when it is changed through the docker's **Tools** button.

## Client configuration

The transport field differs per client, and so does the file the configuration goes in. **None of
these files belong to this repository** — each lives in your client's own configuration directory
(`.mimocode/`, `~/.cursor/`, the Claude Desktop app folder, …). Only copy the block that matches
your client.

### Any client supporting Streamable HTTP

Point the client at `http://127.0.0.1:8765/mcp` with transport `http`.
If the client only speaks stdio, wrap the URL with `mcp-remote` as shown under Claude Desktop.

### Claude Desktop (via the `mcp-remote` stdio bridge)

Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "coreldraw": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://127.0.0.1:8765/mcp"]
    }
  }
}
```

### Cursor

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "coreldraw": { "url": "http://127.0.0.1:8765/mcp" }
  }
}
```

### MiMoCode

`.mimocode/mimocode.json` (project) or `~/.config/mimocode/mimocode.jsonc` (global) — create the
file in your client's own directory, it is not part of this repository:

```json
{
  "mcp": {
    "coreldraw": {
      "type": "remote",
      "url": "http://127.0.0.1:8765/mcp"
    }
  }
}
```

Verify with `mimo mcp list` — it should report `✓ coreldraw connected`.

### OpenCode

OpenCode configuration file:

```json
{
  "mcp": {
    "coreldraw": {
      "type": "remote",
      "url": "http://127.0.0.1:8765/mcp",
      "enabled": true
    }
  }
}
```

## Manual verification

```powershell
$url = 'http://127.0.0.1:8765/mcp'

# 1. initialize
Invoke-RestMethod $url -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","clientInfo":{"name":"manual"}}}'

# 2. list tools
Invoke-RestMethod $url -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# 3. call a tool
Invoke-RestMethod $url -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_document_info","arguments":{}}}'
```

`GET http://127.0.0.1:8765/health` returns `ok`.

## Tools

`tools/list` is the source of truth. Groups:

- **documents** — `create_document`, `open_document`, `save_document`, `save_document_as`,
  `close_document`, `list_documents`, `get_document_info`, `add_page`, `get_pages`
- **pages & units** — `set_document_unit`, `set_page_size`, `set_page_orientation`,
  `set_active_page`
- **shapes** — `create_rectangle`, `create_ellipse`, `create_line`, `create_polygon`,
  `create_star`, `create_spiral`, `create_graph_paper`, `create_curve`, `import_image`,
  `import_svg`, `list_shapes`, `get_shape_info`, `delete_shape`
- **dimensions & connectors** — `create_dimension` (`horizontal`/`vertical`/`slanted`/`angular`),
  `create_connector` (`straight`/`rightAngle`/`bspline`/`bezier`)
- **text** — `create_text`, `create_paragraph_text`, `get_text`, `replace_text`,
  `convert_text_to_curves`, `convert_text_type`, `fit_text_to_path`, `place_text_inside`.
  `get_text`, `replace_text` and the untargeted `convert_text_to_curves` cover **every page** of
  the document, not just the active one.
- **colour & fill** — `set_fill_color`, `set_fill_gradient`, `set_fill_pattern`,
  `set_fill_texture`, `set_fill_postscript`, `set_fill_none`,
  `set_outline_color`, `set_outline_width`, `set_outline_none`,
  `set_transparency`, `clear_transparency`, `get_shape_color`
- **transform** — `set_shape_position`, `set_shape_size`, `scale_shape`, `move_shape`,
  `rotate_shape`, `skew_shape`, `duplicate_shape`, `clone_shape`, `order_shape`,
  `group_shapes`, `ungroup_shapes`, `align_shapes`, `copy_properties`
- **navigation** — `set_zoom` (`percent`, `fit`, `originX`/`originY`)
- **selection** — `select_shapes` (also takes `indices: [1,3,5]` to select several specific
  shapes at once), `clear_selection`, `get_selection`
- **boolean / shaping** — `combine_shapes`, `break_apart_shapes`, `weld_shapes`,
  `trim_shapes`, `intersect_shapes`, `fillet_shape`, `chamfer_shape`, `scallop_shape`
- **effects** — `blend_shapes`, `contour_shape`, `drop_shadow`, `envelope_shape`,
  `extrude_shape`, `lens_shape`, `distort_shape`, `adjust_color`, `clear_effect`,
  `flatten_effects`, `separate_shape`
- **symbols & PowerClip** — `convert_to_symbol`, `revert_symbol_to_shapes`,
  `place_in_powerclip`, `extract_powerclip`
- **layers** — `create_layer`, `list_layers`, `set_layer`, `set_active_layer`,
  `move_shapes_to_layer`, `delete_layer`
- **layout** — `set_grid` (spacing, dot/line, snap), `add_guide`, `list_guides`, `delete_guides`
- **export** — `export` (any format via `format`), plus the shortcuts `export_pdf`, `export_png`,
  `export_svg`, `export_dxf`. All take `range: "page" | "all" | "selection"` (default `page`).
  Vector formats: `eps`, `ai`, `pdf`, `svg`, `svgz`, `dxf`, `plt`, `wmf`, `emf`. Raster formats:
  `png`, `jpg`, `tiff`, `gif`, `bmp`, `webp`, `psd`, `pcx`, `tga`, `ico`. Raster export needs an
  explicit size (`dpi`, or `width`/`height`) and also takes `transparent`, `antiAliasing`,
  `dithered`, `colorProfile`, `maintainLayers`, `compression`.
- **server** — `server_status`, `server_log` (recent tool calls, arguments and timings)

### Tool behaviour worth knowing

- `create_star` emits the outline vertex by vertex: 2 x `points` vertices alternating between
  `radius` and `radius` x `innerRatio` (default 0.4), with the first ray pointing up. CorelDRAW's
  own `CreatePolygon2(Star: true)` is bypassed because it rejects small point counts (4 fails
  outright with a nonsensical sharpness range) and its sharpness cannot be set.
- `create_curve` never uses the length/angle `AppendCurveSegment` overload — that one silently
  mangles the path. Smoothing is a Catmull-Rom tangent through the neighbouring points, so any
  handle the caller omits still curves; `closed` smooths the closing seam too.
- `get_shape_color` reports the actual colour of a uniform or fountain fill (hex, RGB and CMYK),
  the outline colour, and the transparency level next to the type.
- Page-scoped tools follow the page that is active in CorelDRAW; use `set_active_page` to move it.
  Shapes on a page other than the first report their position in a document-wide frame, so address
  shapes by index or name rather than by absolute coordinates.
- Every `create_*` primitive keeps CorelDRAW's default hairline outline; call `set_outline_none`
  when a shape should be a pure fill. A `create_polygon` with `sides: 4` is already a diamond.
- `create_dimension` positions the dimension line at `textX`/`textY`, which default to the
  midpoint of the measured segment. `type` is `horizontal`, `vertical`, `slanted` or
  `angular`; the angular form takes three points (centre, first, second).
- `place_text_inside` puts a **paragraph** text into a closed shape (CorelDRAW rejects
  artistic text here). `fit_text_to_path` puts text on an open or closed path.
- Guide and grid settings are per document; `set_grid` also controls snapping.

### Enabling and disabling tools

The docker's **Tools** button opens a tick list of every tool. Unticking one hides it from
`tools/list` and makes `tools/call` reject it, so a client cannot use it. The choice is stored in
`config.json` as a comma-separated `DisabledTools` string and is applied to the running server
immediately — no restart, no reconnect. `server_status` reports both `toolCount` (everything
registered) and `enabledToolCount` (what a client can actually see).

### Choosing shapes

Every tool that acts on existing shapes takes the same selector:

| Argument | Meaning |
|---|---|
| `index` | 1-based index on the active layer |
| `name` | shape name |
| `type` | `rectangle`, `ellipse`, `curve`, `polygon`, `text`, `group`, `bitmap` |
| `all` | every shape on the active layer |
| *(nothing)* | the current CorelDRAW selection |

A tool that creates a shape reports the index the new shape actually got. CorelDRAW inserts
a new shape at the top of the active layer, so that index is usually `1`, not the layer's
shape count.

Tools that need several specific shapes (blending, grouping, boolean operations) accept
`indices` on `select_shapes`, e.g. `{"indices": [1, 3]}`. A plain selector replaces the
selection with a single shape, so use `indices` when you need more than one.

Guides are read and deleted through `list_guides` / `delete_guides`; CorelDRAW's own guides
layer keeps its shape list empty, so they are read from the document's shape list instead.

### Colours

Colour arguments accept `color` as hex (`"#C9A227"`), `cmyk` as `"C,M,Y,K"`, or `gray` as
0–100. `set_fill_gradient` additionally takes `from`/`to`, `gradientType`
(`linear`/`radial`/`conical`/`square`), `angle`, `steps` and `midpoint`. Note that
`gradientType` (not `type`) is the gradient kind, so the standard `type` selector still
selects shapes by shape type.

Coordinates and sizes are always in the **document unit** — check it with
`get_document_info` and change it with `set_document_unit`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Docker missing / menu absent | CorelDRAW caches the workspace. Launch while holding **F8** to reset it (back up `%AppData%\Corel\...\Workspace` first). |
| Docker still absent after F8 | If your build expects the per-application naming used by the built-in U2 add-on, copy `UserUI.xslt` to `UserDraw.xslt` in the add-on folder and restart. |
| `Failed to bind to address` | Port already in use. Change `Port` in `config.json` and restart the server. |
| `Access is denied` on install | `deploy\install.ps1` must run in an **elevated** PowerShell. |
| Tools return "no active document" | Call `create_document` or `open_document` first. |
| Anything else | Read the log — see [Logs](#logs) below, or the docker's Log pane. |

## Logs

The add-on writes `corelmcp.log` **next to itself**, in
`<CorelDRAW install>\Programs64\Addons\CorelMcp\`. That folder sits under `Program Files`, which the
running application cannot write to, so the log falls back to
`%LOCALAPPDATA%\CorelMcp\corelmcp.log` when the add-on directory turns out to be read-only — and to
`%TEMP%\corelmcp.log` if even that fails.

Do not guess which one you got: `server_status` returns the file in use as `logPath`, and the same
lines are mirrored in the docker's **Log** pane. `server_log` returns the last N lines over MCP.
