import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HassClient } from "../../api/client.js";

export function registerDevicesListPrompt(server: McpServer, _client: HassClient) {
  server.prompt(
    "devices-list",
    "List all available devices in Home Assistant",
    {
      area: z.string().optional().describe("Optional area to filter devices by"),
      manufacturer: z.string().optional().describe("Optional manufacturer to filter devices by"),
      model: z.string().optional().describe("Optional model to filter devices by"),
    },
    async (request) => {
      // Build filter description
      let filterDesc = "";
      if (request.area) {
        filterDesc += ` in the ${request.area}`;
      }
      if (request.manufacturer) {
        filterDesc += ` made by ${request.manufacturer}`;
      }
      if (request.model) {
        filterDesc += ` with model ${request.model}`;
      }

      // Return a prompt message sequence
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `What devices do I have${filterDesc}?`,
            },
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: "I'll check what devices you have available.",
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              text: "Please use the devices list tool to get this information.",
            },
          },
        ],
      };
    },
  );
}
