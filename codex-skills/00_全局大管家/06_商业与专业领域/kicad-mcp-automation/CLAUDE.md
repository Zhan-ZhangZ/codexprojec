# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**KiCad MCP** is a Model Context Protocol (MCP) server designed to automate KiCad PCB design tasks through natural language and API endpoints. Built on FastMCP, it provides LLM-driven automation for PCB design, DRC cleanup, BOM generation, 3D rendering, and cost analysis.

The goal is to enable commands like:

- "Generate a 4-layer PCB for an ESP32 dev board with USB-C power"
- "Fix all unconnected nets and rebalance copper fills"
- "Render a realistic 3D model with silkscreen and component textures"
- "Estimate production cost for 100 units via JLCPCB"

## Development Commands

```bash
# Install dependencies
npm install  # or bun install, yarn, pnpm

# Run the stdio server (for CLI/local use with Claude Desktop)
npm start
npm run dev  # with auto-reload

# Run the HTTP server (for web/network use)
npm run start:http
npm run dev:http  # with auto-reload

# Build for production
npm run build        # builds stdio server to build/index.js
npm run build:http   # builds HTTP server to build/http-server.js
npm run prepublishOnly  # builds both

# Versioning and release
npm run version:patch
npm run version:minor
npm run version:major
npm run release

# Generate changelog
npm run changelog
npm run changelog:latest
```

## Architecture

### Core Structure

The server follows a modular FastMCP architecture with three main registration points:

1. **Tools** (`src/core/tools.ts`) — Executable MCP tools that perform actions
2. **Resources** (`src/core/resources.ts`) — Data resources accessible via URI templates
3. **Prompts** (`src/core/prompts.ts`) — Pre-defined prompt templates for LLM interactions

All three are registered in `src/server/server.ts` during server initialization.

### Entry Points

- **stdio mode:** `src/index.ts` — Creates server and starts stdio transport
- **HTTP mode:** `src/server/http-server.ts` — Creates server and starts HTTP/SSE transport

Both entry points call `startServer()` from `src/server/server.ts`, which creates the FastMCP instance and registers all tools, resources, and prompts.

### Service Layer

Business logic is isolated in `src/core/services/` and imported into tools. This keeps tool definitions clean and logic testable.

Example: `GreetingService` in `src/core/services/greeting-service.ts` provides `generateGreeting()` and `generateFarewell()` methods used by the `hello_world` and `goodbye` tools.

Pattern: Services export functions/classes → Tools import and call them → Tools are registered with FastMCP.

## Adding Features

### Adding a New Tool

1. If needed, create service logic in `src/core/services/` and export from `src/core/services/index.ts`
2. Register tool in `src/core/tools.ts`:

```typescript
server.addTool({
  name: 'tool_name',
  description: 'What this tool does',
  parameters: z.object({
    param: z.string().describe('Parameter description'),
  }),
  execute: async (params) => {
    const result = services.YourService.doSomething(params.param);
    return result;
  },
});
```

### Adding a Resource

Register in `src/core/resources.ts`:

```typescript
server.addResourceTemplate({
  uriTemplate: 'namespace://{id}',
  name: 'Resource Name',
  mimeType: 'text/plain',
  arguments: [
    {
      name: 'id',
      description: 'ID parameter',
      required: true,
    },
  ],
  async load({ id }) {
    return { text: `Resource content for ${id}` };
  },
});
```

### Adding a Prompt

Register in `src/core/prompts.ts`:

```typescript
server.addPrompt({
  name: 'prompt_name',
  description: 'Prompt description',
  arguments: [
    {
      name: 'arg',
      description: 'Argument description',
      required: true,
    },
  ],
  load: async ({ arg }) => {
    return `Prompt template with ${arg}`;
  },
});
```

## Runtime Environment

- **Node.js:** >=18.0.0 required
- **Default runtime:** Bun (configured in package.json scripts: `bun run`, `bun --watch`)
- **Module system:** ES Modules (NodeNext)
- **TypeScript:** ES2022 target, strict mode enabled

To use Node.js instead of Bun, modify package.json scripts to use `node` or `tsx`.

## Important TypeScript Notes

### Import Extensions

When importing TypeScript modules, use `.js` extensions (not `.ts`) in import statements due to NodeNext module resolution. The TypeScript compiler resolves these correctly at build time.

Example:

```typescript
import { registerTools } from '../core/tools.js'; // Correct
import { registerTools } from '../core/tools.ts'; // Wrong
```

### Module Resolution

- `tsconfig.json` is configured with `"module": "NodeNext"` and `"moduleResolution": "NodeNext"`
- This means TypeScript follows Node.js ESM rules: relative imports must include extensions
- Output directory is `dist/` (source maps and declarations generated)

## KiCad Integration (Planned)

This MCP is intended to interface with:

- **KiCad CLI** for PCB operations (project creation, DRC/ERC checks, exports)
- **Python KiCad scripting bridge** for advanced automation
- **FreeCAD** for 3D rendering
- **External APIs:** OctoPart, JLCPCB, PCBWay for BOM/cost data

The current codebase has placeholder tools (`hello_world`, `goodbye`). Actual KiCad integration will require:

- Tools for project creation, DRC/ERC checks, 3D export, BOM generation, routing, batch operations
- Resources for accessing KiCad project files, schematics, PCB layouts, and metadata
- Prompts for guiding LLM-based PCB design tasks

See `kicad_mcp_prd.md` for full product requirements.

## MCP Client Configuration

### Claude Desktop / Cursor Setup

**stdio mode (recommended for local development):**

```json
{
  "mcpServers": {
    "kicad-mcp": {
      "command": "npm",
      "args": ["start"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

Add to `.cursor/mcp.json` (project-specific) or `~/.cursor/mcp.json` (global).

**HTTP mode (for remote/shared access):**

```json
{
  "mcpServers": {
    "kicad-mcp-http": {
      "url": "http://localhost:3001/sse"
    }
  }
}
```

Note: FastMCP requires the full `/sse` path for HTTP connections.

### Environment Variables

- `PORT` — HTTP server port (default: 3001)
- `HOST` — HTTP server host binding (default: 0.0.0.0)

Example:

```bash
PORT=8080 npm run start:http
HOST=127.0.0.1 npm run dev:http
```

## Dependencies

Core dependencies:

- `fastmcp` — MCP server framework (simplified MCP implementation)
- `zod` — Schema validation for tool parameters
- `cors` — CORS support for HTTP transport

Dev dependencies:

- `@types/node`, `@types/bun`, `@types/cors` — TypeScript type definitions
- `conventional-changelog-cli` — Automated changelog generation

Peer dependencies (optional):

- `@valibot/to-json-schema`, `effect`, `typescript`

## Project Structure

```
src/
├── index.ts                    # stdio entry point
├── server/
│   ├── server.ts              # FastMCP server creation and registration
│   └── http-server.ts         # HTTP/SSE entry point
└── core/
    ├── tools.ts               # MCP tool definitions
    ├── resources.ts           # MCP resource definitions
    ├── prompts.ts             # MCP prompt definitions
    └── services/
        ├── index.ts           # Service exports
        └── greeting-service.ts # Example service
```

## Testing

Use FastMCP's built-in testing tools:

```bash
# Test with mcp-cli
npx fastmcp dev src/index.ts

# Inspect with MCP Inspector
npx fastmcp inspect src/index.ts
```

## Task Master AI Instructions

**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
