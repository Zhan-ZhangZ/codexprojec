# Nexar MCP Server

A Model Context Protocol (MCP) server for searching electronic components and retrieving datasheets via the Nexar API (formerly Octopart API).

> **Keywords**: Nexar, Octopart, MCP, electronic components, part search, datasheet, BOM, component sourcing, electronics design, PCB, Claude, AI assistant

## Purpose

This MCP server provides a secure interface for AI assistants to search the Octopart/Nexar component database, compare pricing across distributors, check availability, and retrieve datasheet URLs. Perfect for electronics engineers using Claude Desktop or other MCP-compatible AI assistants.

## Features

### Component-Specific Tools

The server exposes specialized tools for different component types, allowing the AI client to select the appropriate tool and pass structured parameters:

| Tool | Description |
|------|-------------|
| `find_resistors` | Search resistors by resistance, tolerance, power rating, mounting (SMD/through-hole) |
| `find_capacitors` | Search capacitors by capacitance, voltage, dielectric, mounting (SMD/through-hole) |
| `find_inductors` | Search inductors by inductance, current rating, DCR, mounting (SMD/through-hole), shielded |
| `find_semiconductors` | Search MCUs, transistors, ICs, diodes by part number, mounting (SMD/through-hole) |
| `find_crystals` | Search crystals/oscillators by frequency, ppm tolerance, mounting (SMD/through-hole) |
| `find_connectors` | Search connectors by type, pin count, pitch, mounting |
| `search_components` | Generic fallback for part numbers or unknown component types |
| `search_bom` | Bulk search multiple components in one call (for BOMs) |
| `get_part_details` | Get full specs, pricing, and availability for a specific MPN |
| `get_datasheet` | Get datasheet URL for a specific MPN |

### Common Parameters

All search tools share these parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `manufacturer` | string | Filter by manufacturer name |
| `max_price` | float | Maximum unit price in USD |
| `distributor` | string | Filter to specific distributor (digikey, mouser, etc.) |
| `quantity` | int | Quantity for price break lookup and sorting |
| `in_stock_only` | bool | Only show parts with stock |
| `limit` | int | Max results to return (default: 10) |

## Usage Examples

Just ask Claude naturally - it will select the appropriate tool automatically.

### Resistors

- "Find me a 10k 1% resistor in 0805 package"
- "I need 100 qty of 4.7k 0.25W resistors from DigiKey"
- "Search for 100 ohm 5% 0402 resistors under $0.01"

### Capacitors

- "Find a 100nF 16V X7R capacitor in 0805"
- "I need 10uF 25V caps in 1206 from Mouser"
- "Search for 47pF C0G capacitors in 0402 package"

### Inductors

- "Find a 2.2uH SMD inductor"
- "Find a 10uH inductor rated for 2A, shielded"
- "I need a 100nH 0603 inductor from DigiKey"
- "Search for 4.7uH through-hole inductors with 3A current rating"

### Semiconductors

- "Find STM32F103C8T6"
- "I need an N-channel MOSFET rated for 60V 10A in SO-8"
- "Search for ESP32-WROOM modules in stock"
- "Find LM7805 voltage regulators at DigiKey, I need 25"

### Crystals

- "Find an 8MHz crystal with 20ppm tolerance in HC-49 package"
- "I need a 32.768kHz crystal with 12pF load capacitance"
- "Search for 25MHz crystals with 10ppm or better"

### Connectors

- "Find USB-C receptacles for SMD mounting"
- "I need a 4-pin JST-PH connector with 2mm pitch"
- "Search for RJ45 jacks"
- "Find 40-pin male headers with 2.54mm pitch"

### Part Number Lookup

- "Look up part number LM358"
- "Find ATmega328P-PU in stock"
- "Search for BME280 sensors at Mouser"

### Part Details and Datasheets

- "Get me the datasheet for STM32F103C8T6"
- "Show me full details and pricing for RC0805JR-0710KL"

### Distributor Filtering

You can filter results to specific distributors:
- DigiKey
- Mouser
- Newark
- Arrow
- Farnell
- LCSC

Example: "Find 10k resistors in stock at DigiKey with at least 100 quantity"

### BOM Search (Bulk Component Lookup)

Search multiple components in a single call using `search_bom`. Pass a JSON object with arrays for each component type:

