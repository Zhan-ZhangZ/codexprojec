# Using the KiCad MCP Server

## Now Creating Real KiCad Files!

**The KiCad MCP now generates REAL KiCad files** using the Python `kiutils` library:

- ✅ Creates actual `.kicad_pro`, `.kicad_sch`, and `.kicad_pcb` files
- ✅ Files can be opened in KiCad software
- ✅ Generates 3D models (STEP/VRML) via KiCad CLI
- ⚠️ Requires Python 3 with `kiutils` package installed
- ⚠️ 3D export requires KiCad CLI to be installed

## Prerequisites

### Required:
1. **Python 3** - Must be installed and available as `python3`
2. **kiutils** - Install with: `pip install kiutils`

### Optional (for 3D export):
3. **KiCad** - Install KiCad with CLI tools
4. **kicad-cli** - Must be in your system PATH

## What The MCP Does

When you use KiCad MCP tools in Claude Desktop, the server:

- ✅ Accepts your commands and validates parameters
- ✅ Creates real `.kicad_pro`, `.kicad_sch`, and `.kicad_pcb` files on disk
- ✅ Generates 3D models (STEP/VRML) using KiCad CLI
- ✅ Files can be opened and edited in KiCad
- ✅ Returns paths to created files
- ⚠️ DRC/ERC checks require KiCad CLI (not yet implemented)
- ⚠️ Auto-routing not yet implemented

## How to Use It

### 1. In Claude Desktop

Once configured (see main README.md), you can interact with the MCP using natural language:

```
User: Create a new KiCad project called "my-led-board"
Claude: [Uses kicad_init_project tool]
Result: JSON response confirming project creation
```

### 2. Understanding Responses

The MCP returns **JSON responses** with file paths. Claude Desktop processes these and you'll see:

```json
{
  "success": true,
  "projectPath": "./my-led-board/my-led-board",
  "files": {
    "project": "./my-led-board/my-led-board.kicad_pro",
    "schematic": "./my-led-board/my-led-board.kicad_sch",
    "pcb": "./my-led-board/my-led-board.kicad_pcb"
  },
  "message": "Project 'my-led-board' created successfully with real KiCad files"
}
```

**AND actual files are created on your filesystem!**

### 3. Common Workflows

#### Create a Project

```
"Create a 4-layer ESP32 development board project"
```

The MCP will:

- Parse your requirements (4 layers, ESP32)
- Select or create appropriate template
- Generate real .kicad_pro, .kicad_sch, and .kicad_pcb files
- Return file paths you can open in KiCad

#### Add Components

```
"Add an ATtiny85 microcontroller at position 50,50mm"
```

The MCP will:

- Validate component parameters
- Add component to the .kicad_pcb file
- Save the updated PCB file
- Return component details with auto-generated reference (e.g., "U1")

#### Run Checks

```
"Run DRC and ERC checks on the project"
```

The MCP will:

- ⚠️ DRC/ERC not yet implemented (requires KiCad CLI)
- Return placeholder results for now

## Viewing Results

With the file-based implementation:

1. **Real files ARE created** - `.kicad_pro`, `.kicad_sch`, `.kicad_pcb` files written to disk
2. **Open in KiCad manually** - navigate to the project folder and open files in KiCad
3. **3D models generated** - STEP/VRML files created via KiCad CLI (if installed)
4. **Files persist** - projects remain on disk after Claude Desktop closes

## What You See

- ✅ Claude confirms actions with file paths
- ✅ Real files in your filesystem
- ✅ Files can be opened in KiCad
- ✅ 3D models (if KiCad CLI installed)
- ❌ KiCad doesn't open automatically (you open it manually)

## Future Enhancements

Once KiCad releases their IPC protocol (planned for KiCad 9+), we can add `IPCKiCadClient` for:

- ✅ Real-time KiCad GUI updates (currently: files only)
- ✅ Automatic KiCad GUI opening (currently: manual)
- ✅ DRC/ERC via IPC (currently: requires KiCad CLI)
- ✅ Interactive routing and placement

## Debugging

### Python/kiutils not found

```
kiutils not installed. Run: pip install kiutils
```

**Solution:**
```bash
pip install kiutils
# or
pip3 install kiutils
# or
python3 -m pip install kiutils
```

### KiCad CLI not found (for 3D export)

```
Failed to execute kicad-cli: command not found
```

**Solution:**
1. Install KiCad from https://www.kicad.org/download/
2. Ensure `kicad-cli` is in your system PATH
3. Test with: `kicad-cli --version`

### Build errors

```bash
# Rebuild after code changes
pnpm build

# Restart Claude Desktop after rebuilding
```

## Testing the MCP

You can test the server directly:

```bash
# Test with MCP CLI
npx fastmcp dev packages/mcp-server/dist/index.js

# Inspect with MCP Inspector
npx fastmcp inspect packages/mcp-server/dist/index.js
```

## Current Capabilities (File-Based Mode)

- ✅ Project creation with templates (real `.kicad_*` files)
- ✅ Component placement and listing (saved to PCB files)
- ✅ 3D model generation (STEP/VRML via KiCad CLI)
- ⚠️ DRC/ERC checks (requires KiCad CLI - not yet implemented)
- ⚠️ BOM generation (not yet implemented)
- ⚠️ Auto-routing (not yet implemented)
- ⚠️ Gerber export (requires KiCad CLI - not yet implemented)

## Roadmap

### Short-term
- [ ] Implement DRC/ERC via KiCad CLI
- [ ] Implement Gerber export via KiCad CLI
- [ ] Add BOM generation
- [ ] Improve component footprint selection
- [ ] Add schematic symbol placement

### Long-term (when KiCad IPC available)
- [ ] Real-time KiCad GUI updates
- [ ] Automatic KiCad opening
- [ ] Interactive routing
- [ ] Integration with supplier APIs for BOM pricing

## FAQ

**Q: Where are the files created?**
A: Files are created in the path you specify. Default is the current directory. Check the JSON response for exact file paths.

**Q: Will KiCad open automatically?**
A: No, you need to open KiCad manually and load the generated `.kicad_pro` file.

**Q: Can I edit the generated files in KiCad?**
A: Yes! They're real KiCad files. Open them in KiCad and edit as normal.

**Q: Do I need KiCad installed?**
A:
- **To create PCB files:** No, only Python with kiutils
- **To view/edit files:** Yes, install KiCad
- **To generate 3D models:** Yes, need KiCad CLI

**Q: What if I don't have KiCad?**
A: You can still create PCB files. Install KiCad later to view/edit them.

**Q: How do I generate a 3D model?**
A: Use the `kicad_generate_3d` tool. Requires KiCad CLI installed and in PATH.

## Getting Help

- 📖 [Main README](../README.md)
- 🐛 [Report Issues](https://github.com/muammar-yacoob/kicad-mcp/issues)
- 💬 [Discussions](https://github.com/muammar-yacoob/kicad-mcp/discussions)
