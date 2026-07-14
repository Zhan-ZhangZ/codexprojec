import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiLogger } from "../../logger.js";
import type { HassClient } from "../../api/client.js";
import { z } from "zod";

/**
 * Register media control prompt with the MCP server
 * @param server The MCP server to register the prompt with
 * @param hassClient The Home Assistant client
 */
export function registerMediaControlPrompt(
  server: McpServer,
  _hassClient: HassClient, // Prefixed with underscore to indicate intentional non-usage
) {
  server.prompt(
    "media-control",
    "Control media players in Home Assistant",
    {
      area: z.string().describe("The area or name of the media player to control (e.g., 'living room', 'kitchen')"),
      action: z.string().describe("The action to perform: 'play', 'pause', 'stop', 'next', 'previous', 'volume'"),
      volume_level: z.string().optional().describe("Volume level (0-100) when action is 'volume'"),
    },
    async (request) => {
      apiLogger.info("Processing media control prompt", {
        args: request,
      });

      // Get the arguments from the request
      const { area, action, volume_level } = request;

      // Form the user message based on arguments
      let userMessage = `I want to control the media player in the ${area}`;

      switch (action) {
        case 'play':
          userMessage += `. Please play the current media.`;
          break;
        case 'pause':
          userMessage += `. Please pause the current media.`;
          break;
        case 'stop':
          userMessage += `. Please stop the current media.`;
          break;
        case 'next':
          userMessage += `. Please skip to the next track.`;
          break;
        case 'previous':
          userMessage += `. Please go back to the previous track.`;
          break;
        case 'volume':
          if (volume_level) {
            userMessage += `. Please set the volume to ${volume_level}%.`;
          } else {
            userMessage += `. Please adjust the volume.`;
          }
          break;
        default:
          userMessage += `. Please ${action} the media player.`;
          break;
      }

      // Return a prompt message sequence that will help the model
      // know how to use the tools to control the media player
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
              text: "I'll help you control the media player.",
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              text: "Please use the appropriate media control tools to perform this action.",
            },
          },
        ],
      };
    },
  );
}
