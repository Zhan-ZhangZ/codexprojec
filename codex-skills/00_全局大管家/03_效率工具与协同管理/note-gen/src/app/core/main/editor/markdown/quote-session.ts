import type { PendingQuote } from '@/stores/chat'

export function shouldRestorePendingQuote(
  pendingQuote: PendingQuote | null,
  articlePath: string | undefined,
  docSize: number,
) {
  if (!pendingQuote || !articlePath) {
    return false
  }

  if (pendingQuote.articlePath !== articlePath) {
    return false
  }

  if (typeof pendingQuote.from !== 'number' || typeof pendingQuote.to !== 'number') {
    return false
  }

  return pendingQuote.from >= 0 && pendingQuote.to <= docSize && pendingQuote.from < pendingQuote.to
}
