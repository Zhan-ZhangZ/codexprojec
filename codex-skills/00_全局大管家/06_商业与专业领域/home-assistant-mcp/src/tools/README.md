# JSON Schema to Zod Conversion Utilities

This directory contains utilities for converting between JSON Schema and Zod schemas.

## Overview

The `schema-utils.ts` file provides utilities for:

1. Converting JSON Schema to Zod schemas
2. Converting Zod schemas to JSON Schema
3. Validating data against JSON Schema using Zod

These utilities are useful for:

- Generating Zod schemas from existing JSON Schema definitions
- Creating JSON Schema documentation from Zod schemas
- Validating data against JSON Schema using Zod's powerful validation capabilities

## Usage

### Converting JSON Schema to Zod

```typescript
import { jsonSchemaToZod } from "./schema-utils";

const jsonSchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string" },
    age: { type: "number", minimum: 0 },
  },
};

const zodSchema = jsonSchemaToZod(jsonSchema);
// Now you can use zodSchema for validation
```

### Validating Data with JSON Schema via Zod

```typescript
import { parseWithJsonSchema } from "./schema-utils";

const jsonSchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string" },
    age: { type: "number", minimum: 0 },
  },
};

try {
  const data = { name: "John", age: 30 };
  const validatedData = parseWithJsonSchema(jsonSchema, data);
  console.log("Valid data:", validatedData);
} catch (error) {
  console.error("Validation error:", error);
}
```

### Converting Zod Schema to JSON Schema

```typescript
import { zodToJsonSchema } from "./schema-utils";
import { z } from "zod";

const zodSchemaObj = {
  name: z.string(),
  age: z.number().min(0).optional(),
};

const jsonSchema = zodToJsonSchema(zodSchemaObj);
console.log(JSON.stringify(jsonSchema, null, 2));
```

## Examples

See the examples directory for more detailed examples:

- `schema-example.ts`: Basic usage of JSON Schema to Zod conversion
- `lights-schema-example.ts`: Using with the lights tool schema
- `light-tool-schema-example.ts`: Using with the light tool schema
- `zod-to-json-schema-example.ts`: Converting Zod schemas to JSON Schema

## Implementation Details

- The `jsonSchemaToZod` function uses the `json-schema-to-zod` library to convert JSON Schema to Zod schema code, then evaluates it to create a Zod schema.
- The `parseWithJsonSchema` function combines conversion and validation in one step.
- The `zodToJsonSchema` function is a custom implementation that extracts JSON Schema from Zod schema objects.

## Limitations

- The `zodToJsonSchema` function supports common Zod types but may not handle all complex types.
- Some advanced JSON Schema features may not be fully supported in the conversion to Zod.
- The round-trip conversion (JSON Schema → Zod → JSON Schema) may not preserve all details of the original schema.
