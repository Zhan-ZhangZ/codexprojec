import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiLogger } from "../../logger.js";
import type { HassClient } from "../../api/client.js";
import { z } from "zod";

/**
 * Register entity history prompt with the MCP server
 * @param server The MCP server to register the prompt with
 * @param hassClient The Home Assistant client
 */
export function registerEntityHistoryPrompt(
  server: McpServer,
  _hassClient: HassClient, // Prefixed with underscore to indicate intentional non-usage
) {
  server.prompt(
    "entity-history",
    "Get historical data for Home Assistant entities",
    {
      entity_id: z.string().describe("The entity ID to get history for (e.g., light.living_room, climate.bedroom)"),
      time_period: z.string().optional().describe("How far back to get history (e.g., '1 day', '12 hours', '1 week')"),
      significant_changes_only: z.string().optional().describe("Set to 'true' to only retrieve significant state changes"),
    },
    async (request) => {
      apiLogger.info("Processing entity history prompt", {
        args: request,
      });

      // Get the arguments from the request
      const { entity_id, time_period, significant_changes_only } = request;

      // Form the user message based on arguments
      let userMessage = `I want to see the history for ${entity_id}`;
      if (time_period) {
        userMessage += ` for the last ${time_period}`;
      }

      if (significant_changes_only === 'true') {
        userMessage += ` with only significant changes`;
      }

      // Return a prompt message sequence that will help the model
      // know how to use the tools to get entity history
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: userMessage,
            },
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: "I'll help you retrieve the historical data for that entity.",
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              text: "Please use the tools-entities-history tool to retrieve the entity history.",
            },
          },
        ],
      };
    },
  );
}
