import { parseWithJsonSchema } from "../tools/schema-utils.js";
import { z } from "zod";

// This is the Zod schema used in the lights.ts tool
const lightsZodSchema = {
  entity_id: z
    .string()
    .optional()
    .describe("Optional light entity ID to filter results"),
  include_details: z
    .boolean()
    .default(true)
    .describe("Include detailed information about supported features"),
};

// Convert the Zod schema to a JSON schema equivalent
const lightsJsonSchema = {
  type: "object",
  properties: {
    entity_id: {
      type: "string",
      description: "Optional light entity ID to filter results",
    },
    include_details: {
      type: "boolean",
      default: true,
      description: "Include detailed information about supported features",
    },
  },
};

console.log("Example: Using the lights tool schema");

// Example 1: Validate data using the JSON schema converted to Zod
console.log("\n1. Validating data using JSON schema converted to Zod:");
try {
  const validData = {
    entity_id: "light.living_room",
    include_details: false,
  };

  const result = parseWithJsonSchema(lightsJsonSchema, validData);
  console.log("Valid data:", result);
} catch (error) {
  console.error("Validation error:", error);
}

// Example 2: Validate data with default values
console.log("\n2. Validating data with default values:");
try {
  // Only provide entity_id, include_details should use default value
  const partialData = {
    entity_id: "light.kitchen",
  };

  const result = parseWithJsonSchema<{
    entity_id?: string;
    include_details: boolean;
  }>(lightsJsonSchema, partialData);
  console.log("Data with defaults:", result);
  console.log("include_details defaulted to:", result.include_details);
} catch (error) {
  console.error("Validation error:", error);
}

// Example 3: Validate data with no parameters (all optional/default)
console.log("\n3. Validating data with no parameters:");
try {
  const emptyData = {};

  const result = parseWithJsonSchema<{
    entity_id?: string;
    include_details: boolean;
  }>(lightsJsonSchema, emptyData);
  console.log("Empty data with defaults:", result);
} catch (error) {
  console.error("Validation error:", error);
}

// Example 4: Invalid data
console.log("\n4. Validating invalid data:");
try {
  const invalidData = {
    entity_id: 123, // Should be a string
    include_details: "yes", // Should be a boolean
  };

  parseWithJsonSchema(lightsJsonSchema, invalidData);
  console.log("This should not be reached");
} catch (error) {
  console.error("Expected validation error:", error);
}

// Example 5: Compare with direct Zod validation
console.log("\n5. Comparing with direct Zod validation:");
try {
  const directZodSchema = z.object(lightsZodSchema);

  const validData = {
    entity_id: "light.bedroom",
    include_details: true,
  };

  const directResult = directZodSchema.parse(validData);
  console.log("Direct Zod validation result:", directResult);

  // Compare with JSON schema to Zod approach
  const convertedResult = parseWithJsonSchema(lightsJsonSchema, validData);
  console.log("JSON schema to Zod validation result:", convertedResult);

  // Check if results are equivalent
  console.log(
    "Results are equivalent:",
    JSON.stringify(directResult) === JSON.stringify(convertedResult),
  );
} catch (error) {
  console.error("Validation error:", error);
}
