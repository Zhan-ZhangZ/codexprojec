import { HassError } from "../utils.js";
import { apiLogger } from "../logger.js";

/**
 * Handle errors from tool execution with proper logging
 */
export function handleToolError(
  toolName: string,
  error: unknown,
  context: Record<string, unknown> = {},
) {
  if (error instanceof HassError) {
    apiLogger.error(
      `Error executing ${toolName}`,
      {
        ...context,
        errorType: error.type,
        endpoint: error.endpoint,
        statusCode: error.statusCode,
        retryable: error.retryable,
      },
      error,
    );
  } else {
    apiLogger.error(
      `Unexpected error executing ${toolName}`,
      context,
      error as Error,
    );
  }
}

/**
 * Format error message for tool output
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof HassError) {
    return `${error.message} (${error.type}${error.statusCode ? `, status: ${error.statusCode}` : ""})`;
  } else if (error instanceof Error) {
    return error.message;
  } else {
    return "Unknown error occurred";
  }
}
