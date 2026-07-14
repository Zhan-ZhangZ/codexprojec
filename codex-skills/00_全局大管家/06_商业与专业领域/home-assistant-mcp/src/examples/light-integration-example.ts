import type {
  IntegrationLight,
  LightPlatformSchema_1,
  Entities,
} from "../types/integration-light";

// Example of a group light configuration
const groupLightConfig: IntegrationLight = {
  platform: "group",
  entities: ["light.living_room", "light.kitchen"] as unknown as Entities,
  name: "Living Area",
  unique_id: "main_lights_group",
  all: true,
};

// Example of a template light configuration
const templateLightConfig: LightPlatformSchema_1 = {
  platform: "template",
  lights: {
    bedroom_light: {
      friendly_name: "Bedroom Light",
      value_template: "{{ states.switch.bedroom_switch.state }}",
      // Simple string template for turn_on action
      turn_on:
        '{% if is_state("switch.bedroom_switch", "off") %} {{ service("switch.turn_on", entity_id="switch.bedroom_switch") }} {% endif %}',
      // Simple string template for turn_off action
      turn_off:
        '{% if is_state("switch.bedroom_switch", "on") %} {{ service("switch.turn_off", entity_id="switch.bedroom_switch") }} {% endif %}',
    },
  },
};

// Example of a combined configuration
const lightConfiguration: IntegrationLight = [
  groupLightConfig,
  templateLightConfig,
];

console.log(
  "Light Configuration:",
  JSON.stringify(lightConfiguration, null, 2),
);

// Function that accepts light configuration
function processLightConfig(config: IntegrationLight): void {
  if (Array.isArray(config)) {
    console.log("Processing multiple light configurations");
    config.forEach((item) => {
      console.log(`- Platform: ${item.platform}`);
    });
  } else {
    console.log(
      `Processing single light configuration for platform: ${config.platform}`,
    );
  }
}

// Test the function
processLightConfig(lightConfiguration);
processLightConfig(groupLightConfig);