```json
{
  "resistors": [
    {"resistance": "10k", "tolerance": "1%", "package": "0805"},
    {"resistance": "4.7k", "package": "0603"}
  ],
  "capacitors": [
    {"capacitance": "100nF", "voltage_rating": "16V", "dielectric": "X7R", "package": "0805"},
    {"capacitance": "10uF", "voltage_rating": "25V"}
  ],
  "semiconductors": [
    {"query": "STM32F103C8T6"}
  ]
}
```

**Supported component arrays:**
- `resistors` - same parameters as `find_resistors`
- `capacitors` - same parameters as `find_capacitors`
- `inductors` - same parameters as `find_inductors`
- `semiconductors` - same parameters as `find_semiconductors`
- `crystals` - same parameters as `find_crystals`
- `connectors` - same parameters as `find_connectors`
- `components` - same parameters as `search_components` (generic fallback)

**Parameters:**
- `bom_json` (string): JSON object with component arrays
- `default_limit` (int): Results per component (default: 1). Override per-component with `"limit"` field.

Example: "Search for these BOM components: 10k 1% 0805 resistor, 100nF X7R capacitor, and STM32F103"

## Query Best Practices

Based on extensive testing against the Nexar API, here are tips for optimal results:

### Include Package in Query String (Recommended)

For semiconductors and complex components, include package specs directly in the `query` parameter rather than using the separate `package` filter:

```
# Better results - package in query
find_semiconductors(query="N-channel MOSFET 60V SO-8")
find_semiconductors(query="2N2222 NPN SOT-23")

# May return fewer results - package as separate filter
find_semiconductors(query="N-channel MOSFET 60V", package="SO-8")
```

### Keep Queries Focused

Simpler queries with key specifications often return better results than overly detailed queries:

```
# Good - focused query
find_semiconductors(query="STM32 microcontroller", distributor="digikey")

# May return 0 results - too specific
find_semiconductors(query="STM32 32-bit 3.3V microcontroller 20 GPIO")
```

### Use Filters for Business Constraints

The `distributor`, `quantity`, `max_price`, and `in_stock_only` filters work reliably:

```
find_resistors(resistance="10k", tolerance="1%", distributor="mouser", quantity=100)
find_capacitors(capacitance="100nF", max_price=0.05, in_stock_only=True)
```

### Passive Components Work Well with Filters

For resistors, capacitors, inductors, and crystals, the dedicated parameters work reliably:

```
find_resistors(resistance="4.7k", tolerance="1%", package="0805")
find_capacitors(capacitance="10uF", voltage_rating="16V", dielectric="X5R")
find_inductors(inductance="10uH", current_rating="2A", shielded=True)
find_crystals(frequency="8MHz", ppm_tolerance="20ppm")
```

## Prerequisites

- Docker Desktop with MCP Toolkit enabled
- Docker MCP CLI plugin (`docker mcp` command)
- Nexar API credentials (client ID and secret)

### Getting Nexar API Credentials

1. Sign up at https://nexar.com
2. Create or join an organization
3. Access portal.nexar.com to create an application
4. Note your Client ID and Client Secret

## Installation

### Step 1: Build Docker Image

```bash
docker build -t nexar-mcp-server .
```

### Step 2: Set Up Secrets

```bash
docker mcp secret set NEXAR_CLIENT_ID="your-client-id"
docker mcp secret set NEXAR_CLIENT_SECRET="your-client-secret"

# Verify secrets
docker mcp secret ls
```

### Step 3: Create Custom Catalog

Create or edit `~/.docker/mcp/catalogs/custom.yaml`:

```yaml
version: 2
name: custom
displayName: Custom MCP Servers
registry:
  nexar:
    description: "Search electronic components and get datasheets via Nexar/Octopart API"
    title: "Nexar"
    type: server
    dateAdded: "2025-12-05T00:00:00Z"
    image: nexar-mcp-server:latest
    ref: ""
    readme: ""
    toolsUrl: ""
    source: ""
    upstream: ""
    icon: ""
    tools:
      - name: find_resistors
      - name: find_capacitors
      - name: find_inductors
      - name: find_semiconductors
      - name: find_crystals
      - name: find_connectors
      - name: search_components
      - name: get_datasheet
      - name: get_part_details
    secrets:
      - name: NEXAR_CLIENT_ID
        env: NEXAR_CLIENT_ID
        example: "your-client-id"
      - name: NEXAR_CLIENT_SECRET
        env: NEXAR_CLIENT_SECRET
        example: "your-client-secret"
    metadata:
      category: integration
      tags:
        - electronics
        - components
        - nexar
        - octopart
        - hardware
      license: MIT
      owner: local
```

