import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiLogger } from "../../logger.js";
import { handleToolError, formatErrorMessage } from "../utils.js";
import type { HassClient } from "../../api/client.js";

/**
 * Register entities list tool with the MCP server
 * @param server The MCP server to register the tools with
 */
export function registerEntitiesListTool(
  server: McpServer,
  hassClient: HassClient,
) {
  // Get all entities tool
  server.tool(
    "tools-entities-list",
    "Get a list of all Home Assistant entities, with optional filtering by domain",
    {
      simplified: z
        .boolean()
        .optional()
        .describe("Return simplified entity data structure (recommended)"),
      domain: z
        .string()
        .optional()
        .describe("Filter entities by domain (e.g. 'light', 'sensor')"),
    },
    async (params) => {
      try {
        apiLogger.warn("Executing entities list tool", {
          domain: params.domain,
          simplified: params.simplified,
        });

        // Use HassClient to get all states
        const allStates = await hassClient.getAllStates();

        // Filter by domain if provided but don't transform
        const filteredStates = params.domain
          ? allStates.filter(
              (entity) =>
                entity.entity_id &&
                entity.entity_id.startsWith(`${params.domain}.`),
            )
          : allStates;

        // Return raw data without any transformations
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(filteredStates, null, 2),
            },
          ],
          metadata: {
            description: "Returns the current state of all entities in Home Assistant, or filtered by domain if specified. This endpoint provides a complete snapshot of the current state of your home automation system, including all entities (devices, sensors, automations, etc.) and their attributes. The response is an array of state objects containing entity IDs, current states, attributes, and timestamp information.",
            examples: [
              {
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
              {
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
              {
                "entity_id": "switch.patio",
                "state": "off",
                "attributes": {
                  "friendly_name": "Patio Switch",
                  "icon": "mdi:power-socket"
                },
                "last_changed": "2023-04-01T10:15:00.000Z",
                "last_updated": "2023-04-01T10:15:00.000Z",
                "context": {
                  "id": "01EXAMPLEID1234567892",
                  "parent_id": null,
                  "user_id": null
                }
              }
            ]
          }
        };
      } catch (error) {
        handleToolError("tools-entities-list", error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error getting entities: ${formatErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
