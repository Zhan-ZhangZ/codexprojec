import { describe, expect, it } from 'vitest'

import { toAppError } from './errors'

describe('telegram application error classification', () => {
  it('preserves Telegram flood waits without retrying them immediately', () => {
    const error = toAppError({
      code: 420,
      errorMessage: 'FLOOD_WAIT_298',
      message: 'A wait of 298 seconds is required (caused by auth.SendCode)',
    })

    expect(error).toMatchObject({
      code: 'TELEGRAM_FLOOD_WAIT',
      retryable: true,
      retryAfterSeconds: 298,
    })
  })

  it('turns Telegram takeout delays into an explicit user authorization action', () => {
    // TAKEOUT_INIT_DELAY previously looked like an ordinary retryable wait, so
    // Agents could sleep instead of asking the user to authorize the export.
    const error = toAppError({
      code: 420,
      errorMessage: 'TAKEOUT_INIT_DELAY_86400',
      message: '420: TAKEOUT_INIT_DELAY_86400',
    })

    expect(error).toMatchObject({
      code: 'TAKEOUT_AUTHORIZATION_REQUIRED',
      message: expect.stringContaining('authorize the export request'),
      retryable: false,
      retryAfterSeconds: 86400,
      details: {
        action: 'authorize_takeout_in_telegram',
        telegramError: 'TAKEOUT_INIT_DELAY_86400',
      },
    })
  })

  it('marks Telegram server failures as transient', () => {
    const error = toAppError({
      code: 500,
      errorMessage: 'RPC_CALL_FAIL',
      message: '500: RPC_CALL_FAIL',
    })

    expect(error).toMatchObject({ code: 'TELEGRAM_TRANSIENT', retryable: true })
    expect(error.retryAfterSeconds).toBeUndefined()
  })

  it('does not retry deterministic Telegram request errors', () => {
    const error = toAppError({
      code: 400,
      errorMessage: 'PHONE_NUMBER_INVALID',
      message: '400: PHONE_NUMBER_INVALID',
    })

    expect(error).toMatchObject({ code: 'TELEGRAM_RPC_ERROR', retryable: false })
  })
})
