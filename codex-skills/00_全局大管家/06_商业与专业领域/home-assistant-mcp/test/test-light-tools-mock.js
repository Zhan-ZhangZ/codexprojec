/**
 * Mock test for light tools
 * This test demonstrates the light tools functionality with sample data
 */

// Sample light data
const mockLights = [
  {
    entity_id: "light.single1",
    state: "off",
    attributes: {
      friendly_name: "Single Light 1",
      supported_features: 1,
      supported_color_modes: ["brightness"],
      min_mireds: 153,
      max_mireds: 500,
      brightness: 0,
    },
    last_changed: "2023-04-23T10:15:30.123Z",
    last_updated: "2023-04-23T10:15:30.123Z",
  },
  {
    entity_id: "light.light",
    state: "on",
    attributes: {
      friendly_name: "Main Light",
      supported_features: 19,
      supported_color_modes: ["color_temp", "hs", "xy"],
      min_mireds: 153,
      max_mireds: 500,
      brightness: 124,
      color_temp: 300,
      hs_color: [30, 70],
    },
    last_changed: "2023-04-23T09:30:15.456Z",
    last_updated: "2023-04-23T09:30:15.456Z",
  },
  {
    entity_id: "light.shapes_7fef",
    state: "on",
    attributes: {
      friendly_name: "Shapes Light",
      supported_features: 23,
      supported_color_modes: ["color_temp", "hs"],
      min_mireds: 200,
      max_mireds: 454,
      brightness: 255,
      color_temp: 250,
      hs_color: [0, 0],
      rgb_color: [255, 255, 255],
      effect_list: ["colorloop", "fireworks", "random", "bounce", "custom"],
      effect: "none",
    },
    last_changed: "2023-04-23T08:45:00.789Z",
    last_updated: "2023-04-23T08:45:00.789Z",
  },
];

