import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiLogger } from "../../logger.js";
import { getHistorySchema } from "../../types/schemas/schema.types.js";
import { handleToolError, formatErrorMessage } from "../utils.js";
import { HassError, HassErrorType } from "../../utils.js";
import type {
  HistoryOptions,
  HistoryDefaultOptions,
} from "../../types/api/api.types.js";
import type { HassClient } from "../../api/client.js";

/**
 * Register entity history tool with the MCP server
 * @param server The MCP server instance
 * @param hassClient The Home Assistant client
 */
export function registerEntityHistoryTool(
  server: McpServer,
  hassClient: HassClient,
) {
  server.tool(
    "tools-entities-history",
    "Get historical state changes for entities over time. This endpoint provides access to historical entity state data, which is useful for generating graphs and trends of sensor values, reviewing when devices were turned on/off, and analyzing patterns in system behavior.",
    getHistorySchema,
    async (params) => {
      try {
        apiLogger.warn("Executing entity history tool", {
          entityId: params.entity_id,
          startTime: params.start_time,
          endTime: params.end_time,
          simplified: params.simplified,
        });

        try {
          // Use the HassClient to get history
          let history;

          // If start_time is provided, use getHistory with a timestamp
          if (params.start_time) {
            const options: HistoryOptions = {
              end_time: params.end_time,
              minimal_response: params.minimal_response,
              significant_changes_only: params.significant_changes_only,
            };

            // Add entity_id to options if provided
            if (params.entity_id) {
              options.filter_entity_id = params.entity_id;
            }

            // Add limit to options if provided
            if (params.limit) {
              options.limit = params.limit;
            }

            // Add no_attributes to options if provided
            if (params.no_attributes) {
              options.no_attributes = params.no_attributes;
            }

            history = await hassClient.getHistory(params.start_time, options);
          } else {
            // Use default history endpoint (past day)
            const options: HistoryDefaultOptions = {
              minimal_response: params.minimal_response,
              significant_changes_only: params.significant_changes_only,
            };

            // Add entity_id to options if provided
            if (params.entity_id) {
              options.filter_entity_id = params.entity_id;
            }

            // Add end_time to options if provided
            if (params.end_time) {
              options.end_time = params.end_time;
            }

            // Add limit to options if provided
            if (params.limit) {
              options.limit = params.limit;
            }

            // Add no_attributes to options if provided
            if (params.no_attributes) {
              options.no_attributes = params.no_attributes;
            }

            history = await hassClient.getHistoryDefault(options);
          }

          // If history is empty or undefined, provide a user-friendly message
          if (!history || (Array.isArray(history) && history.length === 0)) {
            apiLogger.warn("No history data found for entity", {
              entityId: params.entity_id,
            });

            const emptyResponse = {
              note: `No history data found for entity: ${params.entity_id || "all entities"}`,
              entity_id: params.entity_id,
              states: [],
            };

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(emptyResponse, null, 2),
                },
              ],
            };
          }

          // Transform if simplified flag is set
          if (params.simplified) {
            // Simplified format:
            // For each entity, return an array of {
            //   time: ISO string,
            //   state: state value,
            //   attributes: optional simplified attributes
            // }
            const simplified = history.map((entityHistory) => {
              if (!entityHistory || entityHistory.length === 0) return [];

              const entityId = entityHistory[0].entity_id;
              return {
                entity_id: entityId,
                states: entityHistory.map((state) => {
                  return {
                    time: state.last_updated,
                    state: state.state,
                    attributes: {
                      // Include only relevant attributes
                      friendly_name:
                        state.attributes?.["friendly_name"] || null,
                      icon: state.attributes?.["icon"] || null,
                      unit_of_measurement:
                        state.attributes?.["unit_of_measurement"] || null,
                    },
                  };
                }),
              };
            });

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(simplified, null, 2),
                },
              ],
            };
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(history, null, 2),
              },
            ],
            metadata: {
              description: "Returns historical state changes for entities over time. The response is organized as an array of arrays, where each inner array contains state changes for a specific entity.",
              examples: {
                success: [
                  [
                    {
                      "entity_id": "sensor.temperature",
                      "state": "21.5",
                      "attributes": {
                        "unit_of_measurement": "°C",
                        "friendly_name": "Temperature"
                      },
                      "last_changed": "2023-04-01T10:00:00.000Z",
                      "last_updated": "2023-04-01T10:00:00.000Z"
                    },
                    {
                      "entity_id": "sensor.temperature",
                      "state": "22.0",
                      "attributes": {
                        "unit_of_measurement": "°C",
                        "friendly_name": "Temperature"
                      },
                      "last_changed": "2023-04-01T11:00:00.000Z",
                      "last_updated": "2023-04-01T11:00:00.000Z"
                    }
                  ],
                  [
                    {
                      "entity_id": "light.living_room",
                      "state": "off",
                      "attributes": {
                        "friendly_name": "Living Room Light",
                        "supported_features": 41
                      },
                      "last_changed": "2023-04-01T08:00:00.000Z",
                      "last_updated": "2023-04-01T08:00:00.000Z"
                    },
                    {
                      "entity_id": "light.living_room",
                      "state": "on",
                      "attributes": {
                        "brightness": 255,
                        "friendly_name": "Living Room Light",
                        "supported_features": 41
                      },
                      "last_changed": "2023-04-01T18:00:00.000Z",
                      "last_updated": "2023-04-01T18:00:00.000Z"
                    }
                  ]
                ]
              }
            }
          };
        } catch (fetchError) {
          // If it's a resource not found error, provide fallback behavior
          if (
            fetchError instanceof HassError &&
            fetchError.type === HassErrorType.RESOURCE_NOT_FOUND
          ) {
            apiLogger.warn(
              "History endpoint not available, providing empty results",
              {
                message: fetchError.message,
                entityId: params.entity_id,
              },
            );

            // Return an empty history dataset with explanation
            const fallbackResponse = {
              note: "The history API endpoint is not available in this Home Assistant instance",
              reason:
                "The history component may not be enabled or is using a different endpoint structure",
              entity_id: params.entity_id,
              states: [],
            };

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(fallbackResponse, null, 2),
                },
              ],
            };
          } else if (fetchError instanceof HassError) {
            // Handle other specific Hass errors with appropriate messages
            apiLogger.warn(
              `Home Assistant error when fetching history: ${fetchError.type}`,
              {
                message: fetchError.message,
                entityId: params.entity_id,
              },
            );

            const errorResponse = {
              note: "Unable to retrieve history data",
              reason: fetchError.message,
              error_type: fetchError.type,
              entity_id: params.entity_id,
              states: [],
            };

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(errorResponse, null, 2),
                },
              ],
            };
          }

          // For other errors, rethrow to be caught by the outer handler
          throw fetchError;
        }
      } catch (error) {
        handleToolError("tools-entities-history", error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error getting history: ${formatErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
