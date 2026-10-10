import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n/react-i18next-compat', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
// The reason is the tooltip's content; render it in place of the popup.
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="generate-reason">{children}</div>
  ),
}))

import { ImageGenerateButton } from '../ImageGenerateButton'

const props = {
  generating: false,
  stopRequested: false,
  imageCount: 1,
  onGenerate: vi.fn(),
  onStop: vi.fn(),
}

describe('ImageGenerateButton', () => {
  it('reads the reason from the page it serves', () => {
    const { rerender } = render(
      <ImageGenerateButton {...props} disabledReason="noModel" />
    )
    expect(screen.getByTestId('generate-reason')).toHaveTextContent(
      'images:form.disabled.noModel'
    )

    rerender(
      <ImageGenerateButton {...props} disabledReason="noModel" modality="video" />
    )
    expect(screen.getByTestId('generate-reason')).toHaveTextContent(
      'videos:form.disabled.noModel'
    )
  })

  it('says the model is starting instead of explaining a disabled button', () => {
    render(<ImageGenerateButton {...props} disabledReason="modelLoading" />)
    expect(screen.getByTestId('image-generate')).toBeDisabled()
    expect(screen.getByTestId('image-generate')).toHaveTextContent(
      'images:form.starting'
    )
    expect(screen.queryByTestId('generate-reason')).not.toBeInTheDocument()
  })
})
