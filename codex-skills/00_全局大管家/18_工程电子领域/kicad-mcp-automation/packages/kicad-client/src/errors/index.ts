/**
 * Base error class for KiCad client errors
 */
export class KiCadClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'KiCadClientError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Connection-related errors
 */
export class ConnectionError extends KiCadClientError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = 'ConnectionError';
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends KiCadClientError {
  constructor(message: string, details?: unknown) {
    super(message, 'TIMEOUT_ERROR', details);
    this.name = 'TimeoutError';
  }
}

/**
 * Operation errors (e.g., failed DRC check)
 */
export class OperationError extends KiCadClientError {
  constructor(message: string, details?: unknown) {
    super(message, 'OPERATION_ERROR', details);
    this.name = 'OperationError';
  }
}

/**
 * Project not found or invalid errors
 */
export class ProjectError extends KiCadClientError {
  constructor(message: string, details?: unknown) {
    super(message, 'PROJECT_ERROR', details);
    this.name = 'ProjectError';
  }
}
