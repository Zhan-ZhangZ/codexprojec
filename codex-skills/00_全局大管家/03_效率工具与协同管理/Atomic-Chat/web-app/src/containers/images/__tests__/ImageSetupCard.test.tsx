import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeStatus } from '@/lib/diffusion/__tests__/image-fixtures'
import { useImageGenerationStore } from '@/stores/image-generation-store'
import { ImageSetupCard } from '../ImageSetupCard'

vi.mock('@/i18n/react-i18next-compat', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const MB = 1024 * 1024

describe('ImageSetupCard', () => {
  beforeEach(() => {
    useImageGenerationStore.getState().reset()
    useImageGenerationStore.setState({
      status: makeStatus({ install: { state: 'not-installed' } }),
      hostBackendId: 'macos-arm64',
      hostBackendResolved: true,
      installedArtifacts: [],
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('installs the engine in one click, with no wizard in between', async () => {
    const install = vi
      .spyOn(useImageGenerationStore.getState(), 'installEngine')
      .mockResolvedValue()
    render(<ImageSetupCard />)

    const button = screen.getByTestId('image-engine-install')
    expect(button).toHaveTextContent('images:setup.card.engine')
    await userEvent.click(button)

    expect(install).toHaveBeenCalledOnce()
    expect(useImageGenerationStore.getState().setupOpen).toBe(false)
  })

  it('shows the progress on the button while the engine comes down', () => {
    useImageGenerationStore.setState({
      engineInstall: {
        inFlight: true,
        transferred: 25 * MB,
        total: 100 * MB,
        error: null,
      },
    })
    render(<ImageSetupCard />)

    const button = screen.getByTestId('image-engine-install')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('25%')
    expect(screen.getByTestId('image-engine-progress')).toHaveTextContent(
      '25 / 100 MB'
    )
  })

  it('offers the same button again with the reason after a failed install', () => {
    useImageGenerationStore.setState({
      engineInstall: {
        inFlight: false,
        transferred: 0,
        total: 0,
        error: { code: 'ENGINE_MISSING', message: 'No space left.' },
      },
    })
    render(<ImageSetupCard />)

    expect(screen.getByTestId('image-engine-install')).toBeEnabled()
    expect(screen.getByTestId('image-setup-card')).toHaveTextContent(
      'images:setup.engine.failed No space left.'
    )
  })

  it('waits for the host check before offering the install', () => {
    useImageGenerationStore.setState({
      hostBackendId: null,
      hostBackendResolved: false,
    })
    render(<ImageSetupCard />)

    const button = screen.getByTestId('image-engine-install')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('images:setup.engine.checking')
  })

  it('explains when this computer has no engine build, and offers no install', () => {
    useImageGenerationStore.setState({
      hostBackendId: null,
      hostBackendReason: 'Intel Macs are not supported.',
      hostBackendResolved: true,
    })
    render(<ImageSetupCard />)

    const card = screen.getByTestId('image-setup-card')
    expect(card).toHaveTextContent('images:setup.engine.unsupported')
    expect(card).toHaveTextContent('Intel Macs are not supported.')
    expect(screen.queryByTestId('image-engine-install')).not.toBeInTheDocument()
  })

  it('speaks for the Video page', () => {
    render(<ImageSetupCard modality="video" />)

    const card = screen.getByTestId('image-setup-card')
    expect(card).toHaveAttribute('data-modality', 'video')
    expect(card).toHaveTextContent('videos:setup.card.title')
    expect(card).not.toHaveTextContent('images:setup.card.title')
    expect(screen.getByTestId('image-engine-install')).toHaveTextContent(
      'videos:setup.card.engine'
    )
  })
})
