import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HassClient } from "../../api/client.js";
import { apiLogger } from "../../logger.js";
import { getStatesSchema } from "../../types/schemas/schema.types.js";
import { handleToolError, formatErrorMessage } from "../utils.js";

/**
 * Register the entities states tool with the MCP server
 * @param server The MCP server to register the tool with
 * @param hassClient The Home Assistant client
 */
export function registerEntitiesStatesTool(
  server: McpServer,
  hassClient: HassClient,
) {
  server.tool(
    "tools-entities-states",
    "Get the current state of all (or specific) Home Assistant entities. This endpoint provides a complete snapshot of the current state of your home automation system, including all entities (devices, sensors, automations, etc.) and their attributes. Returns the current state value, all attributes, and last changed/updated timestamps.",
    getStatesSchema,
    async (params) => {
      try {
        apiLogger.warn("Executing entities states tool", {
          entityId: params.entity_id,
          simplified: params.simplified,
          limit: params.limit,
          offset: params.offset,
        });

        // Use HassClient to get states
        if (params.entity_id) {
          const state = await hassClient.getEntityState(params.entity_id);
          // Transform state if simplified flag is set
          if (params.simplified) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(state, null, 2),
                },
              ],
              metadata: {
                examples: {
                  light: {
                    "entity_id": "light.living_room",
                    "state": "on",
                    "attributes": {
                      "brightness": 255,
                      "friendly_name": "Living Room Light",
                      "supported_features": 41
                    },
                    "last_changed": "2023-04-01T12:34:56.789Z",
                    "last_updated": "2023-04-01T12:34:56.789Z"
                  },
                  sensor: {
                    "entity_id": "sensor.temperature",
                    "state": "22.5",
                    "attributes": {
                      "unit_of_measurement": "°C",
                      "friendly_name": "Temperature Sensor",
                      "device_class": "temperature"
                    },
                    "last_changed": "2023-04-01T12:30:00.000Z",
                    "last_updated": "2023-04-01T12:30:00.000Z"
                  }
                }
              }
            };
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(state, null, 2),
              },
            ],
            metadata: {
              examples: {
                light: {
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
                sensor: {
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
                }
              }
            }
          };
        } else {
          // Get all states with pagination
          const paginationOptions = {
            limit: params.limit,
            offset: params.offset,
          };

          const states = await hassClient.getAllStates(paginationOptions);
          // Transform states if simplified flag is set
          if (params.simplified) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(states, null, 2),
                },
              ],
            };
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(states, null, 2),
              },
            ],
            metadata: {
              description: "Returns a list of all entity states, containing entity IDs, current states, attributes, and timestamp information. Use pagination parameters 'limit' and 'offset' to control the amount of data returned.",
              examples: {
                success: [
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
                  }
                ]
              }
            }
          };
        }
      } catch (error) {
        handleToolError("tools-entities-states", error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error getting states: ${formatErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
