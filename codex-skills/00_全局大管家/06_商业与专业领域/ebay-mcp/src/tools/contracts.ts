import type { OutputArgs, ToolAnnotations, ToolDefinition } from '@/tools/definitions/types.js';
import { getToolEntries } from '@/tools/registry.js';

/** Public tool contract shape exposed to consumers after registry normalization. */
export interface ToolContract {
  annotations?: ToolAnnotations;
  description: string;
  name: string;
  inputSchema: ToolDefinition['inputSchema'];
  outputSchema?: OutputArgs;
  title?: string;
}

/** Validation report for duplicate, incomplete, or malformed tool contracts. */
export interface ToolContractValidation {
  duplicateContracts: string[];
  invalidInputSchemaFields: string[];
  malformedOutputSchemas: string[];
  missingDescriptions: string[];
  missingInputSchemas: string[];
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Builds public tool contracts from the validated tool registry entries. */
export function getToolContracts(): ToolContract[] {
  return getToolEntries().map(({ definition }) => ({
    annotations: definition.annotations,
    description: definition.description,
    name: definition.name,
    inputSchema: definition.inputSchema,
    outputSchema: definition.outputSchema,
    title: definition.title,
  }));
}

function isZodLikeSchema(schema: unknown): boolean {
  return (
    typeof schema === 'object' &&
    schema !== null &&
    'safeParse' in schema &&
    typeof schema.safeParse === 'function'
  );
}

/** Validates tool contracts for unique names, descriptions, input schemas, and output schemas. */
export function validateToolContracts(
  contracts: ToolContract[] = getToolContracts()
): ToolContractValidation {
  const seenNames = new Set<string>();
  const duplicateContracts = new Set<string>();
  const invalidInputSchemaFields: string[] = [];
  const malformedOutputSchemas: string[] = [];
  const missingDescriptions: string[] = [];
  const missingInputSchemas: string[] = [];

  for (const contract of contracts) {
    if (seenNames.has(contract.name)) {
      duplicateContracts.add(contract.name);
    }
    seenNames.add(contract.name);

    if (!contract.inputSchema || typeof contract.inputSchema !== 'object') {
      missingInputSchemas.push(contract.name);
    } else {
      for (const [fieldName, schema] of Object.entries(contract.inputSchema)) {
        if (!isZodLikeSchema(schema)) {
          invalidInputSchemaFields.push(`${contract.name}.${fieldName}`);
        }
      }
    }

    if (!contract.description.trim()) {
      missingDescriptions.push(contract.name);
    }

    const outputSchema = contract.outputSchema as Record<string, unknown> | undefined;
    if (outputSchema && !isJsonObject(outputSchema)) {
      malformedOutputSchemas.push(contract.name);
    } else if (
      outputSchema &&
      'type' in outputSchema &&
      outputSchema.type !== 'object' &&
      outputSchema.type !== undefined
    ) {
      malformedOutputSchemas.push(contract.name);
    } else if (outputSchema && !('type' in outputSchema) && !('$ref' in outputSchema)) {
      malformedOutputSchemas.push(contract.name);
    }
  }

  return {
    duplicateContracts: [...duplicateContracts].sort(),
    invalidInputSchemaFields: invalidInputSchemaFields.sort(),
    malformedOutputSchemas: malformedOutputSchemas.sort(),
    missingDescriptions: missingDescriptions.sort(),
    missingInputSchemas: missingInputSchemas.sort(),
  };
}
