import { describe, expect, it } from 'vitest'

import {
  makeVideoEstimate,
  makeVideoJob,
} from '@/lib/diffusion/__tests__/video-fixtures'
import type { VideoJobProgress } from '@/services/diffusion/types'
import {
  durationUnits,
  exceedsSentence,
  formatGigabytes,
  remainingSeconds,
} from '../estimate'

const t = (key: string, values?: Record<string, unknown>) =>
  values ? `${key} ${JSON.stringify(values)}` : key

const progress = (overrides: Partial<VideoJobProgress>): VideoJobProgress => ({
  phase: 'sampling',
  step: 3,
  totalSteps: 8,
  fraction: 0.4,
  etaSeconds: null,
  elapsedMs: 60_000,
  ...overrides,
})

describe('the estimate copy', () => {
  it('reads bytes as gigabytes with one decimal', () => {
    expect(formatGigabytes(16 * 1024 ** 3 * 0.85)).toBe('13.6')
    expect(formatGigabytes(27.3 * 1024 ** 3)).toBe('27.3')
    expect(formatGigabytes(0)).toBe('0.0')
  })

  it('translates the units and fills the exceeds sentence', () => {
    expect(durationUnits(t)).toEqual({
      s: 'videos:estimate.units.s',
      min: 'videos:estimate.units.min',
      h: 'videos:estimate.units.h',
    })
    expect(exceedsSentence(makeVideoEstimate('exceeds'), t)).toBe(
      'videos:estimate.exceeds {"required":"27.3","available":"13.6"}'
    )
  })
})

describe('remainingSeconds', () => {
  const estimate = makeVideoEstimate('fits', {
    seconds: { low: 450, high: 1800 },
  })

  it('takes the core’s ETA once it reports one', () => {
    const job = makeVideoJob({
      estimate,
      progress: progress({ etaSeconds: 750 }),
    })
    expect(remainingSeconds(job, 0, 0)).toBe(750)
    expect(
      remainingSeconds(
        makeVideoJob({ progress: progress({ etaSeconds: 0 }) }),
        0,
        0
      )
    ).toBeNull()
  })

  it('stands in with the estimate’s middle before the core reports, less the time spent', () => {
    // The middle of 450–1800 s is 900 s.
    expect(
      remainingSeconds(
        makeVideoJob({ estimate, progress: null }),
        100_000,
        40_000
      )
    ).toBe(840)
    expect(
      remainingSeconds(
        makeVideoJob({
          estimate,
          progress: progress({ phase: 'encoding', elapsedMs: 30_000 }),
        }),
        0,
        0
      )
    ).toBe(870)
    // Past the estimate, or without one, there is nothing to say.
    expect(
      remainingSeconds(makeVideoJob({ estimate, progress: null }), 1_000_000, 1)
    ).toBeNull()
    expect(
      remainingSeconds(makeVideoJob({ progress: null }), 10_000, 1)
    ).toBeNull()
  })

  it('leaves a null ETA alone once sampling started', () => {
    const job = makeVideoJob({
      estimate,
      progress: progress({ phase: 'decoding', etaSeconds: null }),
    })
    expect(remainingSeconds(job, 0, 0)).toBeNull()
  })
})
