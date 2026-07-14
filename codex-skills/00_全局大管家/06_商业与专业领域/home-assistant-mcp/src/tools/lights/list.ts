import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HassClient } from "../../api/client.js";
import { apiLogger } from "../../logger.js";
import { handleToolError, formatErrorMessage } from "../utils.js";
import type { State } from "../../types/entity/core/types.js";
import type { EntityId } from "../../types/common/types.js";
import type { HassEntity } from "../../types/entities/entity.types.js";
import { isHassEntity } from "../../types/entities/entity.types.js";

/**
 * Register lights list tool for MCP
 * @param server The MCP server to register the tools with
 * @param hassClient The Home Assistant client
 */
export function registerLightsListTool(
  server: McpServer,
  hassClient: HassClient,
) {
  server.tool(
    "tools-lights-list",
    "Get a comprehensive list of Home Assistant lights with detailed capabilities and state information",
    {
      entity_id: z
        .string()
        .optional()
        .describe("Optional light entity ID to filter results (e.g., 'light.living_room')"),
      include_details: z
        .boolean()
        .default(true)
        .describe("Include detailed information about supported features and capabilities"),
    },
    async (params) => {
      try {
        apiLogger.warn("Getting lights information", {
          entityId: params.entity_id,
          includeDetails: params.include_details,
        });

        // Get all states
        const states = await hassClient.getAllStates();

        // Filter for light entities and ensure required fields are present
        const lightStates = states
          .filter((state): state is HassEntity =>
            isHassEntity(state) && state.entity_id.startsWith("light.")
          );

        // Further filter by entity_id if provided
        const filteredLights = params.entity_id
          ? lightStates.filter((state) => state.entity_id === params.entity_id)
          : lightStates;

        // Process lights to match IntegrationLight structure if include_details is true
        const processedLights = params.include_details
          ? enhanceLightsWithIntegrationDetails(filteredLights)
          : filteredLights;

        // Return raw data without any transformations
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(processedLights, null, 2),
            },
          ],
          metadata: {
            description: "Returns a list of all lights in your Home Assistant instance with their current state and capabilities. This tool provides detailed information about each light including its state (on/off), attributes like brightness and color, and supported features. The enhanced version with include_details=true provides more structured information about light capabilities such as color modes, supported features, and integration details.",
            examples: [
              {
                "entity_id": "light.living_room",
                "state": "on",
                "attributes": {
                  "brightness": 255,
                  "color_temp_kelvin": 4000,
                  "color_mode": "color_temp",
                  "friendly_name": "Living Room Light",
                  "supported_features": 23,
                  "supported_color_modes": ["color_temp", "xy"]
                },
                "last_changed": "2023-04-01T18:30:45.123Z",
                "last_updated": "2023-04-01T18:30:45.123Z",
                "context": {
                  "id": "01EXAMPLEID1234567890",
                  "parent_id": null,
                  "user_id": "abcdefghijklmnopqrstuvwxyz"
                },
                "features": {
                  "brightness": true,
                  "color_temp": true,
                  "effect": false,
                  "flash": true,
                  "color": true,
                  "transition": true
                },
                "supported_color_modes": ["color_temp", "xy"],
                "integration_details": {
                  "platform": "hue"
                }
              },
              {
                "entity_id": "light.bedroom",
                "state": "off",
                "attributes": {
                  "friendly_name": "Bedroom Light",
                  "supported_features": 1,
                  "supported_color_modes": ["brightness"]
                },
                "last_changed": "2023-04-01T22:15:30.456Z",
                "last_updated": "2023-04-01T22:15:30.456Z",
                "context": {
                  "id": "01EXAMPLEID1234567891",
                  "parent_id": null,
                  "user_id": null
                },
                "features": {
                  "brightness": true,
                  "color_temp": false,
                  "effect": false,
                  "flash": false,
                  "color": false,
                  "transition": false
                },
                "supported_color_modes": ["brightness"],
                "integration_details": {
                  "platform": "zwave"
                }
              },
              {
                "entity_id": "light.kitchen_rgb",
                "state": "on",
                "attributes": {
                  "brightness": 200,
                  "rgb_color": [255, 0, 0],
                  "color_mode": "rgb",
                  "friendly_name": "Kitchen RGB Light",
                  "supported_features": 19,
                  "supported_color_modes": ["rgb"],
                  "effect_list": ["Rainbow", "Colorloop", "Police"]
                },
                "last_changed": "2023-04-01T19:45:12.789Z",
                "last_updated": "2023-04-01T19:45:12.789Z",
                "context": {
                  "id": "01EXAMPLEID1234567892",
                  "parent_id": null,
                  "user_id": null
                },
                "features": {
                  "brightness": true,
                  "color_temp": false,
                  "effect": true,
                  "flash": true,
                  "color": true,
                  "transition": false
                },
                "supported_color_modes": ["rgb"],
                "integration_details": {
                  "platform": "esphome"
                }
              }
            ]
          }
        };
      } catch (error) {
        handleToolError("tools-lights-list", error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error getting lights information: ${formatErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}

interface EnhancedLight extends Omit<State, 'entity_id'> {
  entity_id: EntityId;
  state: string;
  last_changed: string;
  last_updated: string;
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
  features?: {
    brightness: boolean;
    color_temp: boolean;
    effect: boolean;
    flash: boolean;
    color: boolean;
    transition: boolean;
  };
  supported_color_modes?: string[];
  integration_details?: {
    platform: string;
  };
}

function enhanceLightsWithIntegrationDetails(
  lights: HassEntity[],
): EnhancedLight[] {
  return lights.map((light) => {
    // Get supported_features number
    const supportedFeatures =
      Number(light.attributes?.["supported_features"]) || 0;

    // Determine supported features using bitwise operations
    const features = {
      brightness: (supportedFeatures & 1) !== 0,
      color_temp: (supportedFeatures & 2) !== 0,
      effect: (supportedFeatures & 4) !== 0,
      flash: (supportedFeatures & 8) !== 0,
      color: (supportedFeatures & 16) !== 0,
      transition: (supportedFeatures & 32) !== 0,
    };

    // Get supported color modes
    const supportedColorModes = (light.attributes?.["supported_color_modes"] || []) as string[];

    // Extract platform information if available
    const platform = (light.attributes?.["platform"] || "unknown") as string;

    // Create a structure that aligns with IntegrationLight type
    return {
      entity_id: light.entity_id,
      state: light.state,
      attributes: light.attributes,
      last_changed: light.last_changed || new Date().toISOString(),
      last_updated: light.last_updated || new Date().toISOString(),
      context: {
        id: light.context?.id || crypto.randomUUID(),
        parent_id: light.context?.parent_id || null,
        user_id: light.context?.user_id || null
      },
      features,
      supported_color_modes: supportedColorModes,
      integration_details: {
        platform,
      },
    };
  });
}
