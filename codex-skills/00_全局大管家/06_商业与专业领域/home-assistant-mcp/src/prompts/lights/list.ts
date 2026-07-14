import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HassClient } from "../../api/client.js";

export function registerLightsListPrompt(server: McpServer, _client: HassClient) {
  server.prompt(
    "lights-list",
    "List all available lights in Home Assistant",
    {
      area: z.string().optional().describe("Optional area to filter lights by"),
    },
    async (request) => {
      const areaFilter = request.area ? ` in the ${request.area}` : "";

      // Return a prompt message sequence
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `What lights do I have${areaFilter}?`,
            },
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: "I'll check what lights you have available.",
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              text: "Please use the lights list tool to get this information.",
            },
          },
        ],
      };
    },
  );
}
