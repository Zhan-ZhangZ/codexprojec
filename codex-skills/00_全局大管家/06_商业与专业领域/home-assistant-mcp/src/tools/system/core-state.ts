import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HassClient } from "../../api/client.js";
import { apiLogger } from "../../logger.js";
import { handleToolError, formatErrorMessage } from "../utils.js";

/**
 * Register the core state tool with the MCP server
 * @param server The MCP server to register the tool with
 * @param client The Home Assistant client
 */
export function registerSystemCoreStateTool(server: McpServer, client: HassClient) {
  server.tool(
    "tools-system-core-state",
    "Get the current state of the Home Assistant core",
    {}, // No parameters needed
    async () => {
      try {
        apiLogger.warn("Executing system core state tool");

        // Use HassClient to get the core state
        const coreState = await client.getCoreState();

        // Return core state
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                core_state: coreState.state,
                recorder_state: coreState.recorder_state,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        handleToolError("tools-system-core-state", error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error getting core state: ${formatErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
