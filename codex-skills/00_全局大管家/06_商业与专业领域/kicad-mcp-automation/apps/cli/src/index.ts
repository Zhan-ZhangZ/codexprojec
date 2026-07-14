#!/usr/bin/env node

import { Command } from 'commander';
import { registerInitCommand } from './commands/init.js';
import { registerFixCommand } from './commands/fix.js';
import { registerExportCommand } from './commands/export.js';
import { registerBomCommand } from './commands/bom.js';
import { registerGen3DCommand } from './commands/gen-3d.js';
import { registerRouteCommand } from './commands/route.js';

const program = new Command();

program
  .name('kicad-mcp')
  .description('CLI tool for KiCad MCP automation')
  .version('0.1.0');

// Register all commands
registerInitCommand(program);
registerFixCommand(program);
registerExportCommand(program);
registerBomCommand(program);
registerGen3DCommand(program);
registerRouteCommand(program);

// Server command (placeholder)
program
  .command('server')
  .description('Start the MCP server')
  .action(() => {
    console.log('Starting MCP server...');
    console.log('Use: node packages/mcp-server/dist/index.js');
  });

program.parse();
