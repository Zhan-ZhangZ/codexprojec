import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HassClient } from "../../api/client.js";
import { apiLogger } from "../../logger.js";
import { handleToolError, formatErrorMessage } from "../utils.js";

/**
 * Register the entity state tool with the MCP server
 * @param server The MCP server to register the tool with
 * @param client The Home Assistant client
 */
export function registerEntityStateTool(server: McpServer, client: HassClient) {
  server.tool(
    "tools-entities-state",
    "Get the current state of a specific Home Assistant entity, including state value, attributes, and timestamp information",
    {
      entity_id: z
        .string()
        .describe("Entity ID to get the state for (e.g., 'light.living_room')"),
      simplified: z
        .boolean()
        .optional()
        .describe("Return simplified entity data structure"),
    },
    async (params) => {
      try {
        apiLogger.warn("Executing entity state tool", {
          entityId: params.entity_id,
          simplified: params.simplified,
        });

        // Use HassClient to get state
        const state = await client.getEntityState(params.entity_id);

        // Return raw data without any transformations
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(state, null, 2),
            },
          ],
          metadata: {
            description: "Returns the current state of a specific entity identified by its entity_id. This endpoint provides detailed information about a single entity, including its current state value, all attributes, last changed and updated timestamps, and context information. This is useful when you need focused information about a specific entity rather than the entire system state.",
            examples: {
              "light.living_room": {
                "entity_id": "light.living_room",
                "state": "on",
                "attributes": {
                  "brightness": 255,
                  "friendly_name": "Living Room Light",
                  "supported_features": 41
                },
                "last_changed": "2023-04-01T12:34:56.789Z",
                "last_updated": "2023-04-01T12:34:56.789Z",
                "context": {
                  "id": "01EXAMPLEID1234567890",
                  "parent_id": null,
                  "user_id": "abcdefghijklmnopqrstuvwxyz"
                }
              },
              "sensor.temperature": {
                "entity_id": "sensor.temperature",
                "state": "22.5",
                "attributes": {
                  "unit_of_measurement": "°C",
                  "friendly_name": "Temperature Sensor",
                  "device_class": "temperature"
                },
                "last_changed": "2023-04-01T12:30:00.000Z",
                "last_updated": "2023-04-01T12:30:00.000Z",
                "context": {
                  "id": "01EXAMPLEID1234567891",
                  "parent_id": null,
                  "user_id": null
                }
              },
              "binary_sensor.door": {
                "entity_id": "binary_sensor.door",
                "state": "off",
                "attributes": {
                  "friendly_name": "Front Door",
                  "device_class": "door"
                },
                "last_changed": "2023-04-01T11:45:00.000Z",
                "last_updated": "2023-04-01T11:45:00.000Z",
                "context": {
                  "id": "01EXAMPLEID1234567892",
                  "parent_id": null,
                  "user_id": null
                }
              }
            }
          }
        };
      } catch (error) {
        handleToolError("tools-entities-state", error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error getting state: ${formatErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
