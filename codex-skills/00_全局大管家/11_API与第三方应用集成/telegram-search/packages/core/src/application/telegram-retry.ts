import type { AppResult } from '@tg-search/protocol'

import { toAppError } from './errors'

export interface RetryNotice {
  attempt: number
  delayMs: number
  errorCode: string
  maxAttempts: number
}

export interface TelegramRetryOptions {
  baseDelayMs?: number
  jitterRatio?: number
  maxAttempts?: number
  maxDelayMs?: number
  onRetry?: (notice: RetryNotice) => void
  random?: () => number
  sleep?: (delayMs: number) => Promise<void>
}

const sleep = (delayMs: number) => new Promise<void>(resolve => setTimeout(resolve, delayMs))

function retryDelay(attempt: number, options: Required<Pick<TelegramRetryOptions, 'baseDelayMs' | 'jitterRatio' | 'maxDelayMs' | 'random'>>): number {
  const exponential = Math.min(options.baseDelayMs * (2 ** (attempt - 1)), options.maxDelayMs)
  const jitter = exponential * options.jitterRatio * ((options.random() * 2) - 1)
  return Math.max(0, Math.round(exponential + jitter))
}

function retryOptions(options: TelegramRetryOptions) {
  return {
    baseDelayMs: options.baseDelayMs ?? 500,
    jitterRatio: options.jitterRatio ?? 0.2,
    maxAttempts: options.maxAttempts ?? 3,
    maxDelayMs: options.maxDelayMs ?? 10_000,
    onRetry: options.onRetry,
    random: options.random ?? Math.random,
    sleep: options.sleep ?? sleep,
  }
}

function shouldRetry(error: { retryable: boolean, retryAfterSeconds?: number }, attempt: number, maxAttempts: number): boolean {
  return error.retryable && error.retryAfterSeconds === undefined && attempt < maxAttempts
}

export async function retryTelegramOperation<T>(
  operation: () => Promise<T>,
  options: TelegramRetryOptions = {},
): Promise<T> {
  const configured = retryOptions(options)

  for (let attempt = 1; attempt <= configured.maxAttempts; attempt++) {
    try {
      return await operation()
    }
    catch (error) {
      const classified = toAppError(error)
      if (!shouldRetry(classified, attempt, configured.maxAttempts))
        throw error

      const delayMs = retryDelay(attempt, configured)
      configured.onRetry?.({
        attempt: attempt + 1,
        delayMs,
        errorCode: classified.code,
        maxAttempts: configured.maxAttempts,
      })
      await configured.sleep(delayMs)
    }
  }

  throw new Error('Telegram retry loop ended unexpectedly')
}

export async function retryTelegramResult<T>(
  operation: () => Promise<AppResult<T>>,
  options: TelegramRetryOptions = {},
): Promise<AppResult<T>> {
  const configured = retryOptions(options)

  for (let attempt = 1; attempt <= configured.maxAttempts; attempt++) {
    let result: AppResult<T>
    try {
      result = await operation()
    }
    catch (error) {
      result = { ok: false, error: toAppError(error) }
    }

    if (result.ok || !shouldRetry(result.error, attempt, configured.maxAttempts))
      return result

    const delayMs = retryDelay(attempt, configured)
    configured.onRetry?.({
      attempt: attempt + 1,
      delayMs,
      errorCode: result.error.code,
      maxAttempts: configured.maxAttempts,
    })
    await configured.sleep(delayMs)
  }

  throw new Error('Telegram retry loop ended unexpectedly')
}
