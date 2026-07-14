import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiLogger } from "../../logger.js";
import type { HassClient } from "../../api/client.js";
import { z } from "zod";

/**
 * Register service call prompt with the MCP server
 * @param server The MCP server to register the prompt with
 * @param hassClient The Home Assistant client
 */
export function registerServiceCallPrompt(
  server: McpServer,
  _hassClient: HassClient, // Prefixed with underscore to indicate intentional non-usage
) {
  server.prompt(
    "service-call",
    "Call a Home Assistant service with parameters",
    {
      domain: z.string().describe("The domain of the service (e.g., 'light', 'switch', 'climate')"),
      service: z.string().describe("The service to call (e.g., 'turn_on', 'turn_off', 'set_temperature')"),
      entity_id: z.string().optional().describe("The target entity ID for the service call"),
      service_data: z.string().optional().describe("JSON string containing service data (e.g., '{\"brightness\": 255}')"),
    },
    async (request) => {
      apiLogger.info("Processing service call prompt", {
        args: request,
      });

      // Get the arguments from the request
      const { domain, service, entity_id, service_data } = request;

      // Parse service data if provided
      let parsedServiceData = {};
      if (service_data) {
        try {
          parsedServiceData = JSON.parse(service_data);
        } catch (error) {
          apiLogger.error("Failed to parse service data", { error });
        }
      }

      // Form the user message based on arguments
      let userMessage = `I want to call the ${domain}.${service} service`;

      if (entity_id) {
        userMessage += ` on ${entity_id}`;
      }

      if (Object.keys(parsedServiceData).length > 0) {
        const dataString = JSON.stringify(parsedServiceData, null, 2);
        userMessage += ` with the following data: ${dataString}`;
      }

      // Return a prompt message sequence that will help the model
      // know how to use the tools to call the service
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
              text: "I'll help you call that Home Assistant service.",
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
