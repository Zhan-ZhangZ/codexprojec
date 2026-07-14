import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiLogger } from "../logger.js";
import type { HassClient } from "../api/client.js";

/**
 * Register prompts list handler with the MCP server
 * This is automatically handled by the SDK, but we can add custom logic here if needed
 *
 * @param server The MCP server to register the handler with
 * @param hassClient The Home Assistant client
 */
export function registerPromptsList(
  _server: McpServer,
  _hassClient: HassClient,
) {
  // The SDK automatically handles the prompts/list endpoint
  // This function is a placeholder for any custom logic we might want to add
  apiLogger.info("Registered prompts list handler");
}
