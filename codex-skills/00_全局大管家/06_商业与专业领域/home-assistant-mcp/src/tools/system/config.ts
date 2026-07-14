import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiLogger } from "../../logger.js";
import { handleToolError, formatErrorMessage } from "../utils.js";
import { z } from "zod";
import type { HassClient } from "../../api/client.js";

/**
 * Register system configuration tool for MCP
 */
export function registerSystemConfigTool(
  server: McpServer,
  client: HassClient,
): void {
  // Get Home Assistant configuration
  server.tool(
    "tools-system-config",
    "Get Home Assistant configuration",
    {
      random_string: z
        .string()
        .optional()
        .describe("Dummy parameter for no-parameter tools"),
    },
    async () => {
      try {
        apiLogger.warn("Getting Home Assistant configuration");

        const config = await client.getConfig();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(config, null, 2),
            },
          ],
        };
      } catch (error) {
        handleToolError("tools-system-config", error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error getting configuration: ${formatErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
