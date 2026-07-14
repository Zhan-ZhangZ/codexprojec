import { jsonSchemaToZod, parseWithJsonSchema } from "../tools/schema-utils.js";

// Example JSON schema
const lightControlSchema = {
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
  },
};

// Example 1: Convert JSON schema to Zod schema
console.log("Example 1: Convert JSON schema to Zod schema");
const zodSchema = jsonSchemaToZod(lightControlSchema);
console.log("Zod schema created successfully");
console.log("Generated Zod schema:", zodSchema);

// Example 2: Validate data using the converted schema
console.log("\nExample 2: Validate data using the converted schema");
try {
  const validData = {
    entity_id: "light.living_room",
    action: "turn_on",
    brightness: 200,
  };

  const result = parseWithJsonSchema(lightControlSchema, validData);
  console.log("Valid data:", result);
} catch (error) {
  console.error("Validation error:", error);
}

// Example 3: Validation failure
console.log("\nExample 3: Validation failure");
try {
  const invalidData = {
    entity_id: "light.living_room",
    action: "invalid_action", // Invalid enum value
    brightness: 300, // Exceeds maximum
  };

  parseWithJsonSchema(lightControlSchema, invalidData);
  console.log("This should not be reached");
} catch (error) {
  console.error("Expected validation error:", error);
}

// Example 4: Using with existing light schema from light.ts
console.log("\nExample 4: Using with existing schemas");
// This would typically import the schema from light.ts
// For demonstration, we'll use a simplified version
const existingLightSchema = {
  type: "object",
  required: ["entity_id", "action"],
  properties: {
    entity_id: { type: "string" },
    action: {
      type: "string",
      enum: ["turn_on", "turn_off", "toggle"],
    },
  },
};

try {
  const data = {
    entity_id: "light.kitchen",
    action: "turn_on",
  };

  const result = parseWithJsonSchema(existingLightSchema, data);
  console.log("Valid data with existing schema:", result);
} catch (error) {
  console.error("Validation error with existing schema:", error);
}
