# KiCad MCP Server - Development Documentation

## Project Overview

A Model Context Protocol (MCP) server for KiCad 9.0 EDA software that provides:
- Schematic analysis and component listing
- PCB analysis using pcbnew API
- Netlist-based connection tracing
- Project creation and editing
- Schematic and PCB layout modification

## Core Design Principles

### 1. Use KiCad Python API
Use KiCad's Python API (pcbnew) for PCB operations instead of manually generating S-expression files.

**Why:**
- Ensures 100% file format compatibility
- Avoids manual format errors
- Automatically handles KiCad version differences

**Implementation:**
```python
# Import KiCad API (requires KiCad environment)
import pcbnew

# Load PCB
board = pcbnew.LoadBoard("/path/to/project.kicad_pcb")

# Get footprints
for footprint in board.GetFootprints():
    ref = footprint.GetReference()
    pos = footprint.GetPosition()
    # Process footprint...

# Save
pcbnew.SaveBoard("/path/to/project.kicad_pcb", board)
```

### 2. Based on KiCad 9.0
- Project file format: `.kicad_pro` (JSON, version=3)
- Schematic format: `.kicad_sch` (version 20240130)
- PCB format: `.kicad_pcb` (version 20240130)

### 3. Netlist-Based Analysis
Use KiCad XML netlist for accurate connection tracking:
- Export using: `kicad-cli sch export netlist --format kicadxml`
- Parse XML to get pin-level connections
- Bidirectional queries (component <-> network)

## Architecture

### MCP Server Structure
```
FastMCP Framework
    ↓
Tool Registration (@mcp.tool())
    ↓
KiCad Python API / File Parsing
    ↓
Result Return (Markdown format)
```

### Core Modules (6 Tools)

#### 1. Schematic Analysis (`tools/schematic.py`)
Parse and analyze `.kicad_sch` files:

```python
@mcp.tool()
async def list_schematic_components(
    file_path: str,
    filter_type: str = ""
) -> str:
    """List all components with optional filtering"""

@mcp.tool()
async def list_schematic_nets(
    file_path: str,
    filter_power: bool = False
) -> str:
    """List all nets"""

@mcp.tool()
async def get_schematic_info(file_path: str) -> str:
    """Get schematic metadata and statistics"""
```

**Parser Implementation:**
- Custom S-expression parser
- Regex-based pattern matching
- No Python API available for schematics

#### 2. PCB Analysis (`tools/pcb.py`)
Analyze PCB files using pcbnew API:

```python
@mcp.tool()
async def list_pcb_footprints(
    file_path: str,
    filter_layer: str = None
) -> str:
    """List all footprints"""

@mcp.tool()
async def get_pcb_statistics(file_path: str) -> str:
    """Get PCB statistics"""

@mcp.tool()
async def find_tracks_by_net(
    file_path: str,
    net_name: str
) -> str:
    """Find tracks by net name"""
```

**Parser Implementation:**
```python
import pcbnew

class PCBParserKiCad:
    def __init__(self, file_path: str):
        self.board = pcbnew.LoadBoard(file_path)

    def get_footprints(self):
        """Use pcbnew API"""
        for fp in self.board.GetFootprints():
            yield {
                "reference": fp.GetReference(),
                "value": fp.GetValue(),
                "position": fp.GetPosition()
            }
```

#### 3. Netlist Analysis (`tools/netlist.py`)
Parse KiCad XML netlist files:

```python
@mcp.tool()
async def trace_netlist_connection(
    netlist_path: str,
    reference: str,
    pin_number: str = ""
) -> str:
    """Trace component connections (100% accurate)"""

@mcp.tool()
async def get_netlist_nets(
    netlist_path: str,
    filter_pattern: str = ""
) -> str:
    """List all nets with filtering"""

@mcp.tool()
async def get_netlist_components(
    netlist_path: str,
    filter_ref: str = ""
) -> str:
    """List components with net connections"""
```

**Parser Implementation:**
```python
import xml.etree.ElementTree as ET

class NetlistParser:
    def _parse_file(self):
        tree = ET.parse(self.file_path)
        root = tree.getroot()

        # Parse components
        for comp in root.findall(".//comp"):
            ref = comp.get("ref")
            # Process component...

        # Parse nets
        for net in root.findall(".//net"):
            name = net.get("name")
            # Process nodes...
```

**KiCad 9.0 Netlist Format:**
- Uses `<comp>` tags (not `<component>`)
- Pin information in `<nets>` section only
- Requires bidirectional parsing

#### 4. Schematic Editing (`tools/schematic_editor.py`)
Create and modify schematics:

```python
@mcp.tool()
async def create_kicad_project(
    path: str,
    name: str,
    title: str = "",
    company: str = ""
) -> str:
    """Create project from KiCad template"""

@mcp.tool()
async def add_component_from_library(
    file_path: str,
    library_name: str,
    symbol_name: str,
    reference: str,
    value: str,
    footprint: str = "",
    x: float = 100,
    y: float = 100,
    unit: int = 1
) -> str:
    """Add component to schematic"""

@mcp.tool()
async def add_wire(
    file_path: str,
    points: list[tuple[float, float]]
) -> str:
    """Add wire connection"""
```

**Project Creation Method:**
```python
def _find_kicad_template() -> Path:
    """Find KiCad template path"""
    templates = [
        "/Applications/KiCad/KiCad.app/Contents/SharedSupport/template",
        "/usr/share/kicad/template",
        "C:/Program Files/KiCad/9.0/share/kicad/template",
    ]
    for template_path in templates:
        path = Path(template_path)
        if path.exists():
            return path
    raise FileNotFoundError("KiCad template not found")
```

#### 5. PCB Layout (`tools/pcb_layout.py`)
PCB layout initialization and editing:

