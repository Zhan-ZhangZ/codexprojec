import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// Use the HassClient instead of direct API calls
import { apiLogger } from "../../logger.js";
import { callServiceSchema } from "../../types/services/service.types.js";
import { handleToolError, formatErrorMessage } from "../utils.js";
import type { HassClient } from "../../api/client.js";

/**
 * Register service call tool with the MCP server
 * @param server The MCP server to register the tools with
 * @param hassClient The HassClient instance
 */
export function registerServiceCallTool(
  server: McpServer,
  hassClient: HassClient,
) {
  // Service call tool
  server.tool(
    "tools-services-call",
    "Call a Home Assistant service. This is one of the most powerful endpoints, allowing you to execute actions and control devices. Services are organized by domains, which typically correspond to integrations or components. Common use cases include turning devices on or off, adjusting settings like brightness, temperature, or volume, triggering automations or scenes, and running system operations.",
    callServiceSchema,
    async (params) => {
      try {
        apiLogger.warn("Executing service call tool", params);

        // Prepare target if provided
        const serviceData = { ...params.service_data };
        if (params.target) {
          // Add target to service data
          serviceData.target = params.target;
        }

        // Handle return_response parameter if needed
        if (params.return_response) {
          // Add to service data if the client implementation supports it
          serviceData.return_response = params.return_response;
        }

        // Call the service using the client
        const result = await hassClient.callService(
          params.domain,
          params.service,
          serviceData
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  result: result,
                  message: `Service ${params.domain}.${params.service} called successfully`,
                },
                null,
                2,
              ),
            },
          ],
          metadata: {
            description: "Calls a service in Home Assistant with the specified parameters. The response will include states that changed as a result of the service call, and optionally the service response if requested.",
            examples: {
              "light_turn_on": {
                "domain": "light",
                "service": "turn_on",
                "service_data": {
                  "entity_id": "light.living_room",
                  "brightness": 255,
                  "color_name": "blue"
                }
              },
              "climate_set_temperature": {
                "domain": "climate",
                "service": "set_temperature",
                "service_data": {
                  "entity_id": "climate.living_room",
                  "temperature": 22.5,
                  "hvac_mode": "heat"
                }
              },
              "response_example": {
                "changed_states": [
                  {
                    "entity_id": "light.living_room",
                    "state": "on",
                    "attributes": {
                      "brightness": 255,
                      "color_name": "blue",
                      "friendly_name": "Living Room Light",
                      "supported_features": 41
                    },
                    "last_changed": "2023-04-01T12:34:56.789Z",
                    "last_updated": "2023-04-01T12:34:56.789Z"
                  }
                ]
              },
              "with_response_data": {
                "changed_states": [
                  {
                    "entity_id": "climate.living_room",
                    "state": "heat",
                    "attributes": {
                      "temperature": 22.5,
                      "current_temperature": 20.0,
                      "friendly_name": "Living Room Thermostat",
                      "supported_features": 17
                    }
                  }
                ],
                "service_response": {
                  "status": "success",
                  "processing_time": 0.23
                }
              }
            }
          }
        };
      } catch (error) {
        handleToolError("tools-services-call", error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error calling service: ${formatErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
