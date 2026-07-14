import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiLogger } from "../../logger.js";
import type { HassClient } from "../../api/client.js";
import { z } from "zod";

/**
 * Register cover control service call prompt with the MCP server
 * @param server The MCP server to register the prompt with
 * @param hassClient The Home Assistant client
 */
export function registerCoverServiceCallPrompt(
  server: McpServer,
  _hassClient: HassClient, // Prefixed with underscore to indicate intentional non-usage
) {
  server.prompt(
    "service-call-cover",
    "Call a Home Assistant cover service with parameters",
    {
      service: z.enum([
        "open_cover",
        "close_cover",
        "stop_cover",
        "toggle",
        "set_cover_position",
        "set_cover_tilt_position"
      ]).describe("The cover service to call"),
      entity_id: z.string().describe("The target cover entity ID"),
      position: z.string().optional().describe("Position (0-100, 0 is closed, 100 is open)"),
      tilt_position: z.string().optional().describe("Tilt position (0-100)"),
    },
    async (request) => {
      apiLogger.info("Processing cover service call prompt", {
        args: request,
      });

      // Get the service name
      const { service, entity_id, ...serviceParams } = request;

      // Form the service data
      const serviceData: Record<string, string | number> = { entity_id };

      // Add non-undefined parameters to service data
      Object.entries(serviceParams).forEach(([key, value]) => {
        if (value !== undefined) {
          // Convert specific parameters to the correct type
          if (key === "position" || key === "tilt_position") {
            serviceData[key] = Number(value);
          } else {
            serviceData[key] = value;
          }
        }
      });

      // Form the user message
      let userMessage = `I want to call the cover.${service} service on ${entity_id}`;

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
              text: "I'll help you control that cover.",
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
