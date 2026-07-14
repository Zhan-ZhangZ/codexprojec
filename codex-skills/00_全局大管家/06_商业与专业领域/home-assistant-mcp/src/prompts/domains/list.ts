import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HassClient } from "../../api/client.js";

export function registerDomainsListPrompt(server: McpServer, _client: HassClient) {
  server.prompt(
    "domains-list",
    "List all available domains in Home Assistant",
    {},
    async () => {
      // Return a prompt message sequence
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "What domains are available in my Home Assistant?",
            },
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: "I'll check what domains are available in your Home Assistant.",
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              text: "Please use the domains list tool to get this information.",
            },
          },
        ],
      };
    },
  );
}
