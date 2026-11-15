---
name: coreldraw-mcp-setup
description: Connects an MCP client to the CorelDRAW MCP add-on and diagnoses why it does not work — the docker panel, the loopback endpoint, config.json, AuthToken, the log, disabled tools. Use when the user says "подключи CorelDRAW", "MCP не подключается", "докер не появляется", "coreldraw mcp не работает", "connection refused 8765", "unauthorized coreldraw", "how do I point Claude/Cursor at CorelDRAW", or asks to check whether the CorelDRAW MCP server is running.
---

# CorelDRAW MCP — connection and diagnosis

The add-on runs an MCP server **inside `CorelDRAW.exe`**, bound to loopback:
`http://127.0.0.1:8765/mcp` (port configurable). There is no separate process to start — the
docker panel inside CorelDRAW is the switch.

## Instructions

### Step 1: Confirm the server is up before touching the client

Call `server_status` first. It answers without CorelDRAW-specific state:

- `running: true` plus `endpoint`, `toolCount`, `enabledToolCount`, `version`, `logPath` — the
  server is alive and the client's URL is wrong.
- `running: false` — the panel has not started it. Ask the user to open **Window ▸ Dockers ▸
  Corel MCP** (or **Tools ▸ Corel MCP**) and press **Start**.

If MCP calls themselves fail, fall back to plain HTTP with the shell:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8765/health'          # -> "ok"
Invoke-RestMethod 'http://127.0.0.1:8765/mcp' -Method Post -ContentType 'application/json' `
  -Body '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

"docker" here is CorelDRAW's word for a docked panel, not the container runtime.

### Step 2: Point the client at the endpoint

Most clients take the URL alone (Streamable HTTP):

```json
{
  "mcpServers": {
    "coreldraw": { "url": "http://127.0.0.1:8765/mcp" }
  }
}
```

Per-client shapes, and the `mcp-remote` stdio bridge for clients without HTTP transport, are in
`references/client-config.md`. The panel's **Copy config** button produces a paste-ready block for
the current port — prefer it over typing the URL.

### Step 3: Read the log, not the tea leaves

The add-on writes `corelmcp.log` next to itself when that folder is writable. It usually is **not**:
the MSI installs into `Program Files`, which a non-elevated CorelDRAW cannot write, so in practice
the log lands in `%LOCALAPPDATA%\CorelMcp\corelmcp.log`, with `%TEMP%\corelmcp.log` as the last
resort. Do not guess — `server_status` returns the file actually in use as `logPath`; `server_log`
returns the last N lines over MCP; the panel's **Log** pane mirrors it. Startup failures leave a
trace there — a blank log almost always means the add-on never loaded.

### Step 4: Check config.json only after the server answers

`config.json` sits next to `CorelMcp.dll` in `<CorelDRAW>\Programs64\Addons\CorelMcp\`. Details and
all seven fields are in `references/config-fields.md`. Two are frequent culprits:

- `AuthToken` set, client sends no `Authorization: Bearer <token>` → every request returns 401.
- `AllowedRoots` set, export/import path outside it → the tool rejects the path.

`Port`, `BindAddress`, `AuthToken` and `MaxBodyBytes` take effect on the next server start (toggle
**Stop/Start** or restart CorelDRAW). `AllowedRoots` is read from the add-on's configuration object,
which is reloaded whenever the panel re-reads `config.json` — reopening the docker or opening the
**Tools** dialog is enough, no restart. `DisabledTools` is applied immediately by the **Tools**
button.

### Step 5: When the panel itself is missing

That is a CorelDRAW workspace problem, not an MCP one:

1. Close CorelDRAW, start it while holding **F8** to reset the workspace (back up
   `%AppData%\Corel\…\Workspace` first).
2. Still absent: copy `UserUI.xslt` to `UserDraw.xslt` in the add-on folder and restart.

## Examples

**User:** «MCP не подключается, Claude пишет connection refused»
→ `server_status` → `running: false` → ask them to open the docker and press Start → re-check
`/health` → then reconnect the client.

**User:** «Подключи CorelDRAW к Cursor»
→ `server_status` shows `running: true`, `endpoint: http://127.0.0.1:8765/mcp` → hand them the
Cursor block from `references/client-config.md` → tell them to restart Cursor's MCP connection and
list tools; a successful `tools/list` is the confirmation, not the absence of an error.

**User:** «Почему инструмент отвечает 401?»
→ `server_status` reports `authRequired: true` → the client block needs an `Authorization: Bearer`
header or `AuthToken` must be emptied in `config.json` and the server restarted.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Failed to bind to address` | port already in use | change `Port` in `config.json`, restart the server |
| 404 with `Use /mcp` | wrong path | the endpoint is `/mcp`, health is `/health` |
| 401 `Unauthorized` | `AuthToken` set | send `Authorization: Bearer <token>` or clear the field |
| 403 `Forbidden` | request came from a browser page on a non-loopback origin, or with a `Host` header that does not name loopback (DNS rebinding) | connect from a native client, CLI or the `mcp-remote` bridge — not from a web page; check that the URL uses `127.0.0.1`/`localhost` |
| 415 `Unsupported Content-Type` | request sent as `text/plain` or form data | send `Content-Type: application/json` |
| 413 `Request body too large` | body over `MaxBodyBytes` (4 MiB default) | shrink the payload (bulk point arrays), or raise `MaxBodyBytes` and restart the server |
| 503 `Server is busy` | four requests are already in flight (each may wait on CorelDRAW's UI thread) | retry after a second; serialise calls instead of firing them in parallel |
| `no active document` | nothing open | call `create_document` or `open_document` first |
| Tool missing from `tools/list` | disabled | `server_status` → `enabledToolCount`, re-enable with the **Tools** button |
| Client sees no tools at all | client cached a failed connection | restart the client's MCP connection |
| `/health` answers, MCP calls fail | proxy/middleware rewriting the request | connect directly to loopback, disable any HTTP inspector |

## Important

- **Never widen `BindAddress`** without also setting `AuthToken`: anyone who reaches the endpoint
  drives CorelDRAW with the application's full privileges.
- Do not restart CorelDRAW to pick up `config.json` if unsaved drawings are open — ask first.
- Report the add-on version from `server_status` (`version`) in any bug report; the two supported
  CorelDRAW releases (2025 = 26, 2026 = 27) ship different builds.
