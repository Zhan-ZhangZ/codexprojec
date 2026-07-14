import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiLogger } from "../../logger.js";
import type { HassClient } from "../../api/client.js";
import { z } from "zod";

/**
 * Register climate control service call prompt with the MCP server
 * @param server The MCP server to register the prompt with
 * @param hassClient The Home Assistant client
 */
export function registerClimateServiceCallPrompt(
  server: McpServer,
  _hassClient: HassClient, // Prefixed with underscore to indicate intentional non-usage
) {
  server.prompt(
    "service-call-climate",
    "Call a Home Assistant climate service with parameters",
    {
      service: z.enum([
        "set_temperature",
        "set_hvac_mode",
        "set_preset_mode",
        "set_fan_mode",
        "set_swing_mode",
        "set_aux_heat",
        "turn_on",
        "turn_off"
      ]).describe("The climate service to call"),
      entity_id: z.string().describe("The target climate entity ID"),
      temperature: z.string().optional().describe("Target temperature"),
      target_temp_high: z.string().optional().describe("High target temperature for range mode"),
      target_temp_low: z.string().optional().describe("Low target temperature for range mode"),
      hvac_mode: z.string().optional().describe("HVAC mode (e.g., 'heat', 'cool', 'heat_cool', 'auto', 'dry', 'fan_only', 'off')"),
      preset_mode: z.string().optional().describe("Preset mode (e.g., 'eco', 'away', 'boost', 'comfort', 'home', 'sleep')"),
      fan_mode: z.string().optional().describe("Fan mode (e.g., 'on', 'off', 'auto', 'low', 'medium', 'high')"),
      swing_mode: z.string().optional().describe("Swing mode (e.g., 'on', 'off', 'horizontal', 'vertical')"),
      aux_heat: z.string().optional().describe("Auxiliary heater ('on' or 'off')"),
    },
    async (request) => {
      apiLogger.info("Processing climate service call prompt", {
        args: request,
      });

      // Get the service name
      const { service, entity_id, ...serviceParams } = request;

      // Form the service data
      const serviceData: Record<string, string | number | boolean> = { entity_id };

      // Add non-undefined parameters to service data
      Object.entries(serviceParams).forEach(([key, value]) => {
        if (value !== undefined) {
          // Convert specific parameters to the correct type
          if (key === "temperature" || key === "target_temp_high" || key === "target_temp_low") {
            serviceData[key] = Number(value);
          } else if (key === "aux_heat") {
            serviceData[key] = value === "on";
          } else {
            serviceData[key] = value;
          }
        }
      });

      // Form the user message
      let userMessage = `I want to call the climate.${service} service on ${entity_id}`;

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
              text: "I'll help you control that climate device.",
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
