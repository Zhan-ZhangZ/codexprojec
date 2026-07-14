import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiLogger } from "../../logger.js";
import { handleToolError, formatErrorMessage } from "../utils.js";
import { HassClient } from "../../api/client.js";

/**
 * Register system error log tool for MCP
 */
export function registerSystemErrorLogTool(
  server: McpServer,
  client: HassClient,
): void {
  server.tool(
    "tools-system-error-log",
    "Get Home Assistant error log",
    {
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Maximum number of log lines to return"),
      random_string: z
        .string()
        .optional()
        .describe("Dummy parameter for no-parameter tools"),
    },
    async (params) => {
      try {
        apiLogger.warn("Getting error log");

        const errorLog = await client.getErrorLog();

        // If a limit is specified, return only that many lines
        let logContent = errorLog;
        if (params.limit) {
          const lines = errorLog.split("\n");
          const limitedLines = lines.slice(-params.limit);
          logContent = limitedLines.join("\n");
        }

        return {
          content: [
            {
              type: "text",
              text: logContent,
            },
          ],
        };
      } catch (error) {
        handleToolError("tools-system-error-log", error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error getting error log: ${formatErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
