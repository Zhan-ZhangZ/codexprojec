import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HassClient } from "../../api/client.js";
import { handleToolError, formatErrorMessage } from "../utils.js";
import LightSchema from "../../schemas/light.js";

/**
 * Register light control tool with the MCP server
 * @param server The MCP server instance
 * @param client The Home Assistant client
 */
export function registerLightControlTool(
  server: McpServer,
  client: HassClient,
) {
  // Light control tool
  server.tool(
    "tools-lights-control",
    "Control Home Assistant lights including turning on/off, brightness, color, effects, etc.",
    LightSchema.shape,
    async (params) => {
      try {
        // action: light.turn_on
        // target:
        //  entity_id: light.bed
        // data:
        //  brightness_pct: 10

        const { action, domain, service_data } = params;
        const result = await client.callService(domain, action, service_data);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        handleToolError("tools-lights-control", error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error controlling light: ${formatErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
