import { memo } from 'react'

type MediaPageHeadingProps = {
  title: string
  subtitle: string
  /** `image` or `video`: prefixes the test ids. */
  testIdPrefix: string
}

/**
 * The top of the Images and Video form columns: the page's name and what it
 * does. The mode picker sits under it as a control of its own, so the
 * heading reads the same whichever mode is active.
 */
export const MediaPageHeading = memo(function MediaPageHeading({
  title,
  subtitle,
  testIdPrefix,
}: MediaPageHeadingProps) {
  return (
    <div
      className="min-w-0 space-y-1"
      data-testid={`${testIdPrefix}-page-heading`}
    >
      <h1
        className="font-studio text-xl font-medium leading-tight"
        data-testid={`${testIdPrefix}-page-title`}
      >
        {title}
      </h1>
      <p
        className="text-xs leading-snug text-muted-foreground"
        data-testid={`${testIdPrefix}-page-subtitle`}
      >
        {subtitle}
      </p>
    </div>
  )
})
