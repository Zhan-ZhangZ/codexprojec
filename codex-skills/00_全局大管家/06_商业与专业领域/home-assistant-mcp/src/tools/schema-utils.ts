import convert from "json-schema-to-zod";
import { z } from "zod";
import fs from "fs";

// Define types for JSON Schema
type JsonSchemaType = {
  type: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  description?: string;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  items?: JsonSchemaProperty;
  minItems?: number;
  maxItems?: number;
  default?: unknown;
};

type JsonSchemaProperty = JsonSchemaType;

export function pathSchemaToZod(path: string): z.ZodTypeAny {
  const jsonSchema = JSON.parse(fs.readFileSync(path, "utf8"));
  return jsonSchemaToZod(jsonSchema);
}

/**
 * Convert a JSON schema to a Zod schema
 * @param jsonSchema The JSON schema to convert
 * @returns The generated Zod schema
 */
export function jsonSchemaToZod(jsonSchema: object): z.ZodTypeAny {
  try {
    // Convert the JSON schema to Zod schema code
    const zodSchemaCode = convert(jsonSchema);

    // Evaluate the Zod schema code to get the actual Zod schema
    // This is a safe use of eval since we're controlling the input
    // and the output is a Zod schema

    const zodSchema = new Function("z", `return ${zodSchemaCode}`)(z);
    return zodSchema;
  } catch (error) {
    console.error("Error converting JSON schema to Zod:", error);
    throw error;
  }
}

/**
 * Parse and validate data against a JSON schema using Zod
 * @param jsonSchema The JSON schema to validate against
 * @param data The data to validate
 * @returns The validated data
 * @throws If the data is invalid
 */
export function parseWithJsonSchema<T>(jsonSchema: object, data: unknown): T {
  const zodSchema = jsonSchemaToZod(jsonSchema);
  return zodSchema.parse(data) as T;
}

/**
 * Extract a JSON schema from a Zod schema object
 * This is a simplified implementation that handles common Zod schema types
 * @param zodSchemaObj An object containing Zod schema properties
 * @returns A JSON schema representation
 */
export function zodToJsonSchema(
  zodSchemaObj: Record<string, z.ZodTypeAny>,
): JsonSchemaType {
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  // Process each property in the Zod schema object
  for (const [key, zodType] of Object.entries(zodSchemaObj)) {
    const property = extractJsonSchemaProperty(zodType);

    // Add description if available
    const description = zodType.description;
    if (description) {
      property.description = description;
    }

    // Check if the property is required
    if (!isOptional(zodType)) {
      required.push(key);
    }

    properties[key] = property;
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

/**
 * Extract JSON schema property from a Zod type
 * @param zodType The Zod type to extract from
 * @returns The JSON schema property
 */
function extractJsonSchemaProperty(zodType: z.ZodTypeAny): JsonSchemaProperty {
  // Handle string
  if (zodType instanceof z.ZodString) {
    return { type: "string" };
  }

  // Handle number
  if (zodType instanceof z.ZodNumber) {
    const schema: JsonSchemaProperty = { type: "number" };

    // Add min/max constraints if defined
    type ZodCheck = { kind: string; value: number };
    const checks = (zodType._def.checks || []) as ZodCheck[];

    for (const check of checks) {
      if (check.kind === "min") {
        schema.minimum = check.value;
      } else if (check.kind === "max") {
        schema.maximum = check.value;
      }
    }

    return schema;
  }

  // Handle boolean
  if (zodType instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }

  // Handle enum
  if (zodType instanceof z.ZodEnum) {
    return {
      type: "string",
      enum: zodType._def.values,
    };
  }

  // Handle array
  if (zodType instanceof z.ZodArray) {
    const itemSchema = extractJsonSchemaProperty(zodType._def.type);
    const schema: JsonSchemaProperty = {
      type: "array",
      items: itemSchema,
    };

    // Add length constraints if defined
    if (zodType._def.exactLength !== null) {
      schema.minItems = zodType._def.exactLength?.value;
      schema.maxItems = zodType._def.exactLength?.value;
    }

    return schema;
  }

  // Handle optional types
  if (zodType instanceof z.ZodOptional) {
    return extractJsonSchemaProperty(zodType._def.innerType);
  }

  // Handle default values
  if (zodType instanceof z.ZodDefault) {
    const schema = extractJsonSchemaProperty(zodType._def.innerType);
    schema.default = zodType._def.defaultValue();
    return schema;
  }

  // Fallback for unsupported types
  return { type: "object" };
}

/**
 * Check if a Zod type is optional
 * @param zodType The Zod type to check
 * @returns True if the type is optional
 */
function isOptional(zodType: z.ZodTypeAny): boolean {
  return zodType instanceof z.ZodOptional || zodType instanceof z.ZodDefault;
}
