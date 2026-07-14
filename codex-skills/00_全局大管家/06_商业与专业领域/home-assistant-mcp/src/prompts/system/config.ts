import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HassClient } from "../../api/client.js";

export function registerSystemConfigPrompt(server: McpServer, _client: HassClient) {
  server.prompt(
    "system-config",
    "Get Home Assistant system configuration information",
    {},
    async () => {
      // Return a prompt message sequence
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "What version of Home Assistant am I running?",
            },
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: "I'll check your Home Assistant system configuration.",
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              text: "Please use the system config tool to get the information.",
            },
          },
        ],
      };
    },
  );
}