```python
@mcp.tool()
async def setup_pcb_layout(
    schematic_path: str,
    width: float = 100,
    height: float = 100,
    unit: str = "mm"
) -> str:
    """Initialize PCB with dimensions"""

@mcp.tool()
async def export_gerber(
    pcb_path: str,
    output_dir: str = ""
) -> str:
    """Export Gerber files"""
```

#### 6. Project Management (`tools/project.py`)
KiCad project management:

```python
@mcp.tool()
async def create_kicad_project(
    path: str,
    name: str,
    title: str = "",
    company: str = ""
) -> str:
    """Create new project"""

@mcp.tool()
async def copy_kicad_project(
    source_path: str,
    target_path: str
) -> str:
    """Copy existing project"""
```

## File Format Handling

### KiCad 9.0 File Formats

#### .kicad_pro (JSON format)
```json
{
  "meta": {
    "filename": "project.kicad_pro",
    "version": 3
  },
  "board": {
    "design_settings": {...}
  },
  "sheets": [[uuid, "Root"]],
  "libraries": {...}
}
```

#### .kicad_sch (S-expression)
```lisp
(kicad_sch
  (version 20240130)
  (generator "eeschema")
  (generator_version "9.0")
  (uuid "...")
  (paper "A4")
  (title_block ...)
  (lib_symbols ...)
  (symbol ...)
  (wire ...)
)
```

### S-expression Parsing
Since KiCad has no Python API for schematics, use custom parser:

```python
import re

def parse_symbol(content: str, reference: str):
    """Parse symbol from schematic"""
    # Match symbol with reference
    pattern = rf'\(symbol.*?{reference}[\s\S]*?\(properties[\s\S]*?\)'
    match = re.search(pattern, content)
    if match:
        # Extract properties
        # Extract pins
        return symbol_data
```

**Key Patterns:**
- Use `[\s\S]*?` for multi-line matching (not `[^)]*?`)
- Escape special regex characters
- Handle nested S-expressions carefully

## Development Standards

### Adding New Tools
```python
# 1. Create in appropriate tools/*.py
from ..server import mcp

@mcp.tool()
async def new_tool(param: type, ...) -> str:
    """Tool description (for AI understanding)"""
    try:
        # Implementation
        return formatted_result
    except Exception as e:
        return f"Error: {e}"
```

### Error Handling Pattern
```python
try:
    # KiCad operations
    result = perform_operation()
except FileNotFoundError:
    return "Error: File not found"
except Exception as e:
    import traceback
    return f"Error: {e}\n\n{traceback.format_exc()}"
```

### Return Format
Use Markdown for output:
```python
return f"""# Operation Successful

**File**: {file_path}
**Component**: {component}

## Details
| Item | Value |
|------|-------|
| Reference | {reference} |
| Value | {value} |
"""
```

## Common Issues

### Q: KiCad crashes on opening file?
**A**: File format error. Use template copy method, don't manually generate S-expressions.

### Q: pcbnew import fails?
**A**: Ensure KiCad is installed and in PATH. pcbnew requires KiCad environment.

### Q: Netlist parsing returns empty results?
**A**: Check KiCad version. KiCad 9.0 uses `<comp>` tags, not `<component>`.

### Q: How to handle KiCad version differences?
**A**: Check version string in file header. KiCad 9.0 uses version 20240130.

## Testing Strategy

### Unit Tests
```python
def test_schematic_parser():
    """Test schematic parsing"""
    parser = SchematicParser("test.kicad_sch")
    components = parser.get_components()
    assert len(components) > 0
```

### Integration Tests
```bash
# Test in real KiCad environment
1. Create project
2. Open in KiCad 9.0
3. Verify no warnings
4. Run ERC/DRC
```

## Performance Considerations

### Large File Processing
```python
# Use streaming for large files
def process_large_schematic(file_path):
    with open(file_path) as f:
        for line in f:
            process_line(line)
```

### Caching
```python
from functools import lru_cache

@lru_cache(maxsize=128)
def get_footprint_info(name):
    # Cache footprint info
    return query_footprint(name)
```

## Resources

### KiCad Official
- [KiCad 9.0 Documentation](https://docs.kicad.org/)
- [File Format Specification](https://dev-docs.kicad.org/en/file-formats/)
- [Python Scripting](https://docs.kicad.org/doxygen-python/)

### MCP Protocol
- [MCP Specification](https://modelcontextprotocol.io/)
- [FastMCP Documentation](https://github.com/jlowin/fastmcp)

## Project Structure

```
kicad-mcp-server/
├── src/kicad_mcp_server/
│   ├── tools/              # MCP tool implementations
│   │   ├── project.py      # Project management
│   │   ├── schematic.py    # Schematic analysis
│   │   ├── schematic_editor.py  # Schematic editing
│   │   ├── pcb.py          # PCB analysis
│   │   ├── pcb_layout.py   # PCB layout
│   │   └── netlist.py      # Netlist analysis
│   ├── parsers/            # File parsers
│   │   ├── schematic_parser.py
│   │   ├── pcb_parser_kicad.py
│   │   └── netlist_parser.py
│   ├── config.py           # Configuration
│   └── server.py           # MCP server setup
├── tests/                  # Test files
├── README.md               # User documentation
└── CLAUDE.md               # This file
```

## Scope

### Included
- Schematic analysis (components, nets, symbols)
- PCB analysis (footprints, tracks, statistics)
- Netlist-based connection tracing
- Project creation and editing
- Schematic and PCB layout modification

### Not Included
- Test code generation
- Natural language processing
- Component library management
- Auto-routing
- LCSC integration
- 3D model generation

The server focuses on core analysis and editing capabilities, leaving specialized features to dedicated tools.
