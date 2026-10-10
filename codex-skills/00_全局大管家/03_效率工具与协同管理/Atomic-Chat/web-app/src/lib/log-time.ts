/**
 * The one way a log entry's time is shown: `YYYY-MM-DD HH:MM:SS UTC`.
 *
 * `app.log` and `core.log` both write UTC to the second, and what the window
 * shows must match the file a user sends us character for character. So a
 * header time (`2026-09-28T12:00:05Z`) is taken apart as written, never
 * converted to the local zone; anything else (a `Date.now()` stamp for a line
 * without a header) is printed in UTC the same way.
 */
const HEADER_TIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.\d+)?Z$/

export function formatLogTime(timestamp: string | number): string {
  if (typeof timestamp === 'string') {
    const match = HEADER_TIME.exec(timestamp)
    if (match) return `${match[1]} ${match[2]} UTC`
  }
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return String(timestamp)
  const iso = date.toISOString()
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`
}

/**
 * `atomic-chat-logs-YYYY-MM-DD_HH-MM-SS.log`, in UTC like the names of the
 * rotated log archives.
 */
export function logExportFileName(now: Date): string {
  const iso = now.toISOString()
  const stamp = `${iso.slice(0, 10)}_${iso.slice(11, 19).replace(/:/g, '-')}`
  return `atomic-chat-logs-${stamp}.log`
}
