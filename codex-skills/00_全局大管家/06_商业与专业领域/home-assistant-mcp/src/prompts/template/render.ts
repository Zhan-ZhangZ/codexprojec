import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Register the template render prompt with the MCP server
 * @param server The MCP server to register the prompt with
 */
export function registerTemplateRenderPrompt(server: McpServer) {
  server.prompt(
    "prompts-template-render",
    "Render a Home Assistant template.",
    (_extra) => {
      return {
        messages: [
          {
            role: "assistant",
            content: {
              type: "text",
              text: `I can help you render a Home Assistant template. Templates use the Jinja2 templating system to access state information, format data, and perform calculations.

Examples of templates:
- Basic state access: \`{{ states('light.living_room') }}\`
- Attribute access: \`{{ state_attr('light.living_room', 'brightness') }}\`
- Conditional statement: \`{% if is_state('device_tracker.phone', 'home') %}Welcome home!{% else %}You are away.{% endif %}\`
- Calculations: \`{{ (states('sensor.temperature')|float * 9/5) + 32 }}\`

Please provide a template you'd like me to render.`,
            },
          },
        ],
        description: `Renders a Home Assistant template string.

Home Assistant templates use the Jinja2 templating system to access the system state, entity information, or format data.
Templates are a powerful way to customize Home Assistant and can be used for creating dynamic messages, conditions, or automations.`,
        toolsToUse: [
          {
            useAugmentation: false,
            toolDescription: "Render a Home Assistant template string",
            tools: ["tools-template-render"],
          }
        ],
      };
    }
  );
}
