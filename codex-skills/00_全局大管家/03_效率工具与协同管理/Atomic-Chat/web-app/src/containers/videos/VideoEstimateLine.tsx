import { memo } from 'react'
import { IconClock } from '@tabler/icons-react'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useTranslation } from '@/i18n/react-i18next-compat'
import { cn } from '@/lib/utils'
import { durationUnits } from '@/lib/video/estimate'
import { formatDurationRange } from '@/lib/video/format-duration'
import type { VideoEstimate } from '@/services/diffusion/types'

type VideoEstimateLineProps = {
  estimate: VideoEstimate | null
  className?: string
}

/**
 * The core's estimate of the draft under Generate: a range of time when the
 * clip fits, and a warning tone when memory is tight. Nothing when it exceeds
 * memory — `ConfirmVideoExceedsMemory` asks on Generate, and a red box above
 * that dialog only said the same thing twice — and nothing without an
 * estimate (an older core, no model).
 */
export const VideoEstimateLine = memo(function VideoEstimateLine({
  estimate,
  className,
}: VideoEstimateLineProps) {
  const { t } = useTranslation()
  if (!estimate) return null
  const { verdict } = estimate.memory

  // The confirmation on Generate says it all, with Cancel as its default.
  if (verdict === 'exceeds') return null

  const range = estimate.seconds
    ? formatDurationRange(
        estimate.seconds.low,
        estimate.seconds.high,
        durationUnits(t)
      )
    : null
  return (
    <p
      role="status"
      className={cn(
        'flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-1 text-xs',
        verdict === 'tight'
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-muted-foreground',
        className
      )}
      data-testid="video-estimate"
      data-verdict={verdict}
    >
      <IconClock size={13} className="shrink-0" />
      {range && (
        <span className="tabular-nums">
          {t('videos:estimate.duration', { range })}
        </span>
      )}
      {verdict === 'tight' && (
        <span>
          {range ? '· ' : ''}
          {t('videos:estimate.tight')}
        </span>
      )}
      {estimate.basis === 'history' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="cursor-help underline decoration-dotted underline-offset-2"
              data-testid="video-estimate-history"
            >
              {t('videos:estimate.historyShort')}
            </span>
          </TooltipTrigger>
          <TooltipContent>{t('videos:estimate.history')}</TooltipContent>
        </Tooltip>
      )}
    </p>
  )
})

export default VideoEstimateLine
