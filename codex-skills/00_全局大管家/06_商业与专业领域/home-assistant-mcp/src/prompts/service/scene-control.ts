import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiLogger } from "../../logger.js";
import type { HassClient } from "../../api/client.js";
import { z } from "zod";

/**
 * Register scene control service call prompt with the MCP server
 * @param server The MCP server to register the prompt with
 * @param hassClient The Home Assistant client
 */
export function registerSceneServiceCallPrompt(
  server: McpServer,
  _hassClient: HassClient, // Prefixed with underscore to indicate intentional non-usage
) {
  server.prompt(
    "service-call-scene",
    "Call a Home Assistant scene service with parameters",
    {
      service: z.enum([
        "turn_on",
        "apply",
        "create",
        "reload"
      ]).describe("The scene service to call"),
      entity_id: z.string().optional().describe("The target scene entity ID (optional for reload)"),
      transition: z.string().optional().describe("Transition duration in seconds"),
    },
    async (request) => {
      apiLogger.info("Processing scene service call prompt", {
        args: request,
      });

      // Get the service name
      const { service, entity_id, transition } = request;

      // Form the service data
      const serviceData: Record<string, string | number> = {};

      if (entity_id) {
        serviceData.entity_id = entity_id;
      }

      if (transition !== undefined) {
        serviceData.transition = Number(transition);
      }

      // Form the user message
      let userMessage = `I want to call the scene.${service} service`;

      if (entity_id) {
        userMessage += ` on ${entity_id}`;
      }

      if (Object.keys(serviceData).length > 1) { // More than just entity_id
        const dataString = JSON.stringify(serviceData, null, 2);
        userMessage += ` with the following parameters: ${dataString}`;
      }

      // Return a prompt message sequence
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
              text: "I'll help you activate that scene.",
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
