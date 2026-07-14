/**
 * Structured logging system for Home Assistant MCP server
 */

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  FATAL = "fatal",
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  component?: string;
  context?: Record<string, unknown>;
  error?: Error;
}

export interface LoggerOptions {
  minLevel?: LogLevel;
  includeTimestamp?: boolean;
  enableColors?: boolean;
  outputToStderr?: boolean;
}

/**
 * Structured logger with context support
 */
export class Logger {
  private static instance: Logger;
  private options: LoggerOptions;
  private levelValues: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
    [LogLevel.FATAL]: 4,
  };

  private colors: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: "\x1b[36m", // Cyan
    [LogLevel.INFO]: "\x1b[32m", // Green
    [LogLevel.WARN]: "\x1b[33m", // Yellow
    [LogLevel.ERROR]: "\x1b[31m", // Red
    [LogLevel.FATAL]: "\x1b[35m", // Magenta
  };

  private resetColor = "\x1b[0m";

  private entries: LogEntry[];

  private constructor(options: LoggerOptions = {}) {
    this.options = {
      minLevel: LogLevel.INFO,
      includeTimestamp: true,
      enableColors: true,
      outputToStderr: true,
      ...options,
    };
    this.entries = [];
  }

  /**
   * Get the singleton logger instance
   */
  public static getInstance(options?: LoggerOptions): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(options);
    }
    return Logger.instance;
  }

  /**
   * Update logger options
   */
  public configure(options: Partial<LoggerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Log a message at the specified level
   */
  public log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): void {
    // Skip logging if below minimum level
    if (this.options.minLevel !== undefined && this.levelValues[level] < this.levelValues[this.options.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    };

    // Format the log entry
    const formattedMessage = this.formatLogEntry(entry);

    // Output to console
    if (this.options.outputToStderr) {
      console.error(formattedMessage);
    } else {
      console.log(formattedMessage);
    }

    // Special handling for errors
    if ((error && level === LogLevel.ERROR) || level === LogLevel.FATAL) {
      console.error(error);
    }
  }

  /**
   * Format a log entry as a string
   */
  private formatLogEntry(entry: LogEntry): string {
    const parts: string[] = [];

    // Add timestamp if enabled
    if (this.options.includeTimestamp) {
      parts.push(`[${entry.timestamp}]`);
    }

    // Add level with color if enabled
    if (this.options.enableColors) {
      parts.push(
        `${this.colors[entry.level]}${entry.level.toUpperCase()}${this.resetColor}`,
      );
    } else {
      parts.push(entry.level.toUpperCase());
    }

    // Add component if present
    if (entry.component) {
      parts.push(`[${entry.component}]`);
    }

    // Add message
    parts.push(entry.message);

    // Add context if present
    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(JSON.stringify(entry.context));
    }

    return parts.join(" ");
  }

  /**
   * Create a child logger with a specific component name
   */
  public child(component: string): ComponentLogger {
    return new ComponentLogger(this, component);
  }

  // Convenience methods
  public debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  public error(
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  public fatal(
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): void {
    this.log(LogLevel.FATAL, message, context, error);
  }
}

/**
 * Component-specific logger that adds component name to all logs
 */
export class ComponentLogger {
  private logger: Logger;
  private component: string;

  constructor(logger: Logger, component: string) {
    this.logger = logger;
    this.component = component;
  }

  public log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): void {
    this.logger.log(
      level,
      message,
      { ...context, component: this.component },
      error,
    );
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  public error(
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  public fatal(
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): void {
    this.log(LogLevel.FATAL, message, context, error);
  }
}

// Create and export the default logger
export const defaultLogger = Logger.getInstance({
  outputToStderr: true // Configure all logs to use stderr by default
});

// Create component loggers for main system components
export const apiLogger = defaultLogger.child("api");
export const websocketLogger = defaultLogger.child("websocket");
export const serverLogger = defaultLogger.child("server");
export const toolsLogger = defaultLogger.child("tools");

// For backward compatibility
export const logger = defaultLogger;
