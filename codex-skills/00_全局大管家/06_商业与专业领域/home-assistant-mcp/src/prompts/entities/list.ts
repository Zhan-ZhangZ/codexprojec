import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiLogger } from "../../logger.js";
import type { HassClient } from "../../api/client.js";
import { z } from "zod";

/**
 * Register entities list prompt with the MCP server
 * @param server The MCP server to register the prompt with
 * @param hassClient The Home Assistant client
 */
export function registerEntitiesListPrompt(
  server: McpServer,
  _hassClient: HassClient, // Prefixed with underscore to indicate intentional non-usage
) {
  server.prompt(
    "entities-list",
    "Get a list of Home Assistant entities, optionally filtered by domain or area",
    {
      domain: z.string().optional().describe("Filter entities by domain (e.g., 'light', 'switch', 'climate')"),
      area: z.string().optional().describe("Filter entities by area (e.g., 'living room', 'bedroom')"),
      include_disabled: z.string().optional().describe("Set to 'true' to include disabled entities"),
    },
    async (request) => {
      apiLogger.info("Processing entities list prompt", {
        args: request,
      });

      // Get the arguments from the request
      const { domain, area, include_disabled } = request;

      // Form the user message based on arguments
      let userMessage = "I want to see a list of entities";

      if (domain) {
        userMessage += ` in the ${domain} domain`;
      }

      if (area) {
        if (domain) {
          userMessage += ` that are in the ${area} area`;
        } else {
          userMessage += ` in the ${area} area`;
        }
      }

      if (include_disabled === 'true') {
        userMessage += ", including disabled entities";
      }

      // Return a prompt message sequence that will help the model
      // know how to use the tools to get the entity list
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
              text: "I'll help you list the entities in your Home Assistant system.",
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              text: "Please use the entities-list tool to retrieve the list of entities.",
            },
          },
        ],
      };
    },
  );
}
