import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HassClient } from "../../api/client.js";

export function registerServicesListPrompt(server: McpServer, _client: HassClient) {
  server.prompt(
    "services-list",
    "List available services in Home Assistant with detailed explanations and examples",
    {
      domain: z.string().optional().describe("Optional domain to filter services by (e.g., 'light', 'switch', 'cover')"),
      service: z.string().optional().describe("Optional service name to filter by (e.g., 'turn_on', 'toggle')"),
      search: z.string().optional().describe("Optional search term to find services by description or name"),
      simplified: z.string().optional().describe("Return simplified service data structure with better formatting (true or false)"),
      include_examples: z.string().optional().describe("Include example usage for services (true or false)"),
      format: z.string().optional().describe("Output format ('markdown' for readable tables, 'json' for raw data)"),
    },
    async (request) => {
      // Create a more descriptive prompt based on the parameters
      let promptText = "What services are available";

      if (request.domain) {
        promptText += ` for the ${request.domain} domain`;
      }

      if (request.service) {
        promptText += `, specifically the '${request.service}' service`;
      }

      if (request.search) {
        promptText += ` matching '${request.search}'`;
      }

      promptText += "?";

      // Add format and example preferences
      let formatPreference = "";
      if (request.format === "markdown") {
        formatPreference = " Please format the results as markdown with examples and parameter details.";
      } else if (request.format === "json") {
        formatPreference = " Please provide the raw JSON data.";
      }

      // Return a prompt message sequence
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: promptText + formatPreference,
            },
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: "I'll check the available services for you and provide detailed information about each service, including parameters and examples.",
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              text: "Please use the services list tool to get this information. Make sure to include detailed explanations of what each service does and how to use it.",
            },
          },
        ],
      };
    },
  );
}
