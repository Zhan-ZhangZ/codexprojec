import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiLogger } from "../../logger.js";
import type { HassClient } from "../../api/client.js";
import { z } from "zod";

/**
 * Register switch control service call prompt with the MCP server
 * @param server The MCP server to register the prompt with
 * @param hassClient The Home Assistant client
 */
export function registerSwitchServiceCallPrompt(
  server: McpServer,
  _hassClient: HassClient, // Prefixed with underscore to indicate intentional non-usage
) {
  server.prompt(
    "service-call-switch",
    "Call a Home Assistant switch service with parameters",
    {
      service: z.enum([
        "turn_on",
        "turn_off",
        "toggle"
      ]).describe("The switch service to call"),
      entity_id: z.string().describe("The target switch entity ID"),
    },
    async (request) => {
      apiLogger.info("Processing switch service call prompt", {
        args: request,
      });

      // Get the service name
      const { service, entity_id } = request;

      // Form the service data
      const serviceData: Record<string, string> = { entity_id };

      // Form the user message
      const userMessage = `I want to call the switch.${service} service on ${entity_id}`;

      // Return a prompt message sequence using the serviceData in the message sequence
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
              text: `I'll help you control that switch with the data: ${JSON.stringify(serviceData)}`,
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              text: "Please use the tools-services-call tool to execute this service call.",
            },
          },
        ],
      };
    },
  );
}
