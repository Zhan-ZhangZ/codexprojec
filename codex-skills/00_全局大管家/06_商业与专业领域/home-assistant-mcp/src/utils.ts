// Helper functions for Home Assistant API interactions
import type { EntityId } from "./types/common/types.js";

// Global state tracking
export let homeAssistantAvailable = false;

/**
 * Error types for Home Assistant API interactions
 */
export enum HassErrorType {
  CONNECTION_TIMEOUT = "connection_timeout",
  CONNECTION_REFUSED = "connection_refused",
  AUTHENTICATION_FAILED = "authentication_failed",
  RESOURCE_NOT_FOUND = "resource_not_found",
  SERVER_ERROR = "server_error",
  NETWORK_ERROR = "network_error",
  UNKNOWN_ERROR = "unknown_error",
}

/**
 * Enhanced error class for Home Assistant API errors
 */
export class HassError extends Error {
  type: HassErrorType;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  retryable: boolean;
  recommendedAction?: string;

  constructor(
    message: string,
    type: HassErrorType = HassErrorType.UNKNOWN_ERROR,
    options: {
      endpoint?: string;
      method?: string;
      statusCode?: number;
      retryable?: boolean;
      recommendedAction?: string;
      cause?: Error;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.type = type;
    this.endpoint = options.endpoint;
    this.method = options.method;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? false;
    this.recommendedAction = options.recommendedAction;
    this.name = "HassError";
  }

  /**
   * Create a formatted error message with all details
   */
  getDetailedMessage(): string {
    const details = [
      `Error Type: ${this.type}`,
      this.endpoint ? `Endpoint: ${this.endpoint}` : null,
      this.method ? `Method: ${this.method}` : null,
      this.statusCode ? `Status Code: ${this.statusCode}` : null,
      this.retryable
        ? "This error is retryable."
        : "This error is not retryable.",
      this.recommendedAction
        ? `Recommendation: ${this.recommendedAction}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    return `${this.message}\n\n${details}`;
  }

  /**
   * Log this error to the console with proper formatting
   */
  logError(): void {
    console.error("Home Assistant API Error:");
    console.error(this.getDetailedMessage());
    if (this.cause) {
      console.error("\nOriginal Error:");
      console.error(this.cause);
    }
  }
}

/**
 * Create an appropriate HassError from a standard error
 */
export function createHassError(
  originalError: unknown,
  endpoint?: string,
  method?: string,
): HassError {
  // Default values
  let message = "Unknown error occurred when communicating with Home Assistant";
  let type = HassErrorType.UNKNOWN_ERROR;
  let statusCode: number | undefined = undefined;
  let retryable = false;
  let recommendedAction = "Check Home Assistant logs for more details.";

  // Cast original error
  const err = originalError as Error & {
    name?: string;
    cause?: { code?: string };
    status?: number;
    statusCode?: number;
    response?: { status?: number };
  };

  // Determine error type based on error properties
  if (err.name === "AbortError") {
    type = HassErrorType.CONNECTION_TIMEOUT;
    message = `Request to Home Assistant timed out${endpoint ? ` for ${endpoint}` : ""}`;
    retryable = true;
    recommendedAction =
      "Check if Home Assistant is overloaded or if there are network issues.";
  } else if (err.cause && err.cause.code === "ECONNREFUSED") {
    type = HassErrorType.CONNECTION_REFUSED;
    message = "Connection refused to Home Assistant";
    retryable = true;
    recommendedAction =
      "Verify Home Assistant is running and network connectivity is available.";
  } else if (
    err.status === 401 ||
    err.statusCode === 401 ||
    err.response?.status === 401
  ) {
    type = HassErrorType.AUTHENTICATION_FAILED;
    message = "Authentication failed with Home Assistant";
    statusCode = 401;
    recommendedAction = "Check your Home Assistant API token and permissions.";
  } else if (
    err.status === 404 ||
    err.statusCode === 404 ||
    err.response?.status === 404
  ) {
    type = HassErrorType.RESOURCE_NOT_FOUND;
    message = `Resource not found${endpoint ? ` at ${endpoint}` : ""}`;
    statusCode = 404;
    recommendedAction =
      "Verify the endpoint is correct and exists in your Home Assistant instance.";
  } else if (
    (err.status && err.status >= 500) ||
    (err.statusCode && err.statusCode >= 500) ||
    (err.response?.status && err.response.status >= 500)
  ) {
    type = HassErrorType.SERVER_ERROR;
    message = "Home Assistant server error";
    statusCode = err.status || err.statusCode || err.response?.status;
    retryable = true;
    recommendedAction = "Check Home Assistant logs for server-side errors.";
  }

  // Use original error message if available
  if (err.message) {
    message = err.message;
  }

  return new HassError(message, type, {
    endpoint,
    method,
    statusCode,
    retryable,
    recommendedAction,
    cause: err,
  });
}

/**
 * Check Home Assistant connection
 * @param hassUrl The Home Assistant URL
 * @param hassToken The Home Assistant authentication token
 * @returns Promise that resolves to true if connected, or rejects with HassError
 */
export async function checkHomeAssistantConnection(
  hassUrl: string,
  hassToken: string,
): Promise<boolean> {
  try {
    // Create the full URL for the API
    const apiUrl = `${hassUrl}/api/config`;

    // Make a simple request to test the connection
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${hassToken}`,
        "Content-Type": "application/json",
      },
      // Set a timeout for the request
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Update global state
    homeAssistantAvailable = true;
    return true;
  } catch (error) {
    // Update global state
    homeAssistantAvailable = false;
    throw createHassError(error, "/config", "GET");
  }
}

/**
 * Utility function to format entity data
 * @param entityId Home Assistant entity ID
 * @param maxLength Maximum length for the formatted string
 * @returns Formatted entity string
 */
export function formatEntity(entityId: EntityId, maxLength = 40): string {
  // Split entity ID into domain and name
  const [domain, ...nameParts] = entityId.split(".");
  const name = nameParts.join(".");

  // Format the entity string
  const fullString = `${domain}.${name}`;

  // Truncate if necessary
  if (fullString.length <= maxLength) {
    return fullString;
  }

  return `${domain}.${name.substring(0, maxLength - domain.length - 4)}...`;
}
