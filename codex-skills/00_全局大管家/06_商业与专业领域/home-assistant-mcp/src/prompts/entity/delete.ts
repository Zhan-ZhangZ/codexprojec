import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiLogger } from "../../logger.js";
import type { HassClient } from "../../api/client.js";

/**
 * Registers a prompt for deleting a Home Assistant entity
 * @param server The MCP server to register the prompt with
 * @param hassClient The Home Assistant client
 */
export function registerEntityDeletePrompt(
  server: McpServer,
  _hassClient: HassClient, // Prefixed with underscore to indicate intentional non-usage
) {
  server.prompt(
    "entity-delete",
    "Delete a Home Assistant entity",
    {
      entity_id: z
        .string()
        .describe("Entity ID to delete (e.g., 'light.living_room')"),
    },
    async (request) => {
      apiLogger.info("Processing entity delete prompt", {
        args: request,
      });

      // Get the entity ID from the request
      const { entity_id } = request;

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Delete the Home Assistant entity with ID: ${entity_id}`,
            },
          },
        ],
        _meta: {
          systemPrompt: `You are a helpful Home Assistant entity management assistant.
Your task is to delete the specified Home Assistant entity.

Use the entity delete tool to remove the entity from Home Assistant.
Remember that only entities created via the API can be deleted this way.
Entities registered by integrations or components cannot be deleted.

After deleting the entity, provide a clear, concise confirmation message.
If there's an error, explain what went wrong and suggest alternatives.`,
        },
      };
    },
  );
}
