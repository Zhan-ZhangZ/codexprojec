import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HassClient } from "../../api/client.js";
import { apiLogger } from "../../logger.js";
import { handleToolError } from "../utils.js";

/**
 * Register devices list tool for MCP
 */
export function registerDevicesListTool(
  server: McpServer,
  client: HassClient,
): void {
  server.tool(
    "tools-devices-list",
    "Get all devices in Home Assistant",
    {
      random_string: z
        .string()
        .optional()
        .describe("Dummy parameter for no-parameter tools"),
    },
    async () => {
      try {
        apiLogger.warn("Getting devices");

        // Get devices using the client API - using config endpoint as fallback since getDeviceRegistry doesn't exist
        const response = await client.getConfig();

        // Extract relevant device information
        const devices =
          response.components?.filter(
            (component) =>
              component.startsWith("device_tracker") ||
              component.startsWith("light.") ||
              component.startsWith("switch."),
          ) || [];

        apiLogger.warn(`Found ${devices.length} device-related components`);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ devices }, null, 2),
            },
          ],
        };
      } catch (error) {
        handleToolError("tools-devices-list", error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Error retrieving devices information",
            },
          ],
        };
      }
    },
  );
}
