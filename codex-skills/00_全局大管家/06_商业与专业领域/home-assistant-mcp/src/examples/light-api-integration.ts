import { zodToJsonSchema, parseWithJsonSchema } from "../tools/schema-utils.js";
import { z } from "zod";
import type { HassState } from "../types/states/state.types.js";
import type { LightServiceData } from "../types/light/light.types.js";

// Mock Home Assistant API client
class MockHassClient {
  async callService(
    domain: string,
    service: string,
    serviceData: LightServiceData,
  ): Promise<void> {
    console.log(
      `[Mock API] Calling service ${domain}.${service} with data:`,
      serviceData,
    );
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(`[Mock API] Service ${domain}.${service} called successfully`);
  }

  async getEntityState(entityId: string): Promise<HassState> {
    console.log(`[Mock API] Getting state for entity ${entityId}`);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Return mock state based on entity ID
    if (entityId.startsWith("light.")) {
      return {
        entity_id: entityId,
        state: "on",
        attributes: {
          brightness: 255,
          rgb_color: [255, 255, 255],
          effect: "none",
          friendly_name: entityId.split(".")[1].replace(/_/g, " "),
        },
        last_changed: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        context: {
          id: "01H9XYZABC123456789",
          parent_id: null,
          user_id: null,
        },
      };
    }

    throw new Error(`Entity ${entityId} not found`);
  }
}

// This is the light tool schema from light.ts
const lightToolSchema = {
  entity_id: z
    .string()
    .describe("Light entity ID to control (e.g., 'light.living_room')"),
  action: z
    .enum(["turn_on", "turn_off", "toggle"])
    .describe("Action to perform on the light"),
  brightness: z
    .number()
    .min(0)
    .max(255)
    .optional()
    .describe("Brightness level (0-255, where 255 is maximum brightness)"),
  brightness_pct: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Brightness percentage (0-100%)"),
  rgb_color: z
    .array(z.number().min(0).max(255))
    .length(3)
    .optional()
    .describe("RGB color as [r, g, b] with values from 0-255"),
  effect: z
    .enum([
      "none",
      "colorloop",
      "random",
      "bounce",
      "candle",
      "fireworks",
      "custom",
    ])
    .optional()
    .describe("Light effect to apply"),
};

// Define the type for the light control parameters
type LightControlParams = {
  entity_id: string;
  action: "turn_on" | "turn_off" | "toggle";
  brightness?: number;
  brightness_pct?: number;
  rgb_color?: [number, number, number];
  effect?:
    | "none"
    | "colorloop"
    | "random"
    | "bounce"
    | "candle"
    | "fireworks"
    | "custom";
};

// Convert the Zod schema to JSON schema
const lightJsonSchema = zodToJsonSchema(lightToolSchema);

// Create a mock Home Assistant client
const hassClient = new MockHassClient();

interface CommandResult {
  success: boolean;
  message: string;
  state?: HassState;
  error?: string;
}

/**
 * Process a light control command using JSON schema validation
 */
async function processLightCommand(command: unknown): Promise<CommandResult> {
  try {
    // Validate the command against the JSON schema
    const validatedCommand = parseWithJsonSchema<LightControlParams>(
      lightJsonSchema,
      command,
    );

    console.log("Command validated successfully:", validatedCommand);

    // Extract entity_id and action
    const { entity_id, action, ...serviceData } = validatedCommand;

    // Call the Home Assistant API
    await hassClient.callService("light", action, {
      entity_id,
      ...serviceData,
    } as LightServiceData);

    // Get the updated state
    const updatedState = await hassClient.getEntityState(entity_id);

    return {
      success: true,
      message: `Successfully executed ${action} on ${entity_id}`,
      state: updatedState,
    };
  } catch (error) {
    console.error("Error processing light command:", error);

    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Main function to run the examples
async function main() {
  console.log("Light API Integration Example\n");

  // Example 1: Process a valid light command
  console.log("Example 1: Processing a valid light command");
  const validCommand = {
    entity_id: "light.living_room",
    action: "turn_on",
    brightness: 200,
    rgb_color: [0, 255, 0], // Green
  };

  const result1 = await processLightCommand(validCommand);
  console.log("Result:", result1);

  console.log("\n-----------------------------------\n");

  // Example 2: Process an invalid light command
  console.log("Example 2: Processing an invalid light command");
  const invalidCommand = {
    entity_id: "light.kitchen",
    action: "blink", // Invalid action
    brightness: 300, // Exceeds maximum
  };

  const result2 = await processLightCommand(invalidCommand);
  console.log("Result:", result2.success, result2.message);

  console.log("\n-----------------------------------\n");

  // Example 3: Process a command with user input
  console.log("Example 3: Processing a command with user input");

  // Simulate user input from a form or API request
  const userInput = {
    entity_id: "light.bedroom",
    action: "turn_on",
    brightness_pct: 75, // Use percentage instead of absolute brightness
    effect: "colorloop",
  };

  const result3 = await processLightCommand(userInput);
  console.log("Result:", result3);
}

// Run the main function
main().catch((error) => {
  console.error("Unhandled error:", error);
});
