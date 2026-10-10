import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useServiceHub } from '@/hooks/useServiceHub'
import { useTranslation } from '@/i18n/react-i18next-compat'

/** The folder a file is in, for either path separator. */
export function parentFolder(path: string): string {
  const cut = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  if (cut < 0) return path
  // A file at the root keeps the root separator itself.
  return path.slice(0, cut === 0 ? 1 : cut)
}

/**
 * "Export logs", shared by the Logs window and Settings → General: ask where,
 * write the one file, then say where it went. A cancelled dialog says nothing.
 */
export function useExportLogs() {
  const { t } = useTranslation()
  const serviceHub = useServiceHub()
  const [exporting, setExporting] = useState(false)

  const exportLogs = useCallback(async () => {
    setExporting(true)
    try {
      const result = await serviceHub.app().exportLogs()
      if (!result) return
      toast.success(t('logs:exported'), {
        description: result.path,
        action: {
          label: t('logs:showInFolder'),
          onClick: () => {
            serviceHub
              .opener()
              .openPath(parentFolder(result.path))
              .catch((error) =>
                console.error('Failed to open the export folder:', error)
              )
          },
        },
      })
    } catch (error) {
      toast.error(t('logs:exportFailed'), {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setExporting(false)
    }
  }, [serviceHub, t])

  return { exportLogs, exporting }
}
