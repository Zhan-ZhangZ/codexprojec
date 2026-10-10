/* eslint-disable sonarjs/no-hardcoded-passwords -- Fixtures intentionally include sensitive-looking keys to verify redaction. */
import { describe, expect, it } from 'vitest'

import { redactSensitiveFields, toSafePresenceFlag } from '../redact'

describe('redact', () => {
  it('masks sensitive fields recursively', () => {
    const payload = {
      apiKey: 'key-123',
      nested: {
        password: 'pass-123',
        token: 'token-123',
      },
      safeField: 'visible',
    }

    expect(redactSensitiveFields(payload)).toEqual({
      apiKey: '[REDACTED]',
      nested: {
        password: '[REDACTED]',
        token: '[REDACTED]',
      },
      safeField: 'visible',
    })
  })

  it('masks common variants including session and secret', () => {
    const payload = {
      sessionId: 'abc',
      secretKey: 's3cr3t',
      access_token: 'token',
      keep: 1,
    }

    expect(redactSensitiveFields(payload)).toEqual({
      sessionId: '[REDACTED]',
      secretKey: '[REDACTED]',
      access_token: '[REDACTED]',
      keep: 1,
    })
  })

  it('returns safe presence flags for optional secrets', () => {
    expect(toSafePresenceFlag(undefined)).toBe(false)
    expect(toSafePresenceFlag('')).toBe(false)
    expect(toSafePresenceFlag('  ')).toBe(false)
    expect(toSafePresenceFlag('value')).toBe(true)
  })
})
