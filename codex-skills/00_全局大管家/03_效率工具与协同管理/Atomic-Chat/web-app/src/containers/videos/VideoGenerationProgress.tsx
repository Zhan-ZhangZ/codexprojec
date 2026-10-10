import { memo, useEffect, useState } from 'react'
import { IconAlertTriangle } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { ImageGenerationPlaceholder } from '@/containers/images/ImageGenerationPlaceholder'
import { useTranslation } from '@/i18n/react-i18next-compat'
import { durationUnits, remainingSeconds } from '@/lib/video/estimate'
import { formatDuration } from '@/lib/video/format-duration'
import type { VideoJob } from '@/services/diffusion/types'

type VideoGenerationProgressProps = {
  job: VideoJob | null
  /** The clip's frame size, so the preview frame has the clip's shape. */
  width: number
  height: number
  /** The page's clock origin for the clip, used until the core reports. */
  startedAtMs: number
}

/**
 * The live preview of a clip, with everything about the job inside its frame:
 * the phase, the core's whole-job fraction as a bar, and the step, the
 * elapsed time and the time left on one line. Past its forecast the core
 * forecasts the rest again instead of dropping the time left (core ADR
 * 2026-09-30-keep-the-video-eta-past-its-forecast); an older core drops it,
 * and the phase alone says what is running.
 */
export const VideoGenerationProgress = memo(function VideoGenerationProgress({
  job,
  width,
  height,
  startedAtMs,
}: VideoGenerationProgressProps) {
  const { t } = useTranslation()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const remaining = job ? remainingSeconds(job, now, startedAtMs) : null

  return (
    <ImageGenerationPlaceholder
      variant="viewer"
      kind="video"
      width={width}
      height={height}
      progress={job?.progress ?? null}
      startedAtMs={startedAtMs}
      fraction={job ? (job.progress?.fraction ?? 0) : null}
      remaining={
        remaining !== null
          ? t('videos:progress.remaining', {
              duration: formatDuration(remaining, durationUnits(t)),
            })
          : null
      }
    />
  )
})

type VideoSlowdownWarningProps = {
  /** The user already pressed Stop: the cancel is on its way. */
  stopping: boolean
  onStop: () => void
}

/**
 * The core saw the steps slow down sharply, the sign of a machine swapping:
 * say so, say what helps, and offer to stop the clip.
 */
export function VideoSlowdownWarning({
  stopping,
  onStop,
}: VideoSlowdownWarningProps) {
  const { t } = useTranslation()
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3"
      data-testid="video-slowdown"
    >
      <IconAlertTriangle
        size={16}
        className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-medium">
          {t('videos:progress.slowdown.title')}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('videos:progress.slowdown.body')}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0"
        disabled={stopping}
        onClick={onStop}
      >
        {t('videos:progress.slowdown.stop')}
      </Button>
    </div>
  )
}

export default VideoGenerationProgress
