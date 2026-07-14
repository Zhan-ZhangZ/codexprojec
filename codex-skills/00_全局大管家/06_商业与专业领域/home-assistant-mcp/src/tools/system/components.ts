import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HassClient } from "../../api/client.js";
import { apiLogger } from "../../logger.js";
import { handleToolError, formatErrorMessage } from "../utils.js";

/**
 * Register the components list tool with the MCP server
 * @param server The MCP server to register the tool with
 * @param client The Home Assistant client
 */
export function registerSystemComponentsTool(server: McpServer, client: HassClient) {
  server.tool(
    "tools-system-components",
    "Get all loaded Home Assistant components",
    {}, // No parameters needed
    async () => {
      try {
        apiLogger.warn("Executing system components tool");

        // Use HassClient to get all components
        const components = await client.getComponents();

        // Return components list
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                components,
                count: components.length,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        handleToolError("tools-system-components", error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error getting components: ${formatErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
