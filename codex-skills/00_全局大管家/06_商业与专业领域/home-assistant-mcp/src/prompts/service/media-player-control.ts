import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiLogger } from "../../logger.js";
import type { HassClient } from "../../api/client.js";
import { z } from "zod";

/**
 * Register media player control service call prompt with the MCP server
 * @param server The MCP server to register the prompt with
 * @param hassClient The Home Assistant client
 */
export function registerMediaPlayerServiceCallPrompt(
  server: McpServer,
  _hassClient: HassClient, // Prefixed with underscore to indicate intentional non-usage
) {
  server.prompt(
    "service-call-media-player",
    "Call a Home Assistant media player service with parameters",
    {
      service: z.enum([
        "turn_on",
        "turn_off",
        "toggle",
        "volume_up",
        "volume_down",
        "volume_set",
        "volume_mute",
        "media_play",
        "media_pause",
        "media_stop",
        "media_next_track",
        "media_previous_track",
        "media_play_pause",
        "select_source",
        "select_sound_mode",
        "shuffle_set"
      ]).describe("The media player service to call"),
      entity_id: z.string().describe("The target media player entity ID"),
      volume_level: z.string().optional().describe("Volume level (0-1)"),
      is_volume_muted: z.string().optional().describe("Mute state ('true' or 'false')"),
      media_content_id: z.string().optional().describe("ID of the content to play"),
      media_content_type: z.string().optional().describe("Type of the content to play"),
      source: z.string().optional().describe("Source name"),
      sound_mode: z.string().optional().describe("Sound mode"),
      shuffle: z.string().optional().describe("Shuffle setting ('true' or 'false')"),
    },
    async (request) => {
      apiLogger.info("Processing media player service call prompt", {
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
          if (key === "volume_level") {
            serviceData[key] = Number(value);
          } else if (key === "is_volume_muted" || key === "shuffle") {
            serviceData[key] = value === "true";
          } else {
            serviceData[key] = value;
          }
        }
      });

      // Form the user message
      let userMessage = `I want to call the media_player.${service} service on ${entity_id}`;

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
              text: "I'll help you control that media player.",
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
