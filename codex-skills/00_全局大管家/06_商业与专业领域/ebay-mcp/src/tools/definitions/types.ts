import type { z } from 'zod';

/** JSON-schema-like output contract attached to a tool definition. */
export interface OutputArgs {
  [x: string]: unknown;
  type: 'object';
  properties?: Record<string, object>;
  required?: string[];
}

/** Optional MCP annotations that describe tool execution behavior to clients. */
export interface ToolAnnotations {
  [x: string]: unknown;
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

/** Public definition for a tool, including name, schemas, metadata, and annotations. */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  title?: string;
  outputSchema?: OutputArgs;
  annotations?: ToolAnnotations;
  _meta?: Record<string, unknown>;
}
