import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiLogger } from "../../logger.js";
import type { HassClient } from "../../api/client.js";
import { z } from "zod";

/**
 * Register light control prompt with the MCP server
 * @param server The MCP server to register the prompt with
 * @param hassClient The Home Assistant client
 */
export function registerLightControlPrompt(
  server: McpServer,
  _hassClient: HassClient, // Prefixed with underscore to indicate intentional non-usage
) {
  server.prompt(
    "light-control",
    "Control lights with natural language",
    {
      area: z.string().describe("The area or room where the light is located (e.g., living room, kitchen)"),
      action: z.string().describe("The action to perform (on, off, dim, brighten)"),
      brightness: z.string().optional().describe("The brightness level (1-100) if setting brightness"),
    },
    async (request) => {
      apiLogger.info("Processing light control prompt", {
        args: request,
      });

      // Get the arguments from the request
      const { area, action, brightness } = request;

      // Form the user message based on arguments
      let userMessage = `I want to turn ${action} the lights`;
      if (area) {
        userMessage += ` in the ${area}`;
      }
      if (brightness) {
        const brightnessValue = parseInt(brightness, 10);
        if (!isNaN(brightnessValue) && (action === "dim" || action === "brighten")) {
          userMessage += ` to ${brightnessValue}% brightness`;
        }
      }

      // Return a prompt message sequence that will help the model
      // know how to use the tools to control lights
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
              text: "I'll help you control your lights. Let me check what lights are available in that area.",
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              text: "Please use the tools-light-control tool to set the lights how I want them.",
            },
          },
        ],
      };
    },
  );
}