// Mock validateLightParameters function
function validateLightParameters(entity, params) {
  console.log("\nValidating parameters for", entity.entity_id);
  console.log("Parameters:", JSON.stringify(params));

  const supportedFeatures = entity.attributes.supported_features || 0;
  const supportedColorModes = entity.attributes.supported_color_modes || [];
  const errors = [];
  const warnings = [];
  let filteredParams = { ...params };

  // Bit flags for light features
  const SUPPORT_BRIGHTNESS = 1;
  const SUPPORT_COLOR_TEMP = 2;
  const SUPPORT_EFFECT = 4;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const SUPPORT_FLASH = 8;
  const SUPPORT_COLOR = 16;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const SUPPORT_TRANSITION = 32;

  // Check for brightness support
  if (
    (params.brightness !== undefined || params.brightness_pct !== undefined) &&
    !(supportedFeatures & SUPPORT_BRIGHTNESS) &&
    !supportedColorModes.includes("brightness")
  ) {
    errors.push(
      `Light ${entity.entity_id} does not support brightness control`,
    );
    delete filteredParams.brightness;
    delete filteredParams.brightness_pct;
  }

  // Check for color temperature support
  if (
    params.color_temp !== undefined &&
    !(supportedFeatures & SUPPORT_COLOR_TEMP) &&
    !supportedColorModes.includes("color_temp")
  ) {
    errors.push(
      `Light ${entity.entity_id} does not support color temperature control`,
    );
    delete filteredParams.color_temp;
  }

  // Check for color support
  const colorParams = [
    "rgb_color",
    "hs_color",
    "xy_color",
    "rgbw_color",
    "rgbww_color",
    "color_name",
  ];
  const hasColorParams = colorParams.some(
    (param) => params[param] !== undefined,
  );

  if (
    hasColorParams &&
    !(supportedFeatures & SUPPORT_COLOR) &&
    !supportedColorModes.some((mode) =>
      ["rgb", "rgbw", "rgbww", "hs", "xy"].includes(mode),
    )
  ) {
    errors.push(`Light ${entity.entity_id} does not support color control`);
    colorParams.forEach((param) => delete filteredParams[param]);
  } else {
    // Check specific color mode compatibility
    if (
      params.rgb_color !== undefined &&
      !supportedColorModes.some((mode) =>
        ["rgb", "rgbw", "rgbww"].includes(mode),
      )
    ) {
      warnings.push(`RGB color may not be supported for ${entity.entity_id}`);
    }
    if (params.hs_color !== undefined && !supportedColorModes.includes("hs")) {
      warnings.push(`HS color may not be supported for ${entity.entity_id}`);
    }
    if (params.xy_color !== undefined && !supportedColorModes.includes("xy")) {
      warnings.push(`XY color may not be supported for ${entity.entity_id}`);
    }
  }

  // Check for effect support
  if (params.effect !== undefined && !(supportedFeatures & SUPPORT_EFFECT)) {
    errors.push(`Light ${entity.entity_id} does not support effects`);
    delete filteredParams.effect;
  } else if (params.effect !== undefined) {
    // Verify the effect is in the list of supported effects
    const effectList = entity.attributes.effect_list || [];
    if (!effectList.includes(params.effect)) {
      warnings.push(
        `Effect "${params.effect}" may not be supported for ${entity.entity_id}. Supported effects: ${effectList.join(", ")}`,
      );
    }
  }

  // Log results
  if (errors.length > 0) {
    console.log("❌ Validation errors:");
    errors.forEach((error) => console.log(`   - ${error}`));
  }

  if (warnings.length > 0) {
    console.log("⚠️ Validation warnings:");
    warnings.forEach((warning) => console.log(`   - ${warning}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log("✅ All parameters are valid for this light");
  }

  console.log("Filtered parameters:", JSON.stringify(filteredParams));

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    filteredParams,
  };
}

// Demo function
function demonstrateValidation() {
  console.log("==================================");
  console.log("Light Parameter Validation Demo");
  console.log("==================================");

  // Test cases
  const testCases = [
    {
      title: "Case 1: Single1 Light (brightness only) - Turn on",
      light: mockLights[0], // Single1 Light
      params: {
        action: "turn_on",
        entity_id: "light.single1",
        brightness_pct: 75,
      },
    },
    {
      title: "Case 2: Single1 Light (brightness only) - With color",
      light: mockLights[0], // Single1 Light
      params: {
        action: "turn_on",
        entity_id: "light.single1",
        brightness_pct: 75,
        rgb_color: [255, 0, 0], // Should be rejected
      },
    },
    {
      title:
        "Case 3: Main Light (color_temp, hs, xy) - With multiple parameters",
      light: mockLights[1], // Main Light
      params: {
        action: "turn_on",
        entity_id: "light.light",
        brightness_pct: 50,
        color_temp: 300,
        transition: 2,
      },
    },
    {
      title: "Case 4: Shapes Light (color_temp, hs) - With effect",
      light: mockLights[2], // Shapes Light
      params: {
        action: "turn_on",
        entity_id: "light.shapes_7fef",
        effect: "colorloop",
      },
    },
    {
      title: "Case 5: Shapes Light (color_temp, hs) - With unsupported effect",
      light: mockLights[2], // Shapes Light
      params: {
        action: "turn_on",
        entity_id: "light.shapes_7fef",
        effect: "disco", // Not in effect_list
      },
    },
    {
      title: "Case 6: Shapes Light (color_temp, hs) - With mixed parameters",
      light: mockLights[2], // Shapes Light
      params: {
        action: "turn_on",
        entity_id: "light.shapes_7fef",
        brightness_pct: 100,
        hs_color: [240, 100], // Blue
        color_name: "blue", // Should be filtered as redundant/conflicting
        rgb_color: [0, 0, 255], // Should cause a warning as RGB is not supported
        effect: "colorloop",
        transition: 1,
      },
    },
  ];

  // Run test cases
  testCases.forEach((testCase, index) => {
    console.log(`\n\n--- Test Case ${index + 1}: ${testCase.title} ---`);
    validateLightParameters(testCase.light, testCase.params);
  });

  console.log("\n==================================");
  console.log("Demo Complete");
  console.log("==================================");
}

// Run the demo
demonstrateValidation();
