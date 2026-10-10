import { describe, expect, it, vi } from 'vitest'

import { closeOwnedTelegramClient, createAuthPrompts, shouldStopAuthFlow } from './auth-support'

describe('cLI authentication support', () => {
  it('destroys an owned GramJS client so its update loop exits', async () => {
    const destroy = vi.fn(async () => {})
    await closeOwnedTelegramClient({ destroy })

    expect(destroy).toHaveBeenCalledOnce()
  })

  it('uses secret input for Telegram codes and 2FA passwords', async () => {
    const question = vi.fn(async () => 'phone')
    const secret = vi.fn(async ({ message }: { message: string, mask: boolean }) => message)
    const prompts = createAuthPrompts({ question, secret })

    expect(prompts.phoneNumber).toBeTypeOf('function')
    if (typeof prompts.phoneNumber !== 'function')
      throw new TypeError('Expected an interactive phone prompt')
    expect(await prompts.phoneNumber()).toBe('phone')
    expect(await prompts.phoneCode()).toBe('Telegram code')
    expect(await prompts.password()).toBe('2FA password')
    expect(secret).toHaveBeenCalledTimes(2)
    expect(secret).toHaveBeenNthCalledWith(1, { message: 'Telegram code', mask: true })
    expect(secret).toHaveBeenNthCalledWith(2, { message: '2FA password', mask: true })
  })

  it('passes a fixed phone as a value so GramJS cannot resubmit an invalid number', () => {
    const question = vi.fn(async () => 'unused')
    const prompts = createAuthPrompts({ phone: '+10000000000', question })

    // GramJS loops forever when phoneNumber is a function whose SendCode call fails.
    expect(prompts.phoneNumber).toBe('+10000000000')
    expect(question).not.toHaveBeenCalled()
  })

  it('bounds interactive corrections and stops server-directed waits immediately', () => {
    const invalidPhone = {
      code: 'TELEGRAM_RPC_ERROR',
      message: 'invalid',
      retryable: false,
      details: { rpcErrorMessage: 'PHONE_NUMBER_INVALID' },
    }
    const floodWait = {
      code: 'TELEGRAM_FLOOD_WAIT',
      message: 'wait',
      retryable: true,
      retryAfterSeconds: 298,
    }

    expect(shouldStopAuthFlow(invalidPhone, 1)).toBe(false)
    expect(shouldStopAuthFlow(invalidPhone, 3)).toBe(true)
    expect(shouldStopAuthFlow(floodWait, 1)).toBe(true)
  })
})
