# CorelDRAW MCP Add-on

**中文版：[README.zh-CN.md](README.zh-CN.md) · Русская версия: [README.ru.md](README.ru.md)**

[![docs](https://github.com/pefedotov/coreldraw_mcp/actions/workflows/docs.yml/badge.svg)](https://github.com/pefedotov/coreldraw_mcp/actions/workflows/docs.yml)

Ask your AI agent to draw — and watch it draw in the CorelDRAW document you already have open.
This add-on turns a running CorelDRAW Graphics Suite into a **Model Context Protocol (MCP)
server**, so MiMoCode, Claude Desktop, Cursor, OpenCode or any other MCP client works with the
real object model: shapes, text, fills, outlines, effects, layers, pages and export.

```
MCP client  ──HTTP(loopback)──▶  CorelDRAW.exe (add-on)  ──VGCore COM──▶  drawing
             http://127.0.0.1:8765/mcp
```

## What you can ask it to do

Once connected, a prompt is enough — the agent picks the tools:

> Create an A6 flyer: a 148 × 105 mm rectangle with a gold gradient fill, the title "Autumn Sale"
> in 36 pt artistic text at the top, and export a 200 dpi PNG next to the document.

> Weld the three shapes I have selected, give the result a 2 mm outline in #C9A227, and group it
> with the logo.

> On every page of this document, replace the text "2025" with "2026" and convert the headings to
> curves.

Everything happens in your open document, in CorelDRAW's own undo history — the add-on drives the
application's object model instead of faking clicks.

## Quick start (60 seconds)

1. **Install the add-on.** Download `CorelMcpAddon-27.msi` (CorelDRAW 2026) or
   `CorelMcpAddon-26.msi` (CorelDRAW 2025) from [Releases](https://github.com/pefedotov/coreldraw_mcp/releases/latest) and run it; the
   `-ru` build of each carries Russian dialogs.
   Windows will ask twice — SmartScreen ("More info → Run anyway", for a package without a
   recognised publisher) and UAC (the add-on installs per machine). Both are expected; details in
   [`docs/installing.md`](docs/installing.md#what-you-will-see-before-the-installer-starts).
   No package published yet, or you prefer to build locally? See [Building](#building).
2. **Start CorelDRAW** and open **Window ▸ Dockers ▸ Corel MCP** (or **Tools ▸ Corel MCP**). A
   docker is CorelDRAW's name for a docked panel — nothing to do with the container runtime. The
   panel must report `running`; opening it is what starts the server.
3. **Point your client at the endpoint.** Most clients need only the URL:

   ```json
   {
     "mcpServers": {
       "coreldraw": { "url": "http://127.0.0.1:8765/mcp" }
     }
   }
   ```

   Ready-to-paste blocks for Claude Desktop, Cursor, MiMoCode, OpenCode and generic
   Streamable-HTTP clients are in [`docs/client-config.md`](docs/client-config.md).
4. **Ask for a drawing.**

The endpoint is `http://127.0.0.1:8765/mcp`; `GET /health` returns `ok`. If nothing connects, the
log says where it stopped — see [When something goes wrong](#when-something-goes-wrong).

## Will this work for me?

| | |
|---|---|
| Application | CorelDRAW Graphics Suite **2025 (26)** or **2026 (27)** |
| OS | Windows |
| Rights | administrator, to install — the add-on lives under `Program Files` |
| Client | anything that speaks MCP Streamable HTTP, or a stdio bridge |

It will **not** work if:

- your CorelDRAW is older than 2025 — the two supported releases ship different interop assemblies,
  and this add-on is built against them;
- you are on macOS or on the web version;
- you have no administrator rights and cannot install under `Program Files`: CorelDRAW scans no
  per-user add-on folder (`%APPDATA%`, `%LOCALAPPDATA%`, `%ProgramData%` are not searched);
- your MCP client has neither HTTP transport nor a stdio bridge.

## Choose your path

**For designers** — [What you can ask it to do](#what-you-can-ask-it-to-do) is the short version.
Things worth knowing before you trust it with a real file:

- The AI works on the document that is open in CorelDRAW; unsaved work is at the same risk as if
  you were dragging shapes yourself. `Ctrl+Z` undoes it like any other edit.
- Tools that address shapes use a *1-based index on the active layer*, a *name*, or *your current
  selection*. After an index-inserting call (for example a drop shadow) the indices shift: ask the
  agent to re-read `list_shapes`.
- New primitives keep CorelDRAW's default hairline outline. Ask for "no outline" if you want a pure
  fill.
- Some toolbox items cannot be driven programmatically at all — the knife, the eraser, mesh fill,
  Smart Drawing and others work only with the mouse. The full list, with reasons, is in
  [`docs/tools.md`](docs/tools.md).
- The panel's **Tools** button lets you untick anything you do not want an agent to touch. The
  choice applies immediately and survives restarts.
- The endpoint listens on this machine only (`127.0.0.1`) and is not reachable from the network.

**For developers** — the add-on is a single `net48` assembly loaded into `CorelDRAW.exe`; the MCP
protocol and the JSON layer are built in, so there are no third-party runtime dependencies. The
protocol layer is Streamable HTTP over JSON-RPC 2.0. Sections below: [Tools](#tools),
[Repository layout](#repository-layout), [Building](#building), [Known quirks](#known-quirks),
[Security](#security).

## Tools

`tools/list` is the source of truth for what this build exposes — ask the agent, or call
`server_status` (it reports `toolCount` and `enabledToolCount`). Capability groups:

| Group | What it covers |
|---|---|
| documents & pages | create / open / save / close, page size, orientation, units, active page |
| shapes | rectangle, ellipse, line, polygon, star, spiral, graph paper, curves, image and SVG import |
| text | artistic and paragraph text, read / replace, text to curves, on a path, inside a shape |
| colour & fill | uniform, fountain, pattern, texture, PostScript fills; outline colour and width; transparency |
| transform | position, size, scale, move, rotate, skew, duplicate, clone, order, align, group, lock |
| selection | by index, indices, name, type or everything on the layer |
| boolean & shaping | combine, break apart, weld, trim, intersect, fillet, chamfer, scallop |
| effects | blend, contour, drop shadow, envelope, extrude, lens, distort, adjust colour, flatten |
| symbols & PowerClip | convert to symbol and back, place inside, extract |
| layers, layout, navigation | layers, guides, grid, zoom and pan |
| export | any supported format, plus `export_pdf` / `export_png` / `export_svg` / `export_dxf` |
| server | `server_status`, `server_log` (recent calls, arguments, timings) |

The canonical, complete group-by-group list lives in
[`docs/client-config.md`](docs/client-config.md#tools); the toolbox coverage checklist — including
the items the object model cannot reach — in [`docs/tools.md`](docs/tools.md).

## Configuration

`config.json` sits next to `CorelMcp.dll` in
`<CorelDRAW>\Programs64\Addons\CorelMcp\`:

| Field | Default | Meaning |
|---|---|---|
| `Port` | `8765` | TCP port of the endpoint |
| `BindAddress` | `127.0.0.1` | loopback only — do not widen it without `AuthToken` |
| `AutoStart` | `true` | start the server when the add-on loads |
| `AuthToken` | `""` | when set, requests must send `Authorization: Bearer <token>` |
| `MaxBodyBytes` | `4194304` | reject larger request bodies |
| `AllowedRoots` | `""` | directories that file-path arguments may point at; empty means no restriction |
| `DisabledTools` | `""` | tool names hidden from `tools/list` and rejected by `tools/call` |

The **Tools** button edits `DisabledTools` and applies it to the running server at once. Other
changes take effect on the next server start (toggle **Stop/Start**, or restart CorelDRAW).
[`docs/client-config.md`](docs/client-config.md) owns the details, including how each client is
configured.

## Repository layout

```
src/CorelMcpAddon/          the add-on
  Addon.cs                  entry point (CorelDRAW add-on hooks)
  ToolCatalog.cs            builds the tool registry
  Tools/                    one file per tool group, plus the registry and schema builders
  Mcp/                      Streamable HTTP server, MCP / JSON-RPC 2.0 protocol layer
  Json/                     hand-written JSON layer (no third-party assembly)
  Corel/                    COM bridge onto the VGCore object model
  Config/                   config.json model
  Ui/                       the docked panel
skills/                     three agent skills (setup, drawing, export): the rules a
                            client's model needs to drive the tools correctly
docs/                       installing, client config, toolbox coverage, doc checker
installer/                  WiX definition, build and signing script, EULA, version.txt
deploy/install.ps1          development deploy
LICENSE                     MIT
CHANGELOG.md                version history
```

`addon/` (the five files to copy for a manual install) is produced by a **Release** build; `dist/`
(MSI output) by `installer\build-msi.ps1`. Neither exists in a fresh clone — see
[Building](#building).

## Building

Requires a .NET SDK able to build `net48` (verified with .NET 10), a local CorelDRAW install that
provides `Corel.Interop.VGCore.dll`, and WiX Toolset v5 (restored as a local dotnet tool).

```powershell
dotnet build src\CorelMcpAddon\CorelMcpAddon.csproj -c Release -p:CorelDrawVersion=27
.\installer\build-msi.ps1                    # -> dist\CorelMcpAddon-27.msi
.\installer\build-msi.ps1 -Thumbprint <hex>  # sign it before distributing
```

`CorelDrawVersion` selects both the interop assembly to compile against and the install folder:
`26` = CorelDRAW 2025, `27` = CorelDRAW 2026 (the default).

For deployment there are three routes — the MSI, `deploy\install.ps1` for development, and a plain
folder copy — all described in [`docs/installing.md`](docs/installing.md). Administrator rights are
needed in every case.

The upstream test project is omitted from this skill package because it is not part of the runtime
payload. The interop assembly must still be present when building the add-on.

There is no hosted build: every file under `src/CorelMcpAddon/Tools` compiles against
`Corel.Interop.VGCore.dll`, which ships only with CorelDRAW, so a build runner would have to be a
licensed Windows machine. Build and test locally with the commands above before opening a pull
request. What does run automatically — on pushes to `main` and on every pull request, on a hosted
runner — is [the upstream documentation checker](https://github.com/pefedotov/coreldraw_mcp/blob/67c0be3faf44e8a4dbe5e5e90327b44df42f6618/docs/check-docs.ps1): the two READMEs stay in step, every relative link and anchor
resolves, no tool count is hard-coded in prose, every tool cited in `docs/tools.md` is a registered
one, every field of `config.json` is in the configuration table, the version in
`installer/version.txt` has a CHANGELOG section, and every registered tool is described in
`skills/`. `build-msi.ps1` bumps the patch version itself, and only after a successful build.
Setup and contribution rules: [the upstream contributor guide](https://github.com/pefedotov/coreldraw_mcp/blob/67c0be3faf44e8a4dbe5e5e90327b44df42f6618/.github/CONTRIBUTING.md).

## Known quirks

Worth knowing before you script against the API — the reasoning, and the rest of the list, is in
[`docs/client-config.md`](docs/client-config.md#tool-behaviour-worth-knowing):

- **Coordinates are in the document unit, Y growing upwards from the page's bottom-left corner.**
  The `referencePoint` reported by `get_document_info` is a ruler display setting and does not move
  the origin.
- **`create_*` primitives keep CorelDRAW's default hairline outline.** Call `set_outline_none` when a
  shape should be a pure fill.
- **Shape indices are a moving target.** `drop_shadow` inserts a group shape and shifts every lower
  index by one, so re-read `list_shapes` after any index-inserting call.

## When something goes wrong

| Symptom | What to do |
|---|---|
| The panel or the menu is missing | CorelDRAW caches its workspace. Close it, then start it while holding **F8** to reset the workspace (back up `%AppData%\Corel\…\Workspace` first). |
| Nothing connects, panel says `running` | Check the port: `config.json` `Port`, then `GET http://127.0.0.1:8765/health`. |
| `Failed to bind to address` | Port already in use — change `Port` and restart the server. |
| A tool answers "no active document" | Create or open a document first. |
| Anything else | Read the log. It is written next to the add-on (`corelmcp.log`) when that folder is writable, and the fallback is `%LOCALAPPDATA%\CorelMcp\corelmcp.log` — which is what an MSI install always gets, because `Program Files` is not writable for a non-elevated CorelDRAW. `server_status` reports the path in use (`logPath`), and the panel's **Log** pane shows the same lines. |

Longer table, plus installation problems: [`docs/client-config.md`](docs/client-config.md#troubleshooting)
and [`docs/installing.md`](docs/installing.md).

## Security

Everything stays on this machine. The endpoint binds `127.0.0.1` and is not reachable from the
network; the add-on contacts no external service.

Anyone who *can* reach it can drive your CorelDRAW session with the full privileges of the
application — read and write files through the document and export tools included. Defaults assume
you are the only user of the machine: `AuthToken` is empty, `AllowedRoots` is unrestricted.

If you need the endpoint beyond loopback, do all three: set `AuthToken`, narrow `AllowedRoots`, and
put it behind a tunnel you control. Changing `BindAddress` alone hands admin-level control of
CorelDRAW to anyone on the network. Reporting a vulnerability:
[the upstream security policy](https://github.com/pefedotov/coreldraw_mcp/blob/67c0be3faf44e8a4dbe5e5e90327b44df42f6618/.github/SECURITY.md).

## Documentation

- [`docs/installing.md`](docs/installing.md) — MSI, SmartScreen and UAC prompts, deployment, packaging internals
- [`docs/client-config.md`](docs/client-config.md) — connecting clients, `config.json`, tool groups, troubleshooting
- [`docs/tools.md`](docs/tools.md) — toolbox coverage checklist (`[x]` implemented, `[~]` not reachable through the object model)
- [`skills/`](skills/) — agent-facing instructions: connecting, drawing rules, export and its formats
- [`CHANGELOG.md`](CHANGELOG.md) — version history
- [Upstream contributor guide](https://github.com/pefedotov/coreldraw_mcp/blob/67c0be3faf44e8a4dbe5e5e90327b44df42f6618/.github/CONTRIBUTING.md) — building, testing, adding a tool

The detailed documents are in English; this README and [`README.ru.md`](README.ru.md) are kept in
step with each other.

## Licence

MIT — see [`LICENSE`](LICENSE). The MSI displays the same terms from `installer/EULA.rtf`, plus a
trademark notice: CorelDRAW is a trademark of Corel Corporation, and this add-on is not affiliated
with, endorsed by or sponsored by Corel.

Maintained by [@pefedotov](https://github.com/pefedotov) — issues and questions go to
[the issue tracker](https://github.com/pefedotov/coreldraw_mcp/issues).
