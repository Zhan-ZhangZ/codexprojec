import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HassClient } from "../../api/client.js";

export function registerEntitiesStatesPrompt(server: McpServer, _client: HassClient) {
  server.prompt(
    "entities-states",
    "Get the current states of multiple Home Assistant entities",
    {
      entity_ids: z.string().describe("Comma-separated list of entity IDs to get states for"),
    },
    async (request) => {
      // Return a prompt message sequence
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `What are the states of these entities: ${request.entity_ids}?`,
            },
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: "I'll check the states of those entities for you.",
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              text: "Please use the entities states tool to get the current states.",
            },
          },
        ],
      };
    },
  );
}
