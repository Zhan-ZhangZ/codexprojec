import { existsSync, readFileSync } from 'fs';

/**
 * Parse a dotenv-style KEY=VALUE file into a simple map.
 */
export function parseEnvFile(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};

  if (!existsSync(filePath)) {
    return env;
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = /^([^=]+)=(.*)$/.exec(trimmed);
    if (!match) {
      continue;
    }

    const key = match[1].trim();
    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}
