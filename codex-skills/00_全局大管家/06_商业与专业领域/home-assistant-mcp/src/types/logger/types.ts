import { LogLevel } from '../../logger';

export interface Entry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface Options {
  minLevel?: LogLevel;
  level?: string;
  format?: string;
  filename?: string;
  includeTimestamp?: boolean;
  enableColors?: boolean;
  outputToStderr?: boolean;
}
