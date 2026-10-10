import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DownloadEvent } from '@janhq/core'

const queuedCapture = vi.hoisted(() => vi.fn())

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    dismiss: vi.fn(),
  },
}))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/i18n/react-i18next-compat', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock('@/hooks/useServiceHub', () => ({
  useServiceHub: () => ({ models: () => ({ abortDownload: vi.fn() }) }),
  getServiceHub: () => ({}),
}))
const appUpdater = vi.hoisted(() => ({
  updateState: {
    isDownloading: false,
    downloadProgress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
  },
}))
vi.mock('@/hooks/useAppUpdater', () => ({ useAppUpdater: () => appUpdater }))
vi.mock('@/containers/downloads/DownloadPanel', () => ({
  DownloadPanel: () => null,
}))
vi.mock('@/lib/telemetry-queue', () => ({ queuedCapture }))
vi.mock('@/lib/sentry', () => ({ captureHandledError: vi.fn() }))

import { DownloadManagement } from '../DownloadManegement'
import { useDownloadStore } from '@/hooks/useDownloadStore'

const GB = 1024 ** 3

// Field feedback, 2026-09-29: every terminal `model_download` event of the
// previous 30 days read `size_bucket: 'unknown'`, so how slow downloads were
// could not be read off telemetry. The extensions' terminal events carry no
// byte counts; the store's row does.
describe('DownloadManagement — terminal model_download telemetry', () => {
  const handlers = new Map<string, Set<(payload: unknown) => void>>()
  const emit = (name: string, payload: unknown) =>
    act(() => {
      handlers.get(name)?.forEach((handler) => handler(payload))
    })

  beforeEach(() => {
    vi.useFakeTimers()
    handlers.clear()
    queuedCapture.mockClear()
    useDownloadStore.setState({ downloads: {} })
    const core = ((
      globalThis as unknown as { core?: Record<string, unknown> }
    ).core ??= {})
    core.events = {
      on: (name: string, handler: (payload: unknown) => void) => {
        if (!handlers.has(name)) handlers.set(name, new Set())
        handlers.get(name)!.add(handler)
      },
      off: (name: string, handler: (payload: unknown) => void) => {
        handlers.get(name)?.delete(handler)
      },
      emit,
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    delete (globalThis as unknown as { core: Record<string, unknown> }).core
      .events
  })

  const terminalEvent = () =>
    queuedCapture.mock.calls
      .filter(([name]) => name === 'model_download')
      .map(([, props]) => props as Record<string, unknown>)
      .at(-1)

  // Three GB in 100 s, with one stall and two reconnects on the way.
  function runTransfer(modelId: string) {
    emit(DownloadEvent.onFileDownloadUpdate, {
      modelId,
      percent: 0,
      size: { transferred: 0, total: 3 * GB },
    })
    emit(DownloadEvent.onFileDownloadUpdate, {
      modelId,
      stage: { kind: 'stalled', attempt: 0, maxAttempts: 5 },
    })
    emit(DownloadEvent.onFileDownloadUpdate, {
      modelId,
      stage: { kind: 'retrying', attempt: 1, maxAttempts: 5 },
    })
    emit(DownloadEvent.onFileDownloadUpdate, {
      modelId,
      stage: { kind: 'retrying', attempt: 2, maxAttempts: 5 },
    })
    vi.advanceTimersByTime(100_000)
    emit(DownloadEvent.onFileDownloadUpdate, {
      modelId,
      percent: 1,
      size: { transferred: 3 * GB, total: 3 * GB },
    })
  }

  it('reports the size, average speed, stalls and reconnects of a finished download', () => {
    render(<DownloadManagement />)
    runTransfer('owner/finished-GGUF')
    emit(DownloadEvent.onFileDownloadSuccess, {
      modelId: 'owner/finished-GGUF',
      downloadType: 'Model',
    })

    expect(terminalEvent()).toMatchObject({
      download_status: 'completed',
      size_bucket: '2_5gb',
      avg_bytes_per_second: Math.round((3 * GB) / 100),
      stall_count: 1,
      retry_count: 2,
    })
  })

  it('still knows the size of a failed download whose row is removed first', () => {
    render(<DownloadManagement />)
    runTransfer('owner/failed-GGUF')
    emit(DownloadEvent.onFileDownloadError, {
      modelId: 'owner/failed-GGUF',
      downloadType: 'Model',
      error:
        'Download failed after 5 retries at byte 1024: no data received for 30s',
    })

    expect(terminalEvent()).toMatchObject({
      download_status: 'failed',
      size_bucket: '2_5gb',
      stall_count: 1,
      retry_count: 2,
    })
  })
})
