import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import dotenv from "dotenv";
import { registerHassPrompts } from "./prompts/index.js";
import { serverLogger } from "./logger.js";

// Load environment variables
dotenv.config();

// Initialize the MCP server
const server = new McpServer({
  name: "hass-mcp-test",
  version: "1.0.0",
});

// Register all prompts
registerHassPrompts(server);

// Just log that all prompts are registered
serverLogger.info("📝 All Home Assistant prompts registered");
serverLogger.info("Test complete!");
