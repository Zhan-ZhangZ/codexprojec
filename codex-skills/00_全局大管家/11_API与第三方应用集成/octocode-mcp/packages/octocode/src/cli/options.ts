import type { ParsedArgs } from './types.js';

type Options = ParsedArgs['options'];

export function getBool(opts: Options, ...keys: string[]): boolean {
  return keys.some(k => Boolean(opts[k]));
}

export function getString(opts: Options, ...keys: string[]): string {
  for (const k of keys) {
    const v = opts[k];
    if (typeof v === 'string') return v;
  }
  return '';
}

export interface FlagError {
  error: string;
}

export function isFlagError(v: unknown): v is FlagError {
  return typeof v === 'object' && v !== null && 'error' in v;
}

/**
 * Strict integer flag parsing. Returns:
 *   - undefined when the flag is absent,
 *   - the number when valid,
 *   - { error } when present but not an integer >= min.
 * Use isFlagError() to branch — never silently drops a typo or passes NaN on.
 */
export function intFlag(
  raw: string,
  flag: string,
  opts: { min?: number } = {}
): number | undefined | FlagError {
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  const min = opts.min ?? 0;
  if (!Number.isInteger(n) || String(n) !== raw.trim() || n < min) {
    return { error: `--${flag} must be an integer >= ${min} (got "${raw}").` };
  }
  return n;
}

/**
 * Lenient non-negative integer parse for option values: returns the number when
 * it's an integer >= 0, otherwise undefined (absent or invalid). Unlike
 * intFlag() this never surfaces an error — it's the shared replacement for the
 * copy-pasted `intOpt`/`intOption`/`parseInt10` helpers across commands.
 */
export function nonNegIntOption(value: string): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

/** Lenient positive integer parse: integer > 0, else undefined. */
export function posIntOption(value: string): number | undefined {
  const n = nonNegIntOption(value);
  return n && n > 0 ? n : undefined;
}

export function resolveHostname(opts: Options): string {
  const v = opts['hostname'];
  return (
    (typeof v === 'string' && v.length > 0 ? v : undefined) ?? 'github.com'
  );
}
