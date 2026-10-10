type Platform = 'macos' | 'windows' | 'linux' | 'unknown'

interface ToolbarShortcutEventLike {
  key: string
  metaKey?: boolean
  altKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  repeat?: boolean
}

export function resolveToolbarShortcutIndex(
  event: ToolbarShortcutEventLike,
  platform: Platform,
  enabledItemCount: number,
): number | null {
  if (platform === 'unknown' || enabledItemCount <= 0 || event.repeat) {
    return null
  }

  const usesPlatformModifier = platform === 'macos'
    ? Boolean(event.metaKey) && !event.ctrlKey && !event.altKey
    : Boolean(event.altKey) && !event.ctrlKey && !event.metaKey

  if (!usesPlatformModifier || event.shiftKey) {
    return null
  }

  const shortcutNumber = Number.parseInt(event.key, 10)
  if (!Number.isInteger(shortcutNumber) || shortcutNumber < 1 || shortcutNumber > enabledItemCount) {
    return null
  }

  return shortcutNumber - 1
}
