import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiLogger } from "../../logger.js";
import type { HassClient } from "../../api/client.js";

/**
 * Registers a prompt for listing Home Assistant components
 * @param server The MCP server to register the prompt with
 * @param hassClient The Home Assistant client
 */
export function registerSystemComponentsPrompt(
  server: McpServer,
  _hassClient: HassClient, // Prefixed with underscore to indicate intentional non-usage
) {
  server.prompt(
    "system-components",
    "List all loaded Home Assistant components",
    {},
    async (request) => {
      apiLogger.info("Processing system components prompt", {
        args: request,
      });

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "List all the components currently loaded in Home Assistant",
            },
          },
        ],
        _meta: {
          systemPrompt: `You are a helpful Home Assistant system information assistant.
Your task is to retrieve and display all components currently loaded in the Home Assistant instance.

Use the system components tool to fetch the list of all loaded components.
Present the information in a clear, organized manner.
If there are many components, consider grouping them by category or domain.

If there's an error, explain what went wrong and suggest alternatives.`,
        },
      };
    },
  );
}
