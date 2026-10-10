import { memo } from 'react'
import { IconRestore } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type MediaSettingsHeadingProps = {
  /** The section's name, e.g. "Settings". */
  label: string
  resetLabel: string
  /** What Reset puts back, and that the prompt stays. */
  resetHint: string
  /** Absent until a model reports its defaults: there is nothing to reset to. */
  onReset?: () => void
  disabled?: boolean
  /** `image` or `video`: prefixes the test ids. */
  testIdPrefix: string
}

/**
 * The heading over the generation knobs of the Images and Video columns, with
 * Reset beside them: the button sits next to what it puts back, not in the
 * page heading far above. Drawn like the Advanced fold at the bottom, so the
 * column reads as prompt, settings, advanced.
 */
export const MediaSettingsHeading = memo(function MediaSettingsHeading({
  label,
  resetLabel,
  resetHint,
  onReset,
  disabled,
  testIdPrefix,
}: MediaSettingsHeadingProps) {
  return (
    <div
      className="flex min-h-6 items-center justify-between gap-3 border-t border-border/60 pt-3 pl-2"
      data-testid={`${testIdPrefix}-settings-heading`}
    >
      <h3 className="min-w-0 truncate text-xs font-medium">{label}</h3>
      {onReset && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={disabled}
              onClick={onReset}
              className="-my-1 shrink-0 text-muted-foreground hover:text-foreground"
              data-testid={`${testIdPrefix}-reset`}
            >
              <IconRestore />
              {resetLabel}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{resetHint}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
})

export default MediaSettingsHeading
