# Logging

The server uses [Winston](https://github.com/winstonjs/winston) for structured logging. Logs are written to **stderr** (so they don't interfere with the MCP protocol on stdout) and, optionally, to files.

## Log levels

Set the level via environment variable:

```bash
EBAY_LOG_LEVEL=debug  # error | warn | info | http | verbose | debug | silly
```

## File logging

Enable persistent logs to disk:

```bash
EBAY_ENABLE_FILE_LOGGING=true
```

Log files are written to `~/.ebay-mcp/logs/`:

| File           | Contents                     |
| -------------- | ---------------------------- |
| `error.log`    | Error-level messages only    |
| `combined.log` | All log messages             |
| `debug.log`    | Debug and verbose messages   |

## Example output

```
[2024-01-15 10:30:45] [INFO] [Server] Starting eBay API MCP Server
[2024-01-15 10:30:45] [INFO] [Auth] Loading tokens from environment variables
[2024-01-15 10:30:46] [INFO] [Auth] Access token refreshed successfully
[2024-01-15 10:30:46] [HTTP] [API] Request: GET https://api.ebay.com/sell/inventory/v1/inventory_item
[2024-01-15 10:30:47] [HTTP] [API] Response: 200 OK
```
