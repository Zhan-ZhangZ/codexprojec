#!/usr/bin/env bun

/* eslint-env node */

import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { spawn } from "child_process";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the dist/index.js file
const serverPath = resolve(__dirname, "../dist/index.js");

// Get all command line arguments
const args = process.argv.slice(2);

// Check for stdio flag
const useStdio = args.includes("--stdio");

// Check for mock flag
const useMock = args.includes("--mock");

// If mock flag was provided, add it to the server args
if (useMock && !args.includes("--mock")) {
  args.push("--mock");
}

// Write to stderr instead of stdout to avoid interfering with MCP protocol
console.error(
  `Starting Home Assistant MCP Server ${useStdio ? "in stdio mode" : "..."}`,
);

// Start the server
const server = spawn("bun", [serverPath, ...args], {
  // For stdio mode, use pipe for proper protocol communication
  // For HTTP API mode, inherit is fine
  stdio: useStdio ? ["pipe", "pipe", "pipe"] : "inherit",
  env: process.env,
});

// For stdio mode, connect the server's stdio to process stdio for MCP communication
if (useStdio) {
  server.stdout.pipe(process.stdout);
  process.stdin.pipe(server.stdin);
  server.stderr.pipe(process.stderr);
}

// Handle server exit
server.on("close", (code) => {
  if (code !== 0) {
    console.error(`Server process exited with code ${code}`);
  }
  process.exit(code);
});

// Handle process signals
process.on("SIGINT", () => {
  server.kill("SIGINT");
});

process.on("SIGTERM", () => {
  server.kill("SIGTERM");
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  server.kill("SIGTERM");
  process.exit(1);
});
