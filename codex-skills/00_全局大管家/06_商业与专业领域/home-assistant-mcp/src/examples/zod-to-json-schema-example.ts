import {
  zodToJsonSchema,
  jsonSchemaToZod,
  parseWithJsonSchema,
} from "../tools/schema-utils.js";
import { z } from "zod";

// Define a Zod schema similar to what's used in light.ts
const lightZodSchema = {
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

console.log("Example: Converting Zod schema to JSON schema");

// Example 1: Convert Zod schema to JSON schema
console.log("\n1. Converting Zod schema to JSON schema:");
const jsonSchema = zodToJsonSchema(lightZodSchema);
console.log("Generated JSON schema:");
console.log(JSON.stringify(jsonSchema, null, 2));

// Example 2: Round-trip conversion (Zod -> JSON Schema -> Zod)
console.log("\n2. Round-trip conversion (Zod -> JSON Schema -> Zod):");
const roundTripZodSchema = jsonSchemaToZod(jsonSchema);
console.log("Round-trip Zod schema created successfully");
console.log("Generated round-trip Zod schema:", roundTripZodSchema);

// Example 3: Validate data using the round-trip schema
console.log("\n3. Validating data using the round-trip schema:");
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

  const result = parseWithJsonSchema<LightControlParams>(jsonSchema, validData);
  console.log("Valid data:", result);
} catch (error) {
  console.error("Validation error:", error);
}

// Example 4: Generate JSON schema for documentation
console.log("\n4. Using JSON schema for documentation:");
console.log("Property documentation:");

// Define types for JSON Schema
type JsonSchema = {
  properties: Record<string, JsonSchemaProperty>;
  type: string;
  required?: string[];
};

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

// Cast the properties to the correct type
const properties = (jsonSchema as JsonSchema).properties;

for (const [key, prop] of Object.entries(properties)) {
  console.log(`- ${key}: ${prop.description || "No description"}`);
  console.log(`  Type: ${prop.type}`);

  if (prop.enum) {
    console.log(`  Allowed values: ${prop.enum.join(", ")}`);
  }

  if (prop.minimum !== undefined || prop.maximum !== undefined) {
    const range = [];
    if (prop.minimum !== undefined) range.push(`min: ${prop.minimum}`);
    if (prop.maximum !== undefined) range.push(`max: ${prop.maximum}`);
    console.log(`  Range: ${range.join(", ")}`);
  }

  console.log("");
}
