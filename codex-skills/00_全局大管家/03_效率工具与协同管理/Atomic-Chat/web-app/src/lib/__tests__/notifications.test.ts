import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/plugin-notification', () => ({
  isPermissionGranted: vi.fn(async () => true),
  requestPermission: vi.fn(async () => 'granted'),
}))

import { useThreadNotifications } from '@/hooks/useThreadNotifications'
import { isWindowAway, notifyWhenAway } from '../notifications'

describe('notifyWhenAway', () => {
  let focused: boolean
  let visibility: DocumentVisibilityState

  beforeEach(() => {
    focused = false
    visibility = 'visible'
    vi.spyOn(document, 'hasFocus').mockImplementation(() => focused)
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(
      () => visibility
    )
    useThreadNotifications.setState({ globallyEnabled: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('notifies while another app is in front', () => {
    expect(isWindowAway()).toBe(true)
    expect(notifyWhenAway('Model downloaded', 'Qwen3 is ready')).toBe(true)
  })

  it('stays quiet while the user looks at the window', () => {
    focused = true
    expect(isWindowAway()).toBe(false)
    expect(notifyWhenAway('Model downloaded', 'Qwen3 is ready')).toBe(false)
  })

  it('notifies for a hidden or minimized window even if it reports focus', () => {
    focused = true
    visibility = 'hidden'
    expect(notifyWhenAway('Video ready', 'Your clip is in the gallery.')).toBe(
      true
    )
  })

  it('respects the Settings switch', () => {
    useThreadNotifications.setState({ globallyEnabled: false })
    expect(notifyWhenAway('Images ready', '2 new images')).toBe(false)
  })

  it('treats a switch lost in rehydration as on', () => {
    useThreadNotifications.setState({
      globallyEnabled: undefined as unknown as boolean,
    })
    expect(notifyWhenAway('Images ready', '2 new images')).toBe(true)
  })
})
