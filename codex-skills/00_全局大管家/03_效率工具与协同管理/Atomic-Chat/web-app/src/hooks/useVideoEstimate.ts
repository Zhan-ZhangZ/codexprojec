import { useCallback, useEffect, useRef, useState } from 'react'

import { useServiceHub } from '@/hooks/useServiceHub'
import type {
  VideoEstimate,
  VideoGenerateRequest,
} from '@/services/diffusion/types'

/** How long the form has to sit still before it asks again. */
export const VIDEO_ESTIMATE_DEBOUNCE_MS = 400

/**
 * The prompt the estimate is asked with. The estimate does not depend on it,
 * but the core validates the body as a job, which needs one; the user's own
 * text never leaves for an estimate, and typing does not ask again.
 */
export const VIDEO_ESTIMATE_PROMPT = 'estimate'

/** The request an estimate is asked for: the draft's size, length, steps and guidance. */
export function estimateRequest(
  request: VideoGenerateRequest
): VideoGenerateRequest {
  return {
    prompt: VIDEO_ESTIMATE_PROMPT,
    width: request.width,
    height: request.height,
    ...(request.frames !== undefined ? { frames: request.frames } : {}),
    ...(request.fps !== undefined ? { fps: request.fps } : {}),
    steps: request.steps,
    cfgScale: request.cfgScale,
    workflow: request.workflow ?? 'create',
  }
}

/** What an estimate depends on: the loaded model and the draft's numbers. */
function estimateKey(request: VideoGenerateRequest, modelId: string): string {
  return JSON.stringify([
    modelId,
    request.width,
    request.height,
    request.frames ?? null,
    request.fps ?? null,
    request.steps,
    request.cfgScale,
  ])
}

export type VideoEstimateHandle = {
  /**
   * The latest estimate the core gave for this model: null until the first
   * answer, without a loaded video model, and when the core has none (an
   * older core, a refusal).
   */
  estimate: VideoEstimate | null
  /**
   * The estimate of exactly the current draft, asked at once when the one
   * held is for older numbers. `modelId` names a model that has just been
   * loaded, before this hook has seen it.
   */
  current: (modelId?: string) => Promise<VideoEstimate | null>
}

/**
 * The core's estimate of the draft, kept in step with it: asked again
 * `VIDEO_ESTIMATE_DEBOUNCE_MS` after the resolution, length, steps, guidance
 * or model last changed, and only while a video model is loaded
 * (`modelId`). An answer for numbers that have since changed is dropped.
 */
export function useVideoEstimate(
  request: VideoGenerateRequest,
  modelId: string | null
): VideoEstimateHandle {
  const serviceHub = useServiceHub()
  const key = modelId === null ? null : estimateKey(request, modelId)
  const [held, setHeld] = useState<{
    key: string
    estimate: VideoEstimate | null
  } | null>(null)
  // Every question gets a ticket; only the newest one's answer is kept.
  const ticket = useRef(0)
  const latest = useRef(request)
  latest.current = request

  const ask = useCallback(
    async (forKey: string): Promise<VideoEstimate | null> => {
      const mine = ++ticket.current
      const estimate = await serviceHub
        .diffusion()
        .estimateVideo(estimateRequest(latest.current))
        .catch(() => null)
      if (mine === ticket.current) setHeld({ key: forKey, estimate })
      return estimate
    },
    [serviceHub]
  )

  useEffect(() => {
    if (key === null) {
      ticket.current += 1
      setHeld(null)
      return
    }
    // A change supersedes whatever is in flight, before the pause even ends.
    ticket.current += 1
    const timer = setTimeout(() => void ask(key), VIDEO_ESTIMATE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [key, ask])

  const current = useCallback(
    async (loadedModelId?: string): Promise<VideoEstimate | null> => {
      const forKey =
        key ??
        (loadedModelId === undefined
          ? null
          : estimateKey(latest.current, loadedModelId))
      if (forKey === null) return null
      if (held?.key === forKey) return held.estimate
      return ask(forKey)
    },
    [key, held, ask]
  )

  return { estimate: key === null ? null : (held?.estimate ?? null), current }
}
