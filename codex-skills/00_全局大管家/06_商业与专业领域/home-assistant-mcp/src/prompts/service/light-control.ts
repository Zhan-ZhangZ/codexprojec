import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiLogger } from "../../logger.js";
import type { HassClient } from "../../api/client.js";
import { z } from "zod";

/**
 * Register light control service call prompt with the MCP server
 * @param server The MCP server to register the prompt with
 * @param hassClient The Home Assistant client
 */
export function registerLightServiceCallPrompt(
  server: McpServer,
  _hassClient: HassClient, // Prefixed with underscore to indicate intentional non-usage
) {
  server.prompt(
    "service-call-light",
    "Call a Home Assistant light service with parameters",
    {
      service: z.enum(["turn_on", "turn_off", "toggle"]).describe("The light service to call"),
      entity_id: z.string().describe("The target light entity ID"),
      brightness: z.string().optional().describe("Brightness level (0-255)"),
      brightness_pct: z.string().optional().describe("Brightness percentage (0-100)"),
      color_name: z.string().optional().describe("Color name (e.g., 'red', 'green', 'blue')"),
      rgb_color: z.string().optional().describe("RGB color as comma-separated values (e.g., '255,0,0')"),
      xy_color: z.string().optional().describe("XY color as comma-separated values (e.g., '0.5,0.4')"),
      color_temp: z.string().optional().describe("Color temperature in mireds"),
      kelvin: z.string().optional().describe("Color temperature in Kelvin"),
      effect: z.string().optional().describe("Light effect name"),
      transition: z.string().optional().describe("Transition time in seconds"),
    },
    async (request) => {
      apiLogger.info("Processing light service call prompt", {
        args: request,
      });

      // Get the service name and parameters
      const {
        service,
        entity_id,
        brightness,
        brightness_pct,
        rgb_color,
        xy_color,
        color_temp,
        kelvin,
        transition,
        ...restParams
      } = request;

      // Form the service data
      const serviceData: Record<string, string | number | number[]> = { entity_id };

      // Add parameters to service data with appropriate type conversions
      if (brightness !== undefined) {
        serviceData.brightness = Number(brightness);
      }

      if (brightness_pct !== undefined) {
        serviceData.brightness_pct = Number(brightness_pct);
      }

      if (rgb_color !== undefined) {
        serviceData.rgb_color = rgb_color.split(',').map(Number);
      }

      if (xy_color !== undefined) {
        serviceData.xy_color = xy_color.split(',').map(Number);
      }

      if (color_temp !== undefined) {
        serviceData.color_temp = Number(color_temp);
      }

      if (kelvin !== undefined) {
        serviceData.kelvin = Number(kelvin);
      }

      if (transition !== undefined) {
        serviceData.transition = Number(transition);
      }

      // Add remaining parameters without type conversion
      Object.entries(restParams).forEach(([key, value]) => {
        if (value !== undefined) {
          serviceData[key] = value;
        }
      });

      // Form the user message
      let userMessage = `I want to call the light.${service} service on ${entity_id}`;

      if (Object.keys(serviceData).length > 1) { // More than just entity_id
        const dataString = JSON.stringify(serviceData, null, 2);
        userMessage += ` with the following parameters: ${dataString}`;
      }

      // Return a prompt message sequence
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: userMessage,
            },
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: "I'll help you control that light.",
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              text: "Please use the tools-services-call tool to execute this service call.",
            },
          },
        ],
      };
    },
  );
}
