/**
 * Telegram deep link generation utilities.
 *
 * Uses tg:// protocol for opening in the native client, and https://t.me for
 * web-compatible links (copy to clipboard, private channel messages).
 *
 * Reference: https://core.telegram.org/api/links
 *
 * Supports:
 * - User profiles: tg://user?id=<userId>, tg://resolve?domain=<username>
 * - Chat profiles: tg://resolve?domain=<username>
 * - Public messages: tg://resolve?domain=<username>&post=<messageId>
 * - Private channel messages: https://t.me/c/<channelId>/<messageId>
 */

import type { CoreDialog } from '@tg-search/core/types'

type ChatInfo = Pick<CoreDialog, 'id' | 'type' | 'username'>

/**
 * Strip Telegram's marked peer-ID prefixes (-100 for channels, - for groups)
 * to get the raw numeric entity ID.
 */
function stripPeerPrefix(id: string): string {
  if (id.startsWith('-100'))
    return id.slice(4)
  if (id.startsWith('-'))
    return id.slice(1)
  return id
}

/**
 * Generate a tg:// link to open a chat profile in the Telegram client.
 * Uses tg://resolve for public chats with username, tg://user for users by ID.
 * Returns null for private groups/channels without username (no reliable deep link).
 */
export function getChatLink(chat: ChatInfo): string | null {
  if (chat.username)
    return `tg://resolve?domain=${chat.username}`

  if (chat.type === 'user' || chat.type === 'bot')
    return `tg://user?id=${stripPeerPrefix(chat.id.toString())}`

  // Private groups/channels without username have no reliable tg:// deep link
  return null
}

/**
 * Generate a tg:// link to open a user's profile in the Telegram client.
 */
export function getUserLink(userId: string): string {
  return `tg://user?id=${stripPeerPrefix(userId)}`
}

/**
 * Generate a link to open a specific message in Telegram.
 *
 * For public chats: uses tg://resolve for native client opening.
 * For private channels/supergroups: uses https://t.me/c/ which the client intercepts.
 * Returns null for DMs and legacy groups (no message deep link support).
 */
export function getMessageLink(chat: ChatInfo, messageId: string): string | null {
  // Public channels/supergroups/groups with username
  if (chat.username && (chat.type === 'channel' || chat.type === 'supergroup' || chat.type === 'group'))
    return `tg://resolve?domain=${chat.username}&post=${messageId}`

  // Private channels/supergroups: use https://t.me/c/ which the Telegram client intercepts
  if (chat.type === 'channel' || chat.type === 'supergroup') {
    const channelId = stripPeerPrefix(chat.id.toString())
    return `https://t.me/c/${channelId}/${messageId}`
  }

  return null
}

/**
 * Generate a copyable https://t.me link for a message.
 * Always returns a web-compatible URL suitable for sharing/clipboard.
 */
export function getMessageWebLink(chat: ChatInfo, messageId: string): string | null {
  if (chat.username && (chat.type === 'channel' || chat.type === 'supergroup' || chat.type === 'group'))
    return `https://t.me/${chat.username}/${messageId}`

  if (chat.type === 'channel' || chat.type === 'supergroup') {
    const channelId = stripPeerPrefix(chat.id.toString())
    return `https://t.me/c/${channelId}/${messageId}`
  }

  return null
}
