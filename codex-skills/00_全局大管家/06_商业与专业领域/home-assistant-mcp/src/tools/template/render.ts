import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HassClient } from "../../api/client.js";
import { apiLogger } from "../../logger.js";
import { renderTemplateSchema } from "../../types/schemas/schema.types.js";
import { handleToolError, formatErrorMessage } from "../utils.js";

/**
 * Register the template render tool with the MCP server
 * @param server The MCP server to register the tool with
 * @param hassClient The Home Assistant client
 */
export function registerTemplateRenderTool(
  server: McpServer,
  hassClient: HassClient,
) {
  server.tool(
    "tools-template-render",
    "Render a Home Assistant template. Templates use the Jinja2 template engine and can access the Home Assistant state machine, enabling dynamic values and calculations based on entity states.",
    renderTemplateSchema,
    async (params) => {
      try {
        apiLogger.warn("Executing template render tool", {
          template: params.template,
          simplified: params.simplified,
        });

        // Use HassClient to render the template
        const rendered = await hassClient.renderTemplate(params.template);

        // If simplified format is requested
        if (params.simplified) {
          return {
            content: [
              {
                type: "text",
                text: rendered,
              },
            ],
          };
        }

        // Return detailed format
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                template: params.template,
                rendered: rendered,
              }, null, 2),
            },
          ],
          metadata: {
            description: "Renders a Home Assistant template string using the Jinja2 template engine. Templates can access entity states and perform calculations.",
            examples: {
              "get_temperature": {
                "template": "{{ states('sensor.temperature') }}",
                "rendered": "22.5"
              },
              "calculate_average": {
                "template": "{{ (states('sensor.temp1') | float + states('sensor.temp2') | float) / 2 }}",
                "rendered": "23.75"
              },
              "conditional_template": {
                "template": "{% if is_state('binary_sensor.motion', 'on') %}Motion detected!{% else %}No motion{% endif %}",
                "rendered": "Motion detected!"
              },
              "formatted_time": {
                "template": "{{ now().strftime('%Y-%m-%d %H:%M:%S') }}",
                "rendered": "2023-04-01 12:34:56"
              }
            }
          }
        };
      } catch (error) {
        handleToolError("tools-template-render", error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error rendering template: ${formatErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
