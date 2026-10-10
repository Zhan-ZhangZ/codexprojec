import { render, screen } from '@testing-library/react'
import { page } from '@vitest/browser/context'
import { describe, expect, it } from 'vitest'

import { makeVideoJob } from '@/lib/diffusion/__tests__/video-fixtures'
import {
  DEFAULT_FONT_SIZE,
  expectNoHorizontalOverflow,
  expectOneLine,
  setFontSize,
  setTheme,
  withTranslations,
  XL_FONT_SIZE,
} from '@/test/layout'
import { VideoGenerationProgress } from './VideoGenerationProgress'

/** `settle` would wait on the dot field's endless loop; freeze it instead. */
async function still(root: Element): Promise<void> {
  await document.fonts.ready
  for (const animation of root.getAnimations({ subtree: true })) {
    animation.pause()
    animation.currentTime = 0
  }
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  )
}

const inside = (child: Element, frame: Element) => {
  const box = child.getBoundingClientRect()
  const bounds = frame.getBoundingClientRect()
  expect(box.left).toBeGreaterThanOrEqual(bounds.left - 0.5)
  expect(box.right).toBeLessThanOrEqual(bounds.right + 0.5)
  expect(box.top).toBeGreaterThanOrEqual(bounds.top - 0.5)
  expect(box.bottom).toBeLessThanOrEqual(bounds.bottom + 0.5)
}

describe('video progress geometry', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const fontSize of [DEFAULT_FONT_SIZE, XL_FONT_SIZE]) {
      // A portrait clip in a short viewer is the narrowest frame the page makes.
      it(`keeps the bar and one step line inside a portrait frame at ${fontSize} in ${theme}`, async () => {
        await page.viewport(fontSize === XL_FONT_SIZE ? 1024 : 1280, 800)
        setTheme(theme)
        setFontSize(fontSize)
        const view = render(
          withTranslations(
            <div className="h-[330px] w-[620px]">
              <VideoGenerationProgress
                job={makeVideoJob({
                  state: 'generating',
                  progress: {
                    phase: 'sampling',
                    step: 10,
                    totalSteps: 10,
                    fraction: 0.62,
                    etaSeconds: 7_380,
                    elapsedMs: 2_027_000,
                  },
                })}
                width={704}
                height={1280}
                startedAtMs={Date.now() - 2_027_000}
              />
            </div>
          )
        )
        await still(view.container)

        const preview = screen.getByTestId('image-generation-preview')
        const frame = preview.firstElementChild as HTMLElement
        const bar = screen.getByTestId('image-generation-progress-bar')
        const detail = screen.getByTestId('image-generation-progress-detail')
        inside(bar, frame)
        inside(detail, frame)
        expectOneLine(detail)
        expectNoHorizontalOverflow(frame)
        expect(bar.getBoundingClientRect().width).toBeGreaterThanOrEqual(48)
      })
    }
  }
})
