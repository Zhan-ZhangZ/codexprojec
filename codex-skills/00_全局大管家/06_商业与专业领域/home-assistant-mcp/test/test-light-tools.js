/* eslint-env node */
import "dotenv/config";
import { getEntities, callService } from "../dist/api.js";

// Configuration
const hassUrl = process.env.HASS_URL || "http://localhost:8123";
const hassToken = process.env.HASS_TOKEN || "";

async function testLightControls() {
  console.log("Testing Light Controls");
  console.log("=====================");

  try {
    // Step 1: Get all lights
    console.log("\nStep 1: Getting all light entities");
    console.log("----------------------------------");
    const lights = await getEntities(hassUrl, hassToken, "light");
    console.log(`Found ${lights.length} light entities`);

    // Display first light for demonstration
    if (lights.length > 0) {
      const sampleLight = lights[0];
      console.log("\nSample light details:");
      console.log(`Entity ID: ${sampleLight.entity_id}`);
      console.log(`State: ${sampleLight.state}`);
      console.log(
        `Supported Features: ${sampleLight.attributes.supported_features || 0}`,
      );
      console.log(
        `Supported Color Modes: ${JSON.stringify(sampleLight.attributes.supported_color_modes || [])}`,
      );
      console.log(
        `Effect List: ${JSON.stringify(sampleLight.attributes.effect_list || [])}`,
      );

      // Step 2: Test turning on a light
      console.log("\nStep 2: Testing turn_on service");
      console.log("-------------------------------");

      const lightToTest =
        lights.find(
          (light) =>
            light.attributes.supported_color_modes &&
            light.attributes.supported_color_modes.length > 0,
        ) || lights[0];

      console.log(`Selected light for testing: ${lightToTest.entity_id}`);

      // Get initial state
      console.log(`Initial state: ${lightToTest.state}`);

      // Determine which parameters to use based on supported features
      const serviceData = {};
      const supportedFeatures = lightToTest.attributes.supported_features || 0;
      const supportedColorModes =
        lightToTest.attributes.supported_color_modes || [];

      // Add brightness if supported
      if (supportedFeatures & 1 || supportedColorModes.includes("brightness")) {
        serviceData.brightness_pct = 50;
        console.log("Adding brightness parameter (50%)");
      }

      // Add color if supported
      if (
        supportedFeatures & 16 ||
        supportedColorModes.some((mode) =>
          ["rgb", "rgbw", "rgbww", "hs", "xy"].includes(mode),
        )
      ) {
        if (supportedColorModes.includes("rgb")) {
          serviceData.rgb_color = [255, 100, 100]; // Light red
          console.log("Adding RGB color parameter [255, 100, 100]");
        } else if (supportedColorModes.includes("hs")) {
          serviceData.hs_color = [0, 100]; // Red in HS
          console.log("Adding HS color parameter [0, 100]");
        }
      }

      // Add transition
      serviceData.transition = 2;
      console.log("Adding transition parameter (2 seconds)");

      // Call the service
      console.log("\nCalling light.turn_on service...");
      try {
        const result = await callService(
          hassUrl,
          hassToken,
          "light",
          "turn_on",
          serviceData,
          { entity_id: lightToTest.entity_id },
        );
        console.log("Service call successful!");
        console.log(JSON.stringify(result, null, 2));

        // Get updated state
        const updatedLights = await getEntities(hassUrl, hassToken, "light");
        const updatedLight = updatedLights.find(
          (light) => light.entity_id === lightToTest.entity_id,
        );
        console.log("\nUpdated light state:");
        console.log(`State: ${updatedLight.state}`);
        console.log(`Brightness: ${updatedLight.attributes.brightness}`);
        console.log(
          `Color: ${JSON.stringify(
            updatedLight.attributes.rgb_color ||
              updatedLight.attributes.hs_color ||
              updatedLight.attributes.xy_color,
          )}`,
        );

        // Step 3: Test turning off the light
        console.log("\nStep 3: Testing turn_off service");
        console.log("--------------------------------");

        console.log(`Turning off ${lightToTest.entity_id}...`);
        await callService(
          hassUrl,
          hassToken,
          "light",
          "turn_off",
          { transition: 1 },
          { entity_id: lightToTest.entity_id },
        );
        console.log("Light should now be turning off");

        // Verify it's off
        setTimeout(async () => {
          const finalLights = await getEntities(hassUrl, hassToken, "light");
          const finalLight = finalLights.find(
            (light) => light.entity_id === lightToTest.entity_id,
          );
          console.log(`Final state: ${finalLight.state}`);
        }, 1500);
      } catch (serviceError) {
        console.error("Error calling service:", serviceError.message);
        console.error(
          "This could indicate an issue with authentication, connectivity, or compatibility",
        );
      }
    } else {
      console.log("No lights found in your Home Assistant instance");
    }
  } catch (error) {
    console.error("Error connecting to Home Assistant:");
    console.error(error.message);
  }
}

// Run the test
testLightControls().catch(console.error);