### Step 4: Update Registry

Edit `~/.docker/mcp/registry.yaml` and add under the `registry:` key:

```yaml
registry:
  # ... existing servers ...
  nexar:
    ref: ""
```

### Step 5: Configure Claude Desktop

Find your Claude Desktop config file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

Ensure your custom catalog is included in the args array:

```json
{
  "mcpServers": {
    "mcp-toolkit-gateway": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v", "/var/run/docker.sock:/var/run/docker.sock",
        "-v", "/Users/YOUR_USERNAME/.docker/mcp:/mcp",
        "docker/mcp-gateway",
        "--catalog=/mcp/catalogs/docker-mcp.yaml",
        "--catalog=/mcp/catalogs/custom.yaml",
        "--config=/mcp/config.yaml",
        "--registry=/mcp/registry.yaml",
        "--tools-config=/mcp/tools.yaml",
        "--transport=stdio"
      ]
    }
  }
}
```

### Step 6: Restart Claude Desktop

1. Quit Claude Desktop completely
2. Start Claude Desktop again
3. Your new tools should appear!

## Configuration

The server supports optional configuration via environment variables. By default, results are sorted by lowest price at 100 quantity.

### Available Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXAR_DEFAULT_SORT_QUANTITY` | `100` | Quantity break used for price sorting (e.g., 100, 1000) |
| `NEXAR_DEFAULT_DISTRIBUTOR` | (none) | Always filter to this distributor (e.g., "digikey", "mouser") |
| `NEXAR_DEFAULT_IN_STOCK_ONLY` | `false` | Only show in-stock parts by default |

### Setting Configuration

Add environment variables to your catalog entry in `~/.docker/mcp/catalogs/custom.yaml`:

```yaml
registry:
  nexar:
    # ... other settings ...
    env:
      - name: NEXAR_DEFAULT_SORT_QUANTITY
        value: "100"
      - name: NEXAR_DEFAULT_DISTRIBUTOR
        value: "digikey"
      - name: NEXAR_DEFAULT_IN_STOCK_ONLY
        value: "true"
```

Or for local testing, set environment variables directly:

```bash
export NEXAR_DEFAULT_SORT_QUANTITY=1000
export NEXAR_DEFAULT_DISTRIBUTOR=mouser
export NEXAR_DEFAULT_IN_STOCK_ONLY=true
```

## Architecture

```
Claude Desktop -> MCP Gateway -> Nexar MCP Server -> Nexar GraphQL API (Octopart)
                                       |
                              Docker Desktop Secrets
                              (NEXAR_CLIENT_ID,
                               NEXAR_CLIENT_SECRET)
```

## Development

### Local Testing

```bash
# Set environment variables for testing
export NEXAR_CLIENT_ID="your-client-id"
export NEXAR_CLIENT_SECRET="your-client-secret"

# Run directly
python octopart_server.py

# Test MCP protocol
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | python octopart_server.py
```

### Adding New Tools

1. Add the function to `octopart_server.py`
2. Decorate with `@mcp.tool()`
3. Update the catalog entry with the new tool name
4. Rebuild the Docker image

## Troubleshooting

### Tools Not Appearing
- Verify Docker image built successfully
- Check catalog and registry files
- Ensure Claude Desktop config includes custom catalog
- Restart Claude Desktop

### Authentication Errors
- Verify secrets with `docker mcp secret list`
- Ensure secret names match in code and catalog
- Check that your Nexar application has the Supply scope enabled

### No Results Found
- Try a broader search query
- Check that the part number is correct
- Some parts may not be in the Nexar/Octopart database

## Security Considerations

- All secrets stored in Docker Desktop secrets
- Never hardcode credentials
- Running as non-root user
- Sensitive data never logged

## API Rate Limits

The Nexar API has usage limits based on your subscription plan. Each search query counts against your monthly quota based on the number of matched parts returned.

## Related

- [Nexar API Documentation](https://nexar.com/api)
- [Octopart](https://octopart.com) - The component search engine powered by Nexar
- [Model Context Protocol](https://modelcontextprotocol.io) - The protocol this server implements

## License

MIT License
