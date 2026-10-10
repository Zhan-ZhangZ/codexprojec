const REDACTED_VALUE = '[REDACTED]'
const CIRCULAR_VALUE = '[Circular]'
const TRUNCATED_VALUE = '[Truncated]'

const SENSITIVE_KEYWORDS = ['apikey', 'api_key', 'password', 'secret', 'token', 'session']

function shouldRedactKey(key: string): boolean {
  const normalizedKey = key.toLowerCase()
  return SENSITIVE_KEYWORDS.some(keyword => normalizedKey.includes(keyword))
}

interface RedactOptions {
  maxDepth?: number
}

export function redactSensitiveFields<T>(input: T, options: RedactOptions = {}): T {
  const maxDepth = options.maxDepth ?? 4
  const visited = new WeakSet<object>()

  const visit = (value: any, depth: number, key?: string): any => {
    if (key && shouldRedactKey(key)) {
      return REDACTED_VALUE
    }

    if (value == null || typeof value !== 'object') {
      return value
    }

    if (depth <= 0) {
      return TRUNCATED_VALUE
    }

    if (visited.has(value)) {
      return CIRCULAR_VALUE
    }

    visited.add(value)

    if (Array.isArray(value)) {
      return value.map(item => visit(item, depth - 1))
    }

    // NOTICE: We intentionally keep `any` here because log payloads are dynamic
    // and can include many loosely-typed structures across runtimes.
    const output: Record<string, any> = {}
    for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, any>)) {
      output[nestedKey] = visit(nestedValue, depth - 1, nestedKey)
    }
    return output
  }

  return visit(input as any, maxDepth) as T
}

export function toSafePresenceFlag(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}
