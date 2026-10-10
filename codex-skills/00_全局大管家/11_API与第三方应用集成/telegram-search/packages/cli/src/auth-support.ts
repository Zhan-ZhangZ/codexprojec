import type { AppError } from '@tg-search/protocol'
import type { TelegramClient } from 'telegram'

import passwordPrompt from '@inquirer/password'

interface SecretPromptOptions {
  message: string
  mask: boolean
}

interface AuthPromptOptions {
  phone?: string
  question: (message: string) => Promise<string>
  secret?: (options: SecretPromptOptions) => Promise<string>
}

const CORRECTABLE_AUTH_INPUT_ERRORS = new Set([
  'PASSWORD_HASH_INVALID',
  'PHONE_CODE_EMPTY',
  'PHONE_CODE_EXPIRED',
  'PHONE_CODE_INVALID',
  'PHONE_NUMBER_INVALID',
])

export async function closeOwnedTelegramClient(client: Pick<TelegramClient, 'destroy'>): Promise<void> {
  await client.destroy()
}

export function createAuthPrompts(options: AuthPromptOptions) {
  const secret = options.secret ?? passwordPrompt
  return {
    phoneNumber: options.phone || (async () => options.question('Phone number: ')),
    phoneCode: async () => secret({ message: 'Telegram code', mask: true }),
    password: async () => secret({ message: '2FA password', mask: true }),
  }
}

export function shouldStopAuthFlow(error: AppError, failureCount: number): boolean {
  const rpcErrorMessage = error.details?.rpcErrorMessage
  return typeof rpcErrorMessage !== 'string'
    || !CORRECTABLE_AUTH_INPUT_ERRORS.has(rpcErrorMessage)
    || failureCount >= 3
}
