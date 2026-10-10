import { c } from '../utils/colors.js';

/**
 * Print a one-line CLI error to stderr with the standard red ✗ glyph.
 * Centralizes the error glyph so commands don't drift between x / ✗ / X.
 * Sets no exit code — the caller owns that.
 */
export function printCliError(message: string): void {
  console.error(`\n  ${c('red', '✗')} ${message}`);
}
