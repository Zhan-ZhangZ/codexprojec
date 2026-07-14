import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import dotenv from "dotenv";
import { HassWebSocket } from "./websocket.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  HassError,
  checkHomeAssistantConnection as checkHass,
} from "./utils.js";
import { registerHassTools } from "./tools/index.js";
import { registerHassPrompts } from "./prompts/index.js";
import { serverLogger, websocketLogger } from "./logger.js";

// Load environment variables from .env file
dotenv.config();

// Set up constants and environment variables
const HASS_URL = process.env["HASS_URL"] || "http://homeassistant.local:8123";
const HASS_TOKEN = process.env["HASS_TOKEN"];
const USE_WEBSOCKET = process.env["HASS_WEBSOCKET"] === "true" || false;

if (!HASS_TOKEN) {
  console.error(
    "Error: HASS_TOKEN environment variable is required. Please set it in .env file.",
  );
  process.exit(1);
}

// Server instance
const server = new McpServer({
  name: "hass-mcp",
  version: "1.0.0",
});

// WebSocket client
let wsClient: HassWebSocket | null = null;

// Register Home Assistant tools with the server
registerHassTools(server);

// Register Home Assistant prompts with the server
registerHassPrompts(server);

// Using stdio transport for CLI tools
const stdioTransport = new StdioServerTransport(process.stdin, process.stdout);

serverLogger.warn("Starting in stdio mode");

// Check Home Assistant connection before starting
checkHass(HASS_URL, HASS_TOKEN)
  .then(() => {
    // Initialize WebSocket client if enabled
    if (USE_WEBSOCKET) {
      wsClient = new HassWebSocket(server, HASS_URL, HASS_TOKEN);
      // Connect will be called automatically when subscribing
      websocketLogger.warn(
        "WebSocket client initialized for real-time updates",
      );
    }

    server.connect(stdioTransport).then(() => {
      serverLogger.warn("Home Assistant MCP Server running (stdio mode)");
    });
  })
  .catch((error: unknown) => {
    if (error instanceof HassError) {
      serverLogger.error(
        "Failed to connect to Home Assistant",
        {
          errorType: error.type,
          endpoint: error.endpoint,
          retryable: error.retryable,
        },
        error,
      );
    } else {
      serverLogger.error(
        "Unexpected error during startup",
        {},
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  });

process.on("SIGINT", () => {
  serverLogger.warn("SIGINT received, shutting down...");
  if (wsClient) {
    wsClient
      .close()
      .catch((e: Error) =>
        serverLogger.error("Error closing WebSocket", {}, e),
      );
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  serverLogger.warn("SIGTERM received, shutting down...");
  if (wsClient) {
    wsClient
      .close()
      .catch((e: Error) =>
        serverLogger.error("Error closing WebSocket", {}, e),
      );
  }
  process.exit(0);
});
