/**
 * What a catalog family will report once it is loaded, known before it is.
 *
 * The core derives a loaded model's capabilities from nothing but the load
 * request (`capabilities()` / `videoCapabilities()` in atomic-chat-core's
 * `src/diffusion/session.ts`), and the request comes from the catalog, so the
 * Images and Video forms can show the right knobs — the negative prompt, cfg,
 * distilled guidance, the ranges — as soon as a model is picked, instead of
 * growing them when it finishes loading. The core's own answer replaces these
 * the moment the model is resident.
 */

import type { DiffusionCatalogFamily } from '@/services/diffusion-catalog-registry'
import type {
  ImageCapabilities,
  VideoCapabilities,
} from '@/services/diffusion/types'
import { familyDefaults, familyRanges } from './models'
import { workflowsForFamily } from './workflows'

/** The core's per-request batch cap (`MAX_BATCH`). */
const CORE_MAX_BATCH = 4

/**
 * An image family's capabilities as the core will report them. Cancelling
 * is the engine build's to say, so it is off until the model is loaded.
 */
export function previewImageCapabilities(
  family: DiffusionCatalogFamily
): ImageCapabilities {
  const defaults = familyDefaults(family)
  const ranges = familyRanges(family)
  return {
    workflows: workflowsForFamily(family.id),
    minDim: ranges.dims[0],
    maxDim: ranges.dims[1],
    dimMultiple: ranges.dimMultiple,
    supportsNegativePrompt: defaults.cfgScale > 1,
    supportsGuidance: defaults.guidance !== undefined,
    cancelGenerating: false,
    maxBatch: CORE_MAX_BATCH,
    defaults,
    ranges,
  }
}

/**
 * A video family's capabilities as the core will report them, or null for a
 * family without a video block. Whether the engine writes WebM is the build's
 * to say, so it is unknown until the model is loaded.
 */
export function previewVideoCapabilities(
  family: DiffusionCatalogFamily
): VideoCapabilities | null {
  const defaults = familyDefaults(family)
  const ranges = familyRanges(family)
  const video = defaults.video
  const frames = ranges.frames
  if (!video || !frames) return null
  return {
    workflows: ['create'],
    minDim: ranges.dims[0],
    maxDim: ranges.dims[1],
    dimMultiple: ranges.dimMultiple,
    supportsNegativePrompt: defaults.cfgScale > 1,
    supportsGuidance: defaults.guidance !== undefined,
    cancelGenerating: false,
    fps: video.fps,
    frames: {
      min: frames[0],
      max: frames[1],
      step: video.frameStep,
      offset: video.frameOffset,
      default: video.frames,
    },
    resolutionPresets: video.resolutionPresets.map(
      ([w, h]) => [w, h] as [number, number]
    ),
    outputFormat: 'webm',
    webmSupported: null,
    defaults,
    ranges,
  }
}
