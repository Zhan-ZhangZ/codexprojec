import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiLogger } from "../../logger.js";
import type { HassClient } from "../../api/client.js";
import { z } from "zod";

/**
 * Register temperature setting prompt with the MCP server
 * @param server The MCP server to register the prompt with
 * @param hassClient The Home Assistant client
 */
export function registerTempSetPrompt(
  server: McpServer,
  _hassClient: HassClient, // Prefixed with underscore to indicate intentional non-usage
) {
  server.prompt(
    "temperature-set",
    "Set the temperature for a climate device",
    {
      area: z.string().describe("The area where the climate device is located (e.g., living room, bedroom)"),
      temperature: z.string().describe("The temperature to set (in degrees)"),
      mode: z.string().optional().describe("The optional climate mode to set (cool, heat, auto, off)"),
    },
    async (request) => {
      apiLogger.info("Processing temperature set prompt", {
        args: request,
      });

      // Get the arguments from the request
      const { area, temperature, mode } = request;

      // Parse the temperature as a number
      const tempValue = parseFloat(temperature);

      // Form the user message
      let userMessage = `I want to set the temperature to ${tempValue} degrees`;
      if (area) {
        userMessage += ` in the ${area}`;
      }
      if (mode) {
        userMessage += ` and set the mode to ${mode}`;
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
              text: "I'll help you set the temperature. Let me check what climate devices are available.",
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              text: "Please use the service-call tool with the climate domain to set the temperature how I want it.",
            },
          },
        ],
      };
    },
  );
}
