/**
 * Split `content` into its text lines, handling LF and CRLF endings.
 *
 * A line is a maximal run of characters terminated by a newline or by EOF. A
 * single trailing newline terminates the last line; it does not start a new
 * empty one, so `"a\nb\n"` yields `["a", "b"]`, not `["a", "b", ""]`. A plain
 * `split('\n')` gets this wrong by emitting a trailing empty segment for
 * newline-terminated text. A genuine blank final line (`"a\n\n"`) is preserved
 * — only the single terminator is dropped.
 */
export function splitLines(content: string): string[] {
  if (content.length === 0) return [];
  const lines = content.split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/**
 * Number of text lines in `content`. Equals `splitLines(content).length`; see
 * {@link splitLines} for how trailing newlines are handled.
 */
export function countLines(content: string): number {
  return splitLines(content).length;
}
