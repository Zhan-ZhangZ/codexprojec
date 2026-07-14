import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HassClient } from "../../api/client.js";
import { apiLogger } from "../../logger.js";
import { handleToolError, formatErrorMessage } from "../utils.js";

/**
 * Register the entity delete tool with the MCP server
 * @param server The MCP server to register the tool with
 * @param client The Home Assistant client
 */
export function registerEntityDeleteTool(server: McpServer, client: HassClient) {
  server.tool(
    "tools-entities-delete",
    "Delete a Home Assistant entity",
    {
      entity_id: z
        .string()
        .describe("Entity ID to delete (e.g., 'light.living_room')"),
    },
    async (params) => {
      try {
        apiLogger.warn("Executing entity delete tool", {
          entityId: params.entity_id,
        });

        // Use HassClient to delete the entity
        const response = await client.deleteEntity(params.entity_id);

        // Return success message
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: response.message || `Entity ${params.entity_id} deleted.`,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        handleToolError("tools-entities-delete", error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error deleting entity: ${formatErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
