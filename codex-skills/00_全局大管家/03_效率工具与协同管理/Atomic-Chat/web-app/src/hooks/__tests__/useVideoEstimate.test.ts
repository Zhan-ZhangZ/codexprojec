import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeFakeDiffusion } from '@/lib/diffusion/__tests__/image-fixtures'
import {
  LTX_Q4_ID,
  makeVideoEstimate,
  WAN_Q4_ID,
} from '@/lib/diffusion/__tests__/video-fixtures'
import type {
  VideoEstimate,
  VideoGenerateRequest,
} from '@/services/diffusion/types'
import { seedServiceHub } from '@/test/service-hub'
import {
  estimateRequest,
  useVideoEstimate,
  VIDEO_ESTIMATE_DEBOUNCE_MS,
  VIDEO_ESTIMATE_PROMPT,
} from '../useVideoEstimate'

const base: VideoGenerateRequest = {
  prompt: 'a lighthouse',
  width: 768,
  height: 512,
  frames: 121,
  fps: 24,
  steps: 8,
  cfgScale: 1,
  workflow: 'create',
}

/** Resolve pending promises inside act, so their state updates land. */
const flush = () => act(async () => {})

describe('useVideoEstimate', () => {
  let estimateVideo: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    estimateVideo = vi.fn(async (request: VideoGenerateRequest) =>
      makeVideoEstimate(request.frames === 241 ? 'exceeds' : 'fits')
    )
    seedServiceHub({ diffusion: makeFakeDiffusion({ estimateVideo }) })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('asks once, a pause after the last of a series of changes, without the prompt', async () => {
    const { result, rerender } = renderHook(
      ({ request, model }) => useVideoEstimate(request, model),
      { initialProps: { request: base, model: LTX_Q4_ID as string | null } }
    )
    expect(result.current.estimate).toBeNull()
    for (const frames of [49, 97, 121, 241]) {
      rerender({ request: { ...base, frames }, model: LTX_Q4_ID })
      act(() => vi.advanceTimersByTime(VIDEO_ESTIMATE_DEBOUNCE_MS - 100))
    }
    // Typing a prompt is not a change the estimate cares about.
    rerender({
      request: { ...base, frames: 241, prompt: 'a lighthouse at dusk' },
      model: LTX_Q4_ID,
    })
    expect(estimateVideo).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(VIDEO_ESTIMATE_DEBOUNCE_MS))
    await flush()
    expect(estimateVideo).toHaveBeenCalledTimes(1)
    expect(estimateVideo).toHaveBeenCalledWith({
      ...estimateRequest({ ...base, frames: 241 }),
      prompt: VIDEO_ESTIMATE_PROMPT,
    })
    expect(result.current.estimate?.memory.verdict).toBe('exceeds')
  })

  it('asks again when the model changes, and drops an answer for numbers that have since changed', async () => {
    let answer!: (estimate: VideoEstimate) => void
    estimateVideo.mockImplementationOnce(
      () => new Promise<VideoEstimate>((resolve) => (answer = resolve))
    )
    const { result, rerender } = renderHook(
      ({ request, model }) => useVideoEstimate(request, model),
      { initialProps: { request: base, model: LTX_Q4_ID as string | null } }
    )
    act(() => vi.advanceTimersByTime(VIDEO_ESTIMATE_DEBOUNCE_MS))
    expect(estimateVideo).toHaveBeenCalledTimes(1)
    // The draft moves on while the first answer is still out.
    rerender({ request: { ...base, frames: 241 }, model: LTX_Q4_ID })
    act(() => vi.advanceTimersByTime(VIDEO_ESTIMATE_DEBOUNCE_MS))
    await flush()
    expect(result.current.estimate?.memory.verdict).toBe('exceeds')
    await act(async () => answer(makeVideoEstimate('tight')))
    expect(
      result.current.estimate?.memory.verdict,
      'the stale answer is ignored'
    ).toBe('exceeds')

    rerender({ request: { ...base, frames: 241 }, model: WAN_Q4_ID })
    act(() => vi.advanceTimersByTime(VIDEO_ESTIMATE_DEBOUNCE_MS))
    await flush()
    expect(estimateVideo).toHaveBeenCalledTimes(3)
  })

  it('asks nothing without a loaded video model, and forgets what it held', async () => {
    const { result, rerender } = renderHook(
      ({ request, model }) => useVideoEstimate(request, model),
      { initialProps: { request: base, model: null as string | null } }
    )
    act(() => vi.advanceTimersByTime(VIDEO_ESTIMATE_DEBOUNCE_MS * 3))
    expect(estimateVideo).not.toHaveBeenCalled()
    expect(await result.current.current()).toBeNull()

    rerender({ request: base, model: LTX_Q4_ID })
    act(() => vi.advanceTimersByTime(VIDEO_ESTIMATE_DEBOUNCE_MS))
    await flush()
    expect(result.current.estimate).not.toBeNull()
    rerender({ request: base, model: null })
    expect(result.current.estimate).toBeNull()
  })

  it('answers the current draft at once: the held estimate when it is current, a fresh one otherwise', async () => {
    const { result, rerender } = renderHook(
      ({ request, model }) => useVideoEstimate(request, model),
      { initialProps: { request: base, model: LTX_Q4_ID as string | null } }
    )
    act(() => vi.advanceTimersByTime(VIDEO_ESTIMATE_DEBOUNCE_MS))
    await flush()
    expect(estimateVideo).toHaveBeenCalledTimes(1)
    let answered: VideoEstimate | null = null
    await act(async () => {
      answered = await result.current.current()
    })
    expect(answered).toEqual(makeVideoEstimate('fits'))
    expect(estimateVideo).toHaveBeenCalledTimes(1)
    // Generate pressed before the pause is over: the draft is asked about now.
    rerender({ request: { ...base, frames: 241 }, model: LTX_Q4_ID })
    await act(async () => {
      answered = await result.current.current()
    })
    expect((answered as VideoEstimate | null)?.memory.verdict).toBe('exceeds')
    expect(estimateVideo).toHaveBeenCalledTimes(2)
  })

  it('reads a failed request as no estimate', async () => {
    estimateVideo.mockRejectedValueOnce(new Error('relay down'))
    const { result } = renderHook(() => useVideoEstimate(base, LTX_Q4_ID))
    act(() => vi.advanceTimersByTime(VIDEO_ESTIMATE_DEBOUNCE_MS))
    await flush()
    expect(result.current.estimate).toBeNull()
  })
})
