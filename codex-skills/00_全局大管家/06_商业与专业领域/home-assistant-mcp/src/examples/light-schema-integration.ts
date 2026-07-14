import { zodToJsonSchema, parseWithJsonSchema } from "../tools/schema-utils.js";
import { z } from "zod";

// This is the actual schema from light.ts
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
  color_name: z
    .string()
    .optional()
    .describe("Named color (e.g., 'red', 'green', 'blue')"),
  rgb_color: z
    .array(z.number().min(0).max(255))
    .length(3)
    .optional()
    .describe("RGB color as [r, g, b] with values from 0-255"),
  rgbw_color: z
    .array(z.number().min(0).max(255))
    .length(4)
    .optional()
    .describe("RGBW color as [r, g, b, w] with values from 0-255"),
  rgbww_color: z
    .array(z.number().min(0).max(255))
    .length(5)
    .optional()
    .describe(
      "RGBWW color as [r, g, b, c_white, w_white] with values from 0-255",
    ),
  xy_color: z
    .array(z.number())
    .length(2)
    .optional()
    .describe("CIE xy color as [x (0-1), y (0-1)]"),
  hs_color: z
    .array(z.number())
    .length(2)
    .optional()
    .describe("Hue/Saturation color as [hue (0-360), saturation (0-100)]"),
  color_temp: z.number().optional().describe("Color temperature in mireds"),
  kelvin: z.number().optional().describe("Color temperature in Kelvin"),
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
  transition: z.number().optional().describe("Transition time in seconds"),
  flash: z
    .enum(["short", "long"])
    .optional()
    .describe("Flash effect (short or long)"),
  color_mode: z
    .enum([
      "color_temp",
      "hs",
      "rgb",
      "rgbw",
      "rgbww",
      "xy",
      "brightness",
      "onoff",
    ])
    .optional()
    .describe("Color mode to use"),
};

// Define the type for the light control parameters
type LightControlParams = {
  entity_id: string;
  action: "turn_on" | "turn_off" | "toggle";
  brightness?: number;
  brightness_pct?: number;
  color_name?: string;
  rgb_color?: [number, number, number];
  rgbw_color?: [number, number, number, number];
  rgbww_color?: [number, number, number, number, number];
  xy_color?: [number, number];
  hs_color?: [number, number];
  color_temp?: number;
  kelvin?: number;
  effect?:
    | "none"
    | "colorloop"
    | "random"
    | "bounce"
    | "candle"
    | "fireworks"
    | "custom";
  transition?: number;
  flash?: "short" | "long";
  color_mode?:
    | "color_temp"
    | "hs"
    | "rgb"
    | "rgbw"
    | "rgbww"
    | "xy"
    | "brightness"
    | "onoff";
};

console.log("Light Schema Integration Example");

// Convert the Zod schema to JSON schema
console.log("\n1. Converting light tool Zod schema to JSON schema:");
const lightJsonSchema = zodToJsonSchema(lightToolSchema);
console.log("JSON schema generated successfully");

// Example 1: Validate a simple light control command
console.log("\n2. Validating a simple light control command:");
try {
  const simpleCommand = {
    entity_id: "light.living_room",
    action: "turn_on",
  };

  const validatedCommand = parseWithJsonSchema<LightControlParams>(
    lightJsonSchema,
    simpleCommand,
  );
  console.log("Simple command validated successfully:", validatedCommand);
} catch (error) {
  console.error("Validation error:", error);
}

// Example 2: Validate a complex light control command
console.log("\n3. Validating a complex light control command:");
try {
  const complexCommand = {
    entity_id: "light.kitchen",
    action: "turn_on",
    brightness: 200,
    rgb_color: [255, 0, 0],
    transition: 2,
    effect: "colorloop",
  };

  const validatedCommand = parseWithJsonSchema<LightControlParams>(
    lightJsonSchema,
    complexCommand,
  );
  console.log("Complex command validated successfully:");
  console.log(`- Entity: ${validatedCommand.entity_id}`);
  console.log(`- Action: ${validatedCommand.action}`);
  console.log(`- Brightness: ${validatedCommand.brightness}`);
  console.log(`- RGB Color: [${validatedCommand.rgb_color?.join(", ")}]`);
  console.log(`- Transition: ${validatedCommand.transition}s`);
  console.log(`- Effect: ${validatedCommand.effect}`);
} catch (error) {
  console.error("Validation error:", error);
}

// Example 3: Validate an invalid light control command
console.log("\n4. Validating an invalid light control command:");
try {
  const invalidCommand = {
    entity_id: "light.bedroom",
    action: "pulse", // Invalid action
    brightness: 300, // Exceeds maximum
    color_mode: "invalid", // Invalid color mode
  };

  parseWithJsonSchema<LightControlParams>(lightJsonSchema, invalidCommand);
  console.log("This should not be reached");
} catch (error) {
  console.error("Expected validation error:", error);
}

// Example 4: Generate documentation from the JSON schema
console.log("\n5. Generating documentation from the JSON schema:");

// Define a type for the property structure
type JsonSchemaProperty = {
  type: string;
  description?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  items?: JsonSchemaProperty | { type: string };
  minItems?: number;
  maxItems?: number;
};

interface JsonSchema {
  type: string;
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}

// Generate markdown documentation
console.log("## Light Control Parameters\n");
console.log("| Parameter | Type | Description | Constraints |");
console.log("|-----------|------|-------------|-------------|");

const properties = (lightJsonSchema as JsonSchema).properties;
const required = (lightJsonSchema as JsonSchema).required || [];

for (const [key, prop] of Object.entries(properties)) {
  let constraints = "";

  if (prop.enum) {
    constraints += `Values: ${prop.enum.join(", ")}`;
  }

  if (prop.minimum !== undefined || prop.maximum !== undefined) {
    if (constraints) constraints += "<br>";
    const range = [];
    if (prop.minimum !== undefined) range.push(`Min: ${prop.minimum}`);
    if (prop.maximum !== undefined) range.push(`Max: ${prop.maximum}`);
    constraints += range.join(", ");
  }

  if (
    prop.type === "array" &&
    prop.minItems !== undefined &&
    prop.maxItems !== undefined
  ) {
    if (constraints) constraints += "<br>";
    constraints += `Length: ${prop.minItems}`;
  }

  const isRequired = required.includes(key);
  const typeStr = `${prop.type}${isRequired ? " (required)" : " (optional)"}`;

  console.log(
    `| ${key} | ${typeStr} | ${prop.description || ""} | ${constraints} |`,
  );
}
