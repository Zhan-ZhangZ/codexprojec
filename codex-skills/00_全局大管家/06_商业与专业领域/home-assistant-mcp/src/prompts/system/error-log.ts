import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HassClient } from "../../api/client.js";

export function registerSystemErrorLogPrompt(server: McpServer, _client: HassClient) {
  server.prompt(
    "system-error-log",
    "Retrieve recent error logs from Home Assistant",
    {},
    async () => {
      // Return a prompt message sequence
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "Are there any errors in my Home Assistant system?",
            },
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: "I'll check the recent error logs from your Home Assistant system.",
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              text: "Please use the system error log tool to get the information.",
            },
          },
        ],
      };
    },
  );
}
