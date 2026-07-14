import { parseWithJsonSchema } from "../tools/schema-utils.js";
import { z } from "zod";

// This is a simplified version of the Zod schema used in light.ts
// We're recreating it here for demonstration purposes
const lightToolZodSchema = {
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
  color_name: z
    .string()
    .optional()
    .describe("Named color (e.g., 'red', 'green', 'blue')"),
  rgb_color: z
    .array(z.number().min(0).max(255))
    .length(3)
    .optional()
    .describe("RGB color as [r, g, b] with values from 0-255"),
};

// Convert the Zod schema to an equivalent JSON schema
const lightToolJsonSchema = {
  type: "object",
  required: ["entity_id", "action"],
  properties: {
    entity_id: {
      type: "string",
      description: "Light entity ID to control (e.g., 'light.living_room')",
    },
    action: {
      type: "string",
      enum: ["turn_on", "turn_off", "toggle"],
      description: "Action to perform on the light",
    },
    brightness: {
      type: "number",
      minimum: 0,
      maximum: 255,
      description: "Brightness level (0-255, where 255 is maximum brightness)",
    },
    brightness_pct: {
      type: "number",
      minimum: 0,
      maximum: 100,
      description: "Brightness percentage (0-100%)",
    },
    color_name: {
      type: "string",
      description: "Named color (e.g., 'red', 'green', 'blue')",
    },
    rgb_color: {
      type: "array",
      items: {
        type: "number",
        minimum: 0,
        maximum: 255,
      },
      minItems: 3,
      maxItems: 3,
      description: "RGB color as [r, g, b] with values from 0-255",
    },
  },
};

console.log("Example: Using the light tool schema from light.ts");

// Example 1: Validate data using the JSON schema converted to Zod
console.log("\n1. Validating data using JSON schema converted to Zod:");
try {
  const validData = {
    entity_id: "light.living_room",
    action: "turn_on",
    brightness: 200,
  };

  // Define the expected type for better type safety
  type LightControlParams = {
    entity_id: string;
    action: "turn_on" | "turn_off" | "toggle";
    brightness?: number;
    brightness_pct?: number;
    color_name?: string;
    rgb_color?: [number, number, number];
  };

  const result = parseWithJsonSchema<LightControlParams>(
    lightToolJsonSchema,
    validData,
  );
  console.log("Valid data:", result);
} catch (error) {
  console.error("Validation error:", error);
}

// Example 2: Compare with direct Zod validation
console.log("\n2. Comparing with direct Zod validation:");
try {
  const directZodSchema = z.object({
    ...lightToolZodSchema,
    // Add required fields constraint
    entity_id: lightToolZodSchema.entity_id,
    action: lightToolZodSchema.action,
  });

  const validData = {
    entity_id: "light.kitchen",
    action: "turn_off",
    brightness_pct: 75,
  };

  const directResult = directZodSchema.parse(validData);
  console.log("Direct Zod validation result:", directResult);

  // Compare with JSON schema to Zod approach
  const convertedResult = parseWithJsonSchema(lightToolJsonSchema, validData);
  console.log("JSON schema to Zod validation result:", convertedResult);

  // Check if results are equivalent
  console.log(
    "Results are equivalent:",
    JSON.stringify(directResult) === JSON.stringify(convertedResult),
  );
} catch (error) {
  console.error("Validation error:", error);
}

// Example 3: Practical use case - validating user input for light control
console.log(
  "\n3. Practical use case - validating user input for light control:",
);

// Simulate user input (e.g., from a form or API request)
const userInput = {
  entity_id: "light.bedroom",
  action: "turn_on",
  brightness: 180,
  rgb_color: [255, 0, 0], // Red color
};

try {
  // Validate the user input against the JSON schema
  type LightControlParams = {
    entity_id: string;
    action: "turn_on" | "turn_off" | "toggle";
    brightness?: number;
    brightness_pct?: number;
    color_name?: string;
    rgb_color?: [number, number, number];
  };

  const validatedInput = parseWithJsonSchema<LightControlParams>(
    lightToolJsonSchema,
    userInput,
  );

  // Simulate calling the Home Assistant API with the validated input
  console.log(
    "Calling Home Assistant API with validated input:",
    validatedInput,
  );
  console.log(
    `Action: ${validatedInput.action} on ${validatedInput.entity_id}`,
  );

  if (validatedInput.brightness) {
    console.log(`Setting brightness to: ${validatedInput.brightness}`);
  }

  if (validatedInput.rgb_color) {
    console.log(
      `Setting RGB color to: [${validatedInput.rgb_color.join(", ")}]`,
    );
  }
} catch (error) {
  console.error("Invalid user input:", error);
}
