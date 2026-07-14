import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTempSetPrompt } from "./climate/set-temperature.js";
import { registerPromptsList } from "./list.js";
import { registerPromptsGet } from "./get.js";
import { registerEntityHistoryPrompt } from "./entity/history.js";
import { registerMediaControlPrompt } from "./media/control.js";
import { registerEntitiesListPrompt } from "./entities/list.js";
import { registerServiceCallPrompt } from "./service/call.js";
import { registerLightServiceCallPrompt } from "./service/light-control.js";
import { registerCoverServiceCallPrompt } from "./service/cover-control.js";
import { registerClimateServiceCallPrompt } from "./service/climate-control.js";
import { registerSceneServiceCallPrompt } from "./service/scene-control.js";
import { registerMediaPlayerServiceCallPrompt } from "./service/media-player-control.js";
import { registerSwitchServiceCallPrompt } from "./service/switch-control.js";
import { registerEntityStatePrompt } from "./entity/state.js";
import { registerEntitiesStatesPrompt } from "./entities/states.js";
import { registerSystemConfigPrompt } from "./system/config.js";
import { registerSystemErrorLogPrompt } from "./system/error-log.js";
import { registerServicesListPrompt } from "./services/list.js";
import { registerLightsListPrompt } from "./lights/list.js";
import { registerDevicesListPrompt } from "./devices/list.js";
import { registerDomainsListPrompt } from "./domains/list.js";
import { registerEntityDeletePrompt } from "./entity/delete.js";
import { registerSystemComponentsPrompt } from "./system/components.js";
import { registerSystemCoreStatePrompt } from "./system/core-state.js";
import { registerTemplateRenderPrompt } from "./template/render.js";
import { HassClient } from "../api/client.js";
import { serverLogger } from "../logger.js";

/**
 * Export all prompts for use elsewhere
 */
export {
  // registerLightControlPrompt,
  registerTempSetPrompt,
  registerPromptsList,
  registerPromptsGet,
  registerEntityHistoryPrompt,
  registerMediaControlPrompt,
  registerEntitiesListPrompt,
  registerServiceCallPrompt,
  registerLightServiceCallPrompt,
  registerCoverServiceCallPrompt,
  registerClimateServiceCallPrompt,
  registerSceneServiceCallPrompt,
  registerMediaPlayerServiceCallPrompt,
  registerSwitchServiceCallPrompt,
  registerEntityStatePrompt,
  registerEntitiesStatesPrompt,
  registerSystemConfigPrompt,
  registerSystemErrorLogPrompt,
  registerServicesListPrompt,
  registerLightsListPrompt,
  registerDevicesListPrompt,
  registerDomainsListPrompt,
  registerEntityDeletePrompt,
  registerSystemComponentsPrompt,
  registerSystemCoreStatePrompt,
  registerTemplateRenderPrompt,
};

/**
 * Register all Home Assistant prompts with the MCP server
 * @param server The MCP server to register the prompts with
 */
export function registerHassPrompts(server: McpServer) {
  // Get environment variables for Home Assistant connection
  const hassUrl = process.env.HASS_URL ?? "<NOT SET>";
  const hassToken = process.env.HASS_TOKEN ?? "<NOT SET>";
  const hassClient = new HassClient(hassUrl, hassToken);

  // Register all prompts
  // registerLightControlPrompt(server, hassClient);
  registerTempSetPrompt(server, hassClient);
  registerPromptsList(server, hassClient);
  registerPromptsGet(server, hassClient);
  registerEntityHistoryPrompt(server, hassClient);
  registerMediaControlPrompt(server, hassClient);
  registerEntitiesListPrompt(server, hassClient);
  registerServiceCallPrompt(server, hassClient);
  registerLightServiceCallPrompt(server, hassClient);
  registerCoverServiceCallPrompt(server, hassClient);
  registerClimateServiceCallPrompt(server, hassClient);
  registerSceneServiceCallPrompt(server, hassClient);
  registerMediaPlayerServiceCallPrompt(server, hassClient);
  registerSwitchServiceCallPrompt(server, hassClient);
  registerEntityStatePrompt(server, hassClient);
  registerEntitiesStatesPrompt(server, hassClient);
  registerSystemConfigPrompt(server, hassClient);
  registerSystemErrorLogPrompt(server, hassClient);
  registerServicesListPrompt(server, hassClient);
  registerLightsListPrompt(server, hassClient);
  registerDevicesListPrompt(server, hassClient);
  registerDomainsListPrompt(server, hassClient);
  registerEntityDeletePrompt(server, hassClient);
  registerSystemComponentsPrompt(server, hassClient);
  registerSystemCoreStatePrompt(server, hassClient);
  registerTemplateRenderPrompt(server);

  serverLogger.info("📝 Registered all Home Assistant prompts");
}
