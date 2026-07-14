import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiLogger } from "../../logger.js";
import type { HassClient } from "../../api/client.js";

/**
 * Registers a prompt for retrieving Home Assistant core state
 * @param server The MCP server to register the prompt with
 * @param hassClient The Home Assistant client
 */
export function registerSystemCoreStatePrompt(
  server: McpServer,
  _hassClient: HassClient, // Prefixed with underscore to indicate intentional non-usage
) {
  server.prompt(
    "system-core-state",
    "Get the current state of the Home Assistant core",
    {},
    async (request) => {
      apiLogger.info("Processing system core state prompt", {
        args: request,
      });

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "What is the current state of the Home Assistant core?",
            },
          },
        ],
        _meta: {
          systemPrompt: `You are a helpful Home Assistant system information assistant.
Your task is to retrieve and display the current state of the Home Assistant core.

Use the system core state tool to fetch the current state information.
Present the information in a clear, organized manner, explaining what each state value means.
Pay special attention to the running state and any recorder information.

If there's an error, explain what went wrong and suggest alternatives.`,
        },
      };
    },
  );
}
