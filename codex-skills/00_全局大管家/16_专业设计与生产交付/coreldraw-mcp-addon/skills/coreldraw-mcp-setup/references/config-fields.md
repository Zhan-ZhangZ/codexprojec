# `config.json` fields, defaults and effects

`<CorelDRAW>\Programs64\Addons\CorelMcp\config.json`, next to `CorelMcp.dll`. The add-on writes the
defaults itself if the file is missing, so a hand-made file is optional.

```json
{
  "Port": 8765,
  "BindAddress": "127.0.0.1",
  "AutoStart": true,
  "AuthToken": "",
  "MaxBodyBytes": 4194304,
  "AllowedRoots": "",
  "DisabledTools": ""
}
```

| Field | Type | Default | Effect | When it applies |
|---|---|---|---|---|
| `Port` | integer | `8765` | TCP port of the endpoint | next server start |
| `BindAddress` | string | `127.0.0.1` | interface to bind | next server start |
| `AutoStart` | boolean | `true` | start the server when the add-on loads | next CorelDRAW start / server start |
| `AuthToken` | string | `""` | when non-empty, requests need `Authorization: Bearer <token>` | next server start |
| `MaxBodyBytes` | integer | `4194304` (4 MiB) | reject larger request bodies | next server start |
| `AllowedRoots` | string | `""` | comma- or semicolon-separated allowed directories for file-path arguments; empty = no restriction | as soon as the panel re-reads the file (reopen the docker or open the **Tools** dialog) — no restart needed |
| `DisabledTools` | string | `""` | comma-separated tool names hidden from `tools/list`, rejected by `tools/call` | immediately, when changed from the panel |

Values that make no sense are replaced by the defaults rather than rejected: a port outside
1–65535 falls back to 8765, a blank `BindAddress` falls back to `127.0.0.1`. The file is rewritten
with defaults if it cannot be parsed — the reason is logged, not shown in the panel.

## Security consequences worth stating out loud

- `AuthToken: ""` plus `BindAddress: "0.0.0.0"` means anyone on the network drives CorelDRAW with
  full application privileges, including reading and writing files through the document and export
  tools.
- The safe remote setup is all three: set `AuthToken`, narrow `AllowedRoots`, and tunnel the port
  rather than binding a wider interface.

## Enabling and disabling tools

The **Tools** button in the docker opens a tick list of every registered tool. Unticking one:

- removes it from `tools/list`, so a client's model cannot discover or call it;
- makes `tools/call` answer that the tool is disabled in the tool list;
- writes the comma-separated names to `DisabledTools` and applies them to the running server at
  once, without a restart or a reconnect.

`server_status` reports `toolCount` (registered) and `enabledToolCount` (what a client can see).
