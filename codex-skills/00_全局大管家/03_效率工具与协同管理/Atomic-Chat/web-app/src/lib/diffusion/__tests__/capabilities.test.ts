import { describe, expect, it } from 'vitest'

import {
  previewImageCapabilities,
  previewVideoCapabilities,
} from '../capabilities'
import { buildLoadRequest } from '../models'
import { MODELS_ROOT, Z_IMAGE } from './image-fixtures'
import { LTX_2, WAN_22 } from './video-fixtures'

// Qwen-Image 2.1's shape: cfg 6, so the core takes a negative prompt, even
// though the catalog's own flag says it does not.
const QWEN_21 = {
  ...Z_IMAGE,
  id: 'qwen-image-2.1',
  defaults: { steps: 40, cfg_scale: 6, width: 1024, height: 1024 },
  capabilities: { ...Z_IMAGE.capabilities, negative_prompt: false },
} as typeof Z_IMAGE

describe('previewImageCapabilities', () => {
  it('reports what the core will: its defaults, ranges and cfg rule', () => {
    const request = buildLoadRequest(Z_IMAGE, 'q4_k_m', [], MODELS_ROOT, {
      offload: 'none',
    })
    expect(previewImageCapabilities(Z_IMAGE)).toEqual({
      workflows: ['create', 'transform', 'inpaint', 'extend', 'upscale'],
      minDim: 256,
      maxDim: 2048,
      dimMultiple: 16,
      supportsNegativePrompt: false,
      supportsGuidance: false,
      cancelGenerating: false,
      maxBatch: 4,
      defaults: request.defaults,
      ranges: request.ranges,
    })
  })

  it('takes a negative prompt when the default cfg is above 1, as the core does', () => {
    expect(previewImageCapabilities(QWEN_21)).toMatchObject({
      supportsNegativePrompt: true,
      defaults: { steps: 40, cfgScale: 6 },
    })
  })

  it('offers distilled guidance when the family has a default for it', () => {
    const krea = {
      ...Z_IMAGE,
      id: 'flux.1-krea',
      defaults: { ...Z_IMAGE.defaults, guidance: 4.5 },
    } as typeof Z_IMAGE
    expect(previewImageCapabilities(krea)).toMatchObject({
      supportsGuidance: true,
      defaults: { guidance: 4.5 },
    })
  })
})

describe('previewVideoCapabilities', () => {
  it('reports the lattice, the presets and the rate of a video family', () => {
    const ltx = previewVideoCapabilities(LTX_2)
    expect(ltx).toMatchObject({
      workflows: ['create'],
      supportsNegativePrompt: false,
      fps: LTX_2.video!.fps,
      frames: {
        min: LTX_2.video!.frame_range[0],
        max: LTX_2.video!.frame_range[1],
        step: LTX_2.video!.frame_step,
        offset: LTX_2.video!.frame_offset,
        default: LTX_2.video!.frames,
      },
      resolutionPresets: LTX_2.video!.resolution_presets,
      webmSupported: null,
    })
    expect(previewVideoCapabilities(WAN_22)?.supportsNegativePrompt).toBe(true)
  })

  it('has nothing for a family without a video block', () => {
    expect(previewVideoCapabilities(Z_IMAGE)).toBeNull()
  })
})
