import { act, render, screen } from '@testing-library/react'
import { page } from '@vitest/browser/context'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { makeStatus } from '@/lib/diffusion/__tests__/image-fixtures'
import {
  DEFAULT_FONT_SIZE,
  expectNoHorizontalOverflow,
  expectOneLine,
  settle,
  setFontSize,
  setTheme,
  withTranslations,
  XL_FONT_SIZE,
} from '@/test/layout'
import { useImageGenerationStore } from '@/stores/image-generation-store'
import { ImageSetupCard } from './ImageSetupCard'

vi.mock('@/lib/telemetry-queue', () => ({ queuedCapture: vi.fn() }))

const GB = 1024 ** 3

/** The two places the card stands: centered on an empty page, and the studio's form column. */
const FRAMES = [
  { name: 'centered', className: 'flex w-[900px]', cardClassName: 'm-auto' },
  { name: 'form column', className: 'w-[340px]', cardClassName: undefined },
] as const

/** `settle` waits for animations to end; the spinner never does, so stop it first. */
async function still(): Promise<void> {
  for (const animation of document.body.getAnimations({ subtree: true })) {
    if (animation.effect?.getComputedTiming().iterations === Infinity) {
      animation.cancel()
    }
  }
  await settle()
}

const installing = (transferred: number) =>
  act(() =>
    useImageGenerationStore.setState({
      engineInstall: {
        inFlight: true,
        transferred,
        total: 15 * GB,
        error: null,
      },
    })
  )

describe('image setup card geometry', () => {
  beforeEach(() => {
    useImageGenerationStore.getState().reset()
    useImageGenerationStore.setState({
      status: makeStatus({ install: { state: 'not-installed' } }),
      hostBackendId: 'macos-arm64',
      hostBackendResolved: true,
    })
  })

  for (const theme of ['light', 'dark'] as const) {
    for (const fontSize of [DEFAULT_FONT_SIZE, XL_FONT_SIZE]) {
      for (const frame of FRAMES) {
        it(`keeps the button and the card still through the install (${frame.name}, ${fontSize}, ${theme})`, async () => {
          await page.viewport(fontSize === XL_FONT_SIZE ? 1024 : 1280, 800)
          setTheme(theme)
          setFontSize(fontSize)
          render(
            withTranslations(
              <div className={frame.className} data-testid="frame">
                <ImageSetupCard className={frame.cardClassName} />
              </div>
            )
          )
          await still()

          const card = screen.getByTestId('image-setup-card')
          const button = screen.getByTestId('image-engine-install')
          const idle = {
            button: button.getBoundingClientRect(),
            card: card.getBoundingClientRect(),
          }
          expectNoHorizontalOverflow(screen.getByTestId('frame'))

          // Worst case readout: a two-digit GB total and a three-digit percentage.
          installing(15 * GB)
          await still()
          const busy = button.getBoundingClientRect()
          expect(busy.width).toBeCloseTo(idle.button.width, 0)
          expect(busy.left).toBeCloseTo(idle.button.left, 0)
          expect(card.getBoundingClientRect().height).toBeCloseTo(
            idle.card.height,
            0
          )
          expect(button).toHaveTextContent('100%')
          expectOneLine(screen.getByTestId('image-engine-progress'))
          expectNoHorizontalOverflow(screen.getByTestId('frame'))

          act(() =>
            useImageGenerationStore.setState({
              engineInstall: {
                inFlight: false,
                transferred: 0,
                total: 0,
                error: {
                  code: 'ENGINE_MISSING',
                  message:
                    'The download was interrupted before the archive could be verified.',
                },
              },
            })
          )
          await still()
          expect(card.getBoundingClientRect().height).toBeCloseTo(
            idle.card.height,
            0
          )
          expectNoHorizontalOverflow(screen.getByTestId('frame'))
        })
      }
    }
  }
})
