# Home Assistant MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for integrating with [Home Assistant](https://www.home-assistant.io/), allowing LLMs to control and query your smart home.

## Features

- Query and control Home Assistant entities via natural language
- Works with any MCP-compatible client (like Claude Desktop)
- Provides tools for state management, service calls, history, and more
- Secure authentication using Home Assistant long-lived access tokens
- Multiple transport options (stdio for local processes, SSE for remote clients)
- Demo mode with mock data for testing and demonstration when Home Assistant is not available

## Installation

```bash
# Install globally using bun
bun install -g home-assistant-mcp-server

# Or install from source
git clone https://github.com/oleander/home-assistant-mcp-server.git
cd home-assistant-mcp-server
bun install
bun run build
bun link
```

## Configuration

Create a `.env` file in your current directory with the following variables:

```
# Required configurations
HASS_URL=http://your-home-assistant:8123  # URL to your Home Assistant instance
HASS_TOKEN=your_long_lived_access_token   # Long-lived access token for authentication

# Optional configurations
PORT=3000                # Port for the HTTP server (default: 3000)
HASS_MOCK=false          # Enable mock data mode when Home Assistant is unavailable (default: false)
```

### Environment Variables

| Variable     | Required | Default | Description                                                                                |
| ------------ | -------- | ------- | ------------------------------------------------------------------------------------------ |
| `HASS_URL`   | Yes      | -       | URL to your Home Assistant instance (e.g., http://homeassistant.local:8123)                |
| `HASS_TOKEN` | Yes      | -       | Long-lived access token for authenticating with Home Assistant                             |
| `PORT`       | No       | 3000    | Port number for the HTTP server when using HTTP/SSE transport                              |
| `HASS_MOCK`  | No       | false   | When set to "true", enables mock data mode for testing without a Home Assistant connection |

To get a long-lived access token:

1. Log in to your Home Assistant instance
2. Click on your profile (bottom left)
3. Scroll down to "Long-Lived Access Tokens"
4. Create a new token with a descriptive name
5. Copy the token value (you won't see it again)

## Usage

### Running as a standalone server

```bash
# Standard mode (requires a running Home Assistant instance)
home-assistant-mcp-server                # Start with HTTP/SSE transport
home-assistant-mcp-server --stdio        # Start with stdio transport for direct process communication

# Demo mode (with mock data when Home Assistant is unavailable)
home-assistant-mcp-server --mock         # Start with HTTP/SSE transport and mock data
home-assistant-mcp-server --stdio --mock # Start with stdio transport and mock data
```

### Integration with Claude Desktop

To use with Claude Desktop:

1. Edit your Claude Desktop config file:

   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the server configuration:

```json
{
  "mcpServers": {
    "homeassistant": {
      "command": "home-assistant-mcp-server"
      "env": {
        "HASS_URL": "http://your-home-assistant:8123",
        "HASS_TOKEN": "your_token_here",
        "HASS_MOCK": "true"
      }
    }
  }
}
```

If you have Home Assistant running, simply remove the `--mock` flag and set `HASS_MOCK` to `false`.

3. Restart Claude Desktop

## Available Tools

The server exposes several tools for interacting with Home Assistant:

- `states` - Query entity states
- `lights` - List lights
- `light` - Control a light
- `service` - Call Home Assistant services
- `history` - Retrieve historical entity data
- `services` - List available services
- `config` - Get Home Assistant configuration
- `domains` - List available domains
- `error_log` - Get Home Assistant error log
- `devices` - Get all devices in Home Assistant

For detailed usage examples, see [docs/hass-mcp.md](docs/hass-mcp.md).

## Security

This server requires a Home Assistant access token with full access. Consider these security recommendations:

- Only run the server on trusted networks
- Use HTTPS if exposing the server remotely
- Keep your `.env` file secure and don't commit it to source control
- Consider using a token with limited permissions when possible

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
