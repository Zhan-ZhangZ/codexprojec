# @kicad-mcp/kicad-client

KiCad client abstraction for the KiCad MCP server. Provides a unified interface for KiCad operations with mock and future IPC implementations.

## Features

- **Type-safe interface** for KiCad operations
- **Mock client** for development and testing
- **Comprehensive error handling** with custom error types
- **Full test coverage** with 24+ unit tests
- **Extensible architecture** for future IPC integration

## Installation

```bash
pnpm add @kicad-mcp/kicad-client
```

## Usage

### Mock Client (Development/Testing)

```typescript
import { MockKiCadClient } from '@kicad-mcp/kicad-client';

const client = new MockKiCadClient();

// Connect
await client.connect();

// Create a project
const project = await client.createProject('my-pcb', '/tmp/my-pcb');

// Load a board
const board = await client.loadBoard(project.pcbPath!);

// Add components
const resistor = await client.addComponent({
  value: '10k',
  footprint: 'Resistor_SMD:R_0805',
  position: { x: 100, y: 100 },
  rotation: 0,
  layer: 'front',
});

// Run DRC
const drcResult = await client.runDRC();
console.log('DRC passed:', drcResult.passed);

// Export
const files = await client.export({
  outputDir: '/tmp/output',
  format: 'gerber',
});

// Disconnect
await client.disconnect();
```

## API

### IKiCadClient Interface

Core interface implemented by all clients:

- `connect(options?)` - Connect to KiCad
- `disconnect()` - Disconnect from KiCad
- `isConnected()` - Check connection status
- `createProject(name, path)` - Create new project
- `openProject(path)` - Open existing project
- `closeProject()` - Close current project
- `getCurrentProject()` - Get current project info
- `loadBoard(path)` - Load PCB board
- `saveBoard(path)` - Save PCB board
- `getComponents()` - Get all components
- `addComponent(component)` - Add a component
- `removeComponent(reference)` - Remove a component
- `runDRC()` - Run Design Rule Check
- `runERC()` - Run Electrical Rule Check
- `autoRoute()` - Auto-route traces
- `export(options)` - Export to various formats
- `generate3D(outputPath, format)` - Generate 3D model
- `generateBOM(outputPath)` - Generate Bill of Materials

### Error Types

- `KiCadClientError` - Base error class
- `ConnectionError` - Connection-related errors
- `TimeoutError` - Timeout errors
- `OperationError` - Operation failures
- `ProjectError` - Project not found/invalid errors

## Future: IPC Integration

The mock client will be supplemented with a real IPC client using:

- **Protocol Buffers** for message serialization
- **NNG sockets** for communication
- **Environment variables** (KICAD_API_SOCKET, KICAD_API_TOKEN)
- **KiCad 9.0+ IPC API** for direct KiCad control

The interface remains the same - just swap `MockKiCadClient` for `IPCKiCadClient` when ready.

## Testing

```bash
pnpm test
```

24 comprehensive tests covering all operations, error scenarios, and edge cases.

## License

MIT
