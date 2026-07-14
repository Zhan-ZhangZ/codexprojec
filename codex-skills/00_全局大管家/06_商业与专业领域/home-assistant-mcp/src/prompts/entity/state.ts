import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HassClient } from "../../api/client.js";

export function registerEntityStatePrompt(server: McpServer, _client: HassClient) {
  server.prompt(
    "entity-state",
    "Get the current state of a Home Assistant entity",
    {
      entity_id: z.string().describe("The entity ID to get the state for (e.g., 'light.living_room')"),
    },
    async (request) => {
      // Return a prompt message sequence that will help the model
      // know how to use the tools to get entity state
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `What's the state of the ${request.entity_id} entity?`,
            },
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: "I'll check the state of that entity for you.",
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              text: "Please use the entity state tool to get the current state.",
            },
          },
        ],
      };
    },
  );
}
