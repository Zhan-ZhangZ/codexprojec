import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerEntitiesListTool } from "./entities/list.js";
import { registerEntityHistoryTool } from "./entities/history.js";
import { registerSystemConfigTool } from "./system/config.js";
import { registerServiceCallTool } from "./services/call.js";
import { registerServicesListTool } from "./services/list.js";
import { registerLightsListTool } from "./lights/list.js";
import { registerSystemErrorLogTool } from "./system/error-log.js";
import { registerEntitiesStatesTool } from "./entities/states.js";
import { registerEntityStateTool } from "./entities/state.js";
import { registerDevicesListTool } from "./devices/list.js";
import { registerDomainsListTool } from "./domains/list.js";
import { registerEntityDeleteTool } from "./entities/delete.js";
import { registerSystemComponentsTool } from "./system/components.js";
import { registerSystemCoreStateTool } from "./system/core-state.js";
import { registerTemplateRenderTool } from "./template/render.js";
import { HassClient } from "../api/client.js";
// Don't import the websocket tools here, they're registered separately

/**
 * Export all tools for use in API controller
 */
export {
  registerEntitiesListTool,
  registerEntityHistoryTool,
  registerServiceCallTool,
  registerServicesListTool,
  registerLightsListTool,
  registerSystemErrorLogTool,
  registerSystemConfigTool,
  registerEntitiesStatesTool,
  registerEntityStateTool,
  registerDevicesListTool,
  registerDomainsListTool,
  registerEntityDeleteTool,
  registerSystemComponentsTool,
  registerSystemCoreStateTool,
  registerTemplateRenderTool,
};

/**
 * Register all Home Assistant tools with the MCP server
 * @param server The MCP server to register the tools with
 */
export function registerHassTools(server: McpServer) {
  // Get environment variables for Home Assistant connection
  const hassUrl = process.env.HASS_URL ?? "<NOT SET>";
  const hassToken = process.env.HASS_TOKEN ?? "<NOT SET>";
  const hassClient = new HassClient(hassUrl, hassToken);

  // Register entity tools
  registerEntitiesListTool(server, hassClient);
  registerEntityStateTool(server, hassClient);
  registerEntitiesStatesTool(server, hassClient);
  registerEntityHistoryTool(server, hassClient);
  registerEntityDeleteTool(server, hassClient);

  // Register service tools
  registerServiceCallTool(server, hassClient);
  registerServicesListTool(server, hassClient);

  // Register system tools
  registerSystemConfigTool(server, hassClient);
  registerSystemErrorLogTool(server, hassClient);
  registerSystemComponentsTool(server, hassClient);
  registerSystemCoreStateTool(server, hassClient);

  // Register template tools
  registerTemplateRenderTool(server, hassClient);

  // Register domain tools
  registerDomainsListTool(server, hassClient);

  // Register device tools
  registerDevicesListTool(server, hassClient);

  // Register light tools
  registerLightsListTool(server, hassClient);

  console.error("🔨 Registered all Home Assistant tools");
}
