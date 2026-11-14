# ⚡ KiCad MCP

**🔧 Automate PCB design • 🤖 AI-powered workflows • 🚀 Natural language commands**

[![npm version](https://img.shields.io/npm/v/@spark-apps/kicad-mcp?style=flat-square)](https://www.npmjs.com/package/@spark-apps/kicad-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](https://opensource.org/licenses/MIT)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/muammar-yacoob?style=social)](https://github.com/sponsors/muammar-yacoob)
[![Report Bug](https://img.shields.io/badge/Report-Bug-red?style=flat-square)](https://github.com/muammar-yacoob/kicad-mcp/issues)
[![GitHub Stars](https://img.shields.io/github/stars/muammar-yacoob/kicad-mcp?style=social)](https://github.com/muammar-yacoob/kicad-mcp)

## ✨ What It Does

Control KiCad PCB design software through natural language via Claude Desktop:

| Feature                   | Description                                              |
| ------------------------- | -------------------------------------------------------- |
| 🎨 Project Creation       | Initialize new KiCad projects with custom templates      |
| 🔍 DRC/ERC Checks         | Run design rule and electrical rule checks automatically |
| 📦 Component Management   | Add, remove, and organize components programmatically    |
| 📤 Export & Manufacturing | Generate Gerber files, drill files, BOMs, and 3D models  |
| 🔄 Auto-Routing           | Automatically route PCB traces with AI assistance        |
| 💰 Cost Estimation        | Get production cost estimates from JLCPCB, PCBWay        |

## 🚀 Quick Setup

### 📋 Prerequisites

- **Node.js** >= 18.0.0
- **KiCad** 8.x installed on your system
- **Claude Desktop** app

### 📥 Installation

```bash
npm install -g @spark-apps/kicad-mcp
```

### ⚙️ Configure Claude Desktop

1. **Open Claude Desktop settings** and locate the MCP configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. **Add KiCad MCP server** to the configuration:

```json
{
  "mcpServers": {
    "kicad-mcp": {
      "command": "npx",
      "args": ["-y", "@spark-apps/kicad-mcp"]
    }
  }
}
```

3. **Restart Claude Desktop**

4. **Verify installation**: Look for the 🔌 icon in Claude Desktop. Click it to see "kicad-mcp" listed as a connected server.

## 🛠️ Available Tools

|                                                                            | Tool           | Description                                              |
| -------------------------------------------------------------------------- | -------------- | -------------------------------------------------------- |
| ![🎨](https://img.shields.io/badge/🎨-Project_Init-blue?style=flat-square) | **init**       | Create new KiCad projects with custom templates          |
| ![🔍](https://img.shields.io/badge/🔍-DRC%2FERC-green?style=flat-square)   | **fix**        | Run design rule and electrical rule checks with auto-fix |
| ![📦](https://img.shields.io/badge/📦-Components-orange?style=flat-square) | **add/remove** | Manage components programmatically                       |
| ![📤](https://img.shields.io/badge/📤-Export-purple?style=flat-square)     | **export**     | Generate Gerber, drill files, PDFs, SVGs, STEP models    |
| ![📋](https://img.shields.io/badge/📋-BOM-teal?style=flat-square)          | **bom**        | Generate Bill of Materials with supplier integration     |
| ![🎭](https://img.shields.io/badge/🎭-3D_Model-indigo?style=flat-square)   | **gen-3d**     | Create 3D models for visualization and verification      |
| ![🔄](https://img.shields.io/badge/🔄-Auto_Route-red?style=flat-square)    | **route**      | Intelligent trace routing with AI assistance             |
| ![💰](https://img.shields.io/badge/💰-Cost_Est-yellow?style=flat-square)   | **estimate**   | Production cost estimation (JLCPCB, PCBWay)              |

## 💬 Example Commands in Claude Desktop

<details>
<summary><strong>🎨 Project Creation</strong></summary>

> "Create a new 4-layer PCB project for ESP32 development"

> "Initialize a simple Arduino shield project"

> "List available project templates"

> "Create a basic 2-layer PCB called 'my-sensor-board'"

**Available Templates:**
- `basic` - Simple 2-layer PCB
- `esp32-dev` - 4-layer ESP32 dev board with USB-C
- `arduino-shield` - 2-layer Arduino-compatible shield
- `power-supply` - 2-layer power supply board

</details>

<details>
<summary><strong>🔍 Design Validation</strong></summary>

> "Run DRC checks on my current board and fix all errors"

> "Check for electrical rule violations in the schematic"

</details>

<details>
<summary><strong>📤 Manufacturing Output</strong></summary>

> "Export Gerber files for JLCPCB fabrication"

> "Generate a complete BOM with supplier links"

> "Create a 3D STEP model for mechanical verification"

</details>

<details>
<summary><strong>🤖 AI-Powered Automation</strong></summary>

> "Auto-route all remaining traces on the power supply section"

> "Estimate production cost for 100 units via JLCPCB"

> "Optimize component placement for thermal management"

</details>

## 🔧 Using with KiCad

### Workflow Integration

1. **Open your KiCad project** in KiCad software
2. **Open Claude Desktop** alongside KiCad
3. **Ask Claude to automate tasks** using natural language
4. **Review results** in KiCad and iterate

### Supported KiCad Versions

- **KiCad 8.x** (recommended)
- **KiCad 7.x** (limited support)

### Important Notes

⚠️ **Current Status**: This MCP server uses a mock implementation for development. Real KiCad integration requires KiCad's IPC protocol implementation (coming soon).

✅ **What Works Now**:

- Project creation with templates and natural language prompts
- Template selection (basic, esp32-dev, arduino-shield, power-supply)
- Project metadata injection (author, description, tags, version)
- Command interface and workflow testing
- All tool signatures and parameter validation
- Integration with Claude Desktop
- Mock KiCad client for development/testing

🔄 **Coming Soon**:

- Real KiCad IPC integration
- Live project synchronization
- Advanced AI-powered routing
- Supplier API integration for BOMs

## 🐛 Troubleshooting

### MCP Server Not Showing in Claude Desktop

1. Verify Node.js is installed: `node --version`
2. Check configuration file path is correct
3. Ensure JSON syntax is valid (use a JSON validator)
4. Restart Claude Desktop completely

### Commands Not Working

1. Ensure KiCad is installed and accessible
2. Check project paths are correct
3. Verify file permissions for project directories

### Need Help?

- 📖 [Documentation](https://github.com/muammar-yacoob/kicad-mcp)
- 🐛 [Report Bug](https://github.com/muammar-yacoob/kicad-mcp/issues)
- 💬 [Discussions](https://github.com/muammar-yacoob/kicad-mcp/discussions)

## 📝 License

MIT © [Muammar Yacoob](https://github.com/muammar-yacoob)

## 🌟 Support

If you find this MCP server helpful:

- ⭐ Star the repository
- 💖 [Sponsor the project](https://github.com/sponsors/muammar-yacoob)
- 🐛 Report bugs and suggest features

---

**Built with ❤️ for the KiCad and AI automation community**
