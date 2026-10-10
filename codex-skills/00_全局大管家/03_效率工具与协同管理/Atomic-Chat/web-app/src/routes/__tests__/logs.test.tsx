import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { toast } from 'sonner'
import { Route as LogsRoute } from '../logs'
import type { ServiceHub } from '@/services'
import type { UnifiedLogEntry } from '@/services/app/types'
import { seedServiceHub } from '@/test/service-hub'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: { component: unknown }) => config,
}))

vi.mock('@/constants/routes', () => ({
  route: { appLogs: '/logs' },
}))

vi.mock('@/i18n/react-i18next-compat', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const entry = (
  source: UnifiedLogEntry['source'],
  time: string,
  message: string,
  extra: Partial<UnifiedLogEntry> = {}
): UnifiedLogEntry => ({
  timestamp: `2026-09-28T${time}Z`,
  source,
  target: source === 'core' ? 'engine:llamacpp/qwen3-8b' : 'app_lib::core',
  level: 'INFO',
  message,
  ...extra,
})

const ENTRIES = [
  entry('app', '12:00:05', 'loading qwen3-8b'),
  entry('core', '12:00:05', '[stderr] llama_model_loader: loaded'),
  entry('core', '12:00:07', 'load failed\n  cause: out of memory', {
    target: 'core',
    level: 'ERROR',
  }),
  entry('app', '12:00:09', 'model failed to load', { level: 'WARN' }),
]

const readUnifiedLogs = vi.fn()
const exportLogs = vi.fn()
const openPath = vi.fn()

async function renderLogs() {
  const Component = LogsRoute.component as React.ComponentType
  await act(async () => {
    render(<Component />)
  })
}

const rows = () => screen.queryAllByTestId('log-entry')
const button = (name: string) => screen.getByRole('button', { name })

describe('Logs window', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    readUnifiedLogs.mockResolvedValue(ENTRIES)
    openPath.mockResolvedValue(undefined)
    seedServiceHub({
      app: { readUnifiedLogs, exportLogs } as unknown as ReturnType<
        ServiceHub['app']
      >,
      opener: { openPath } as unknown as ReturnType<ServiceHub['opener']>,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows both sources in one timeline with a source badge, time, level, target and message', async () => {
    await renderLogs()

    expect(rows()).toHaveLength(4)
    const first = within(rows()[0])
    expect(first.getByText('[2026-09-28 12:00:05 UTC]')).toBeInTheDocument()
    expect(first.getByText('logs:sourceApp')).toBeInTheDocument()
    expect(first.getByText('INFO')).toBeInTheDocument()
    expect(first.getByText('app_lib::core')).toBeInTheDocument()
    expect(first.getByText('loading qwen3-8b')).toBeInTheDocument()
    expect(within(rows()[1]).getByText('logs:sourceCore')).toBeInTheDocument()
    expect(rows()[2].textContent).toContain(
      'load failed\n  cause: out of memory'
    )
  })

  it('shows App and Core entries of the same second with the same time', async () => {
    await renderLogs()

    const time = (row: HTMLElement) =>
      within(row).getByText(/^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC\]$/)
        .textContent
    expect(time(rows()[0])).toBe('[2026-09-28 12:00:05 UTC]')
    expect(time(rows()[1])).toBe(time(rows()[0]))
  })

  it('filters by source without changing the order', async () => {
    await renderLogs()

    fireEvent.click(button('logs:sourceCore'))
    expect(rows().map((row) => row.textContent)).toEqual([
      expect.stringContaining('[stderr] llama_model_loader'),
      expect.stringContaining('load failed'),
    ])
    expect(button('logs:sourceCore')).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(button('logs:sourceApp'))
    expect(rows().map((row) => row.textContent)).toEqual([
      expect.stringContaining('loading qwen3-8b'),
      expect.stringContaining('model failed to load'),
    ])

    fireEvent.click(button('logs:filterAll'))
    expect(rows()).toHaveLength(4)
  })

  it('shows All by default', async () => {
    await renderLogs()

    expect(button('logs:filterAll')).toHaveAttribute('aria-pressed', 'true')
  })

  it('picks up new entries on the next 3-second refresh', async () => {
    vi.useFakeTimers()
    readUnifiedLogs.mockResolvedValueOnce(ENTRIES.slice(0, 2))
    await renderLogs()
    expect(rows()).toHaveLength(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })

    expect(rows()).toHaveLength(4)
    expect(readUnifiedLogs).toHaveBeenCalledTimes(2)
  })

  it('says there are no logs when both files are empty', async () => {
    readUnifiedLogs.mockResolvedValue([])
    await renderLogs()

    expect(screen.getByText('logs:noLogs')).toBeInTheDocument()
  })

  it('exports and offers to show the file in its folder', async () => {
    exportLogs.mockResolvedValue({
      path: '/Users/me/Desktop/atomic-chat-logs.log',
      bytes: 42,
    })
    await renderLogs()

    await act(async () => {
      fireEvent.click(button('logs:export'))
    })

    expect(toast.success).toHaveBeenCalledWith(
      'logs:exported',
      expect.objectContaining({
        description: '/Users/me/Desktop/atomic-chat-logs.log',
      })
    )
    const options = vi.mocked(toast.success).mock.calls[0][1] as {
      action: { label: string; onClick: () => void }
    }
    expect(options.action.label).toBe('logs:showInFolder')
    options.action.onClick()
    expect(openPath).toHaveBeenCalledWith('/Users/me/Desktop')
  })

  it('says nothing when the save dialog is cancelled', async () => {
    exportLogs.mockResolvedValue(null)
    await renderLogs()

    await act(async () => {
      fireEvent.click(button('logs:export'))
    })

    expect(exportLogs).toHaveBeenCalledTimes(1)
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
    expect(button('logs:export')).toBeEnabled()
  })

  it('shows why an export failed', async () => {
    exportLogs.mockRejectedValue(
      'could not write /Volumes/ro/logs.log: Read-only file system'
    )
    await renderLogs()

    await act(async () => {
      fireEvent.click(button('logs:export'))
    })

    expect(toast.error).toHaveBeenCalledWith('logs:exportFailed', {
      description:
        'could not write /Volumes/ro/logs.log: Read-only file system',
    })
    expect(button('logs:export')).toBeEnabled()
    expect(rows()).toHaveLength(4)
  })
})
