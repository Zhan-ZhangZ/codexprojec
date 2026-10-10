import { createFileRoute } from '@tanstack/react-router'
import { route } from '@/constants/routes'

import { useEffect, useMemo, useState, useRef } from 'react'
import { IconDownload } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { useServiceHub } from '@/hooks/useServiceHub'
import { useExportLogs } from '@/hooks/useExportLogs'
import { useTranslation } from '@/i18n/react-i18next-compat'
import { formatLogTime } from '@/lib/log-time'
import { cn } from '@/lib/utils'
import type { LogSource, UnifiedLogEntry } from '@/services/app/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute(route.appLogs as any)({
  component: LogsViewer,
})

type SourceFilter = 'all' | LogSource

const REFRESH_INTERVAL_MS = 3000

const FILTERS: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'logs:filterAll' },
  { value: 'app', label: 'logs:sourceApp' },
  { value: 'core', label: 'logs:sourceCore' },
]

const getLogLevelColor = (level: string) => {
  switch (level) {
    case 'ERROR':
      return 'text-red-500'
    case 'WARN':
      return 'text-yellow-500'
    case 'INFO':
      return 'text-blue-500'
    default:
      return 'text-gray-500'
  }
}

function LogsViewer() {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<UnifiedLogEntry[]>([])
  const [filter, setFilter] = useState<SourceFilter>('all')
  const logsContainerRef = useRef<HTMLDivElement>(null)
  const serviceHub = useServiceHub()
  const { exportLogs, exporting } = useExportLogs()

  useEffect(() => {
    let lastLogsLength = 0
    function updateLogs() {
      serviceHub
        .app()
        .readUnifiedLogs()
        .then((entries) => {
          const needScroll = entries.length > lastLogsLength
          lastLogsLength = entries.length
          setLogs(entries)

          // Follow the tail while new entries arrive
          if (needScroll) setTimeout(() => scrollToBottom(), 100)
        })
        .catch((error) => console.error('Failed to read logs:', error))
    }
    updateLogs()

    const intervalId = setInterval(() => updateLogs(), REFRESH_INTERVAL_MS)

    return () => {
      clearInterval(intervalId)
    }
  }, [serviceHub])

  // Function to scroll to the bottom of the logs container
  const scrollToBottom = () => {
    if (logsContainerRef.current) {
      const { scrollHeight, clientHeight } = logsContainerRef.current
      logsContainerRef.current.scrollTop = scrollHeight - clientHeight
    }
  }

  const visibleLogs = useMemo(
    () =>
      filter === 'all' ? logs : logs.filter((log) => log.source === filter),
    [logs, filter]
  )

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between gap-2 border-b px-2 py-1.5">
        <div role="group" className="flex items-center gap-1">
          {FILTERS.map(({ value, label }) => (
            <Button
              key={value}
              size="xs"
              variant={filter === value ? 'secondary' : 'ghost'}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {t(label)}
            </Button>
          ))}
        </div>
        <Button
          size="xs"
          variant="outline"
          disabled={exporting}
          onClick={() => void exportLogs()}
        >
          <IconDownload className="text-muted-foreground" />
          {t('logs:export')}
        </Button>
      </div>
      <div className="flex-1 overflow-auto" ref={logsContainerRef}>
        <div className="font-mono p-2">
          {visibleLogs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {t('logs:noLogs')}
            </div>
          ) : (
            visibleLogs.map((log, index) => (
              <div key={index} data-testid="log-entry" className="mb-1 flex">
                <span className="text-muted-foreground mr-2 shrink-0">
                  [{formatLogTime(log.timestamp)}]
                </span>
                <span
                  className={cn(
                    'mr-2 shrink-0 rounded px-1 text-xs leading-5',
                    log.source === 'core'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-secondary text-secondary-foreground'
                  )}
                >
                  {t(
                    log.source === 'core' ? 'logs:sourceCore' : 'logs:sourceApp'
                  )}
                </span>
                <span
                  className={cn(
                    'mr-2 shrink-0 font-semibold',
                    getLogLevelColor(log.level)
                  )}
                >
                  {log.level}
                </span>
                <span
                  className="text-muted-foreground mr-2 shrink-0 max-w-64 truncate"
                  title={log.target}
                >
                  {log.target}
                </span>
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-all">
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
