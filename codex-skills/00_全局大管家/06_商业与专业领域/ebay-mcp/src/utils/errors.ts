/**
 * Normalize an unknown thrown value into a human-readable message string.
 *
 * This is the single source of truth for the
 * `error instanceof Error ? error.message : …` idiom that otherwise recurs
 * across the codebase. It returns `error.message` for real `Error` instances
 * and `fallback` for anything else (thrown strings, plain objects, `undefined`).
 *
 * @param error - The value caught in a `catch` block (typed `unknown`).
 * @param fallback - Message to use when `error` is not an `Error`. Pass the
 *   call site's original fallback (e.g. `String(error)` or a domain-specific
 *   string) to preserve existing behavior; defaults to `'Unknown error'`.
 */
export function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  return error instanceof Error ? error.message : fallback;
}
