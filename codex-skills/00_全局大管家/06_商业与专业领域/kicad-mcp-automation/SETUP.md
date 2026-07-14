# KiCad MCP Setup Guide

Complete setup instructions for the KiCad Model Context Protocol server.

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/muammar-yacoob/kicad-mcp.git
cd kicad-mcp
pnpm install

# 2. Install Python dependencies
pip install kiutils

# 3. Build the project
pnpm build

# 4. Configure Claude Desktop (see below)

# 5. Start using in Claude Desktop!
```

## Prerequisites

### Required

1. **Node.js 18+** and **pnpm**
   ```bash
   # Check versions
   node --version  # Should be >= 18
   pnpm --version  # Should be >= 8

   # Install pnpm if needed
   npm install -g pnpm
   ```

2. **Python 3** with **pip**
   ```bash
   # Check version
   python3 --version  # Should be >= 3.8

   # Verify pip
   python3 -m pip --version
   ```

3. **kiutils** Python package
   ```bash
   pip install kiutils
   # or
   pip3 install kiutils
   # or
   python3 -m pip install kiutils
   ```

### Optional (for 3D model generation)

4. **KiCad** with CLI tools
   - Download from: https://www.kicad.org/download/
   - Ensure `kicad-cli` is in your PATH
   - Test with: `kicad-cli --version`

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/muammar-yacoob/kicad-mcp.git
cd kicad-mcp
```

### 2. Install Node Dependencies

```bash
pnpm install
```

This installs dependencies for all packages in the monorepo.

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

Or manually:
```bash
pip install kiutils
```

### 4. Build the Project

```bash
pnpm build
```

This compiles TypeScript to JavaScript for all packages.

## Claude Desktop Configuration

### Locate Configuration File

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

### Add MCP Server Configuration

Edit the config file and add:

```json
{
  "mcpServers": {
    "kicad-mcp": {
      "command": "node",
      "args": [
        "/absolute/path/to/kicad-mcp/packages/mcp-server/dist/index.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Important:** Replace `/absolute/path/to/kicad-mcp` with the actual absolute path to your cloned repository.

### Restart Claude Desktop

After saving the configuration, restart Claude Desktop for changes to take effect.

## Verification

### Test Python Bridge

```bash
cd packages/kicad-client
python3 python/kicad_bridge.py create_project test-project ./test-output
```

You should see JSON output with `"success": true` and files created in `./test-output/`.

### Test in Claude Desktop

In Claude Desktop, try:

```
Create a new KiCad project called "my-test-board"
```

Claude should:
1. Call the `kicad_init_project` tool
2. Create real `.kicad_pro`, `.kicad_sch`, and `.kicad_pcb` files
3. Return the file paths

Check your filesystem for the created files!

## Troubleshooting

### Error: "kiutils not installed"

**Solution:**
```bash
pip install kiutils
# or
pip3 install kiutils
# or
python3 -m pip install kiutils
```

Verify installation:
```bash
python3 -c "import kiutils; print(kiutils.__version__)"
```

### Error: "python3: command not found"

**Solution:**

**macOS/Linux:**
```bash
# Install Python 3
# macOS:
brew install python3

# Ubuntu/Debian:
sudo apt install python3 python3-pip

# Fedora:
sudo dnf install python3 python3-pip
```

**Windows:**
- Download from https://www.python.org/downloads/
- Ensure "Add Python to PATH" is checked during installation

### Error: "kicad-cli: command not found"

This error appears only when trying to generate 3D models.

**Solution:**
1. Install KiCad from https://www.kicad.org/download/
2. Add KiCad CLI to PATH:

   **macOS:**
   ```bash
   export PATH="/Applications/KiCad/KiCad.app/Contents/MacOS:$PATH"
   ```

   **Windows:**
   Add to PATH: `C:\Program Files\KiCad\8.0\bin`

   **Linux:**
   Usually already in PATH after installation

3. Verify: `kicad-cli --version`

### Error: "Cannot find module '@spark-apps/kicad-client'"

**Solution:**
```bash
# Rebuild the project
pnpm build

# If still failing, clean and rebuild
pnpm clean
pnpm install
pnpm build
```

### MCP Not Showing in Claude Desktop

**Solution:**
1. Check configuration file path is correct
2. Ensure JSON syntax is valid (use a JSON validator)
3. Verify absolute path to `dist/index.js` is correct
4. Restart Claude Desktop
5. Check Claude Desktop logs (if available)

## Development

### Running in Development Mode

```bash
# Terminal 1: Watch mode (auto-rebuild on changes)
pnpm dev

# Terminal 2: Test with fastmcp
cd packages/mcp-server
npx fastmcp dev dist/index.js
```

### Making Changes

1. Edit source files in `packages/*/src/`
2. Run `pnpm build` or use `pnpm dev` for auto-rebuild
3. Restart Claude Desktop to pick up changes

### Adding New Tools

1. Edit `packages/mcp-server/src/core/tools.ts`
2. Rebuild: `pnpm build`
3. Restart Claude Desktop

## Updating

```bash
# Pull latest changes
git pull origin main

# Reinstall dependencies (if package.json changed)
pnpm install

# Rebuild
pnpm build

# Update Python dependencies (if requirements.txt changed)
pip install -r requirements.txt --upgrade

# Restart Claude Desktop
```

## Uninstalling

### Remove from Claude Desktop

Edit `claude_desktop_config.json` and remove the `kicad-mcp` entry.

### Delete Files

```bash
# Remove repository
rm -rf /path/to/kicad-mcp

# Uninstall Python package (optional)
pip uninstall kiutils
```

## Next Steps

- Read [USING_THE_MCP.md](docs/USING_THE_MCP.md) for usage examples
- Check [README.md](README.md) for project overview
- Report issues: https://github.com/muammar-yacoob/kicad-mcp/issues

## Support

- GitHub Issues: https://github.com/muammar-yacoob/kicad-mcp/issues
- Discussions: https://github.com/muammar-yacoob/kicad-mcp/discussions
