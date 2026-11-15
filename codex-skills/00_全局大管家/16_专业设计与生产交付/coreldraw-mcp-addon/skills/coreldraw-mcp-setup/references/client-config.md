# Client configuration and `config.json`

## Client blocks

None of these files live in the CorelDRAW repository — each is the client's own configuration.

### Any Streamable-HTTP client

```json
{
  "mcpServers": {
    "coreldraw": { "url": "http://127.0.0.1:8765/mcp" }
  }
}
```

### Claude Desktop (stdio bridge, needs Node.js)

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

`.mimocode/mimocode.json` (project) or `~/.config/mimocode/mimocode.jsonc` (global):

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

## Manual verification without a client

```powershell
$url = 'http://127.0.0.1:8765/mcp'

# 1. initialize
Invoke-RestMethod $url -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","clientInfo":{"name":"manual"}}}'

# 2. list tools
Invoke-RestMethod $url -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# 3. call one
Invoke-RestMethod $url -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_document_info","arguments":{}}}'
```

`GET http://127.0.0.1:8765/health` returns `ok`.

## `config.json`

Next to `CorelMcp.dll`: `<CorelDRAW>\Programs64\Addons\CorelMcp\config.json`.

| Field | Default | Meaning |
|---|---|---|
| `Port` | `8765` | TCP port of the endpoint. Change it if something else owns the port. |
| `BindAddress` | `127.0.0.1` | Loopback only. Widening it without `AuthToken` exposes the session. |
| `AutoStart` | `true` | Start the server when CorelDRAW loads the add-on. |
| `AuthToken` | `""` | When set, every request must carry `Authorization: Bearer <token>`. |
| `MaxBodyBytes` | `4194304` | Reject larger request bodies. |
| `AllowedRoots` | `""` | Comma-separated directories that file-path arguments may point at; empty means no restriction. |
| `DisabledTools` | `""` | Tool names hidden from `tools/list` and rejected by `tools/call`. |

Everything except `DisabledTools` takes effect on the next server start. The **Tools** button in the
panel edits `DisabledTools` and applies it to the running server immediately.

## Log locations, in order

1. `<CorelDRAW>\Programs64\Addons\CorelMcp\corelmcp.log` — next to the add-on (the normal case)
2. `%LOCALAPPDATA%\CorelMcp\corelmcp.log` — fallback when the add-on folder is not writable
3. `%TEMP%\corelmcp.log` — last resort

`server_status` → `logPath` names the file in use. `server_log` returns the last lines (up to 500)
over MCP.

## Where the files live on disk

`<CorelDRAW>\Programs64\Addons\CorelMcp\` holds `CorelMcp.dll`, the zero-byte `Coreldrw.addon`
marker, `AppUI.xslt`, `UserUI.xslt` and `config.json`. There is no per-user add-on location:
`%APPDATA%`, `%LOCALAPPDATA%` and `%ProgramData%` are not scanned by CorelDRAW, and installing
requires administrator rights.
