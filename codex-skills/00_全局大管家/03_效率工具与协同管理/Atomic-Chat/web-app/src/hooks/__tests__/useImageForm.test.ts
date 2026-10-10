import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { localStorageKey } from '@/constants/localStorage'
import { makeCapabilities } from '@/lib/diffusion/__tests__/image-fixtures'
import {
  DEFAULT_IMAGE_FORM,
  DEFAULT_WORKFLOW_KNOBS,
  useImageForm,
} from '../useImageForm'

describe('useImageForm', () => {
  beforeEach(async () => {
    localStorage.clear()
    await useImageForm.persist.rehydrate()
    useImageForm.setState({
      ...DEFAULT_IMAGE_FORM,
      ...DEFAULT_WORKFLOW_KNOBS,
      sourceImage: null,
      maskBase64: null,
      maskResetKey: 0,
      referenceImages: [],
      recipeFamily: null,
    })
  })

  it('persists durable settings but never prompts or source inputs', () => {
    useImageForm.setState({
      prompt: 'An unsent image prompt',
      negativePrompt: 'An unsent negative prompt',
      workflow: 'inpaint',
      strength: 0.4,
      expandPercent: 40,
      sourceImage: { path: '/in.png', width: 10, height: 10 },
      maskBase64: 'data:image/png;base64,QUJD',
      referenceImages: ['/ref.png'],
    })
    const stored = JSON.parse(localStorage.getItem(localStorageKey.imageForm) ?? '{}')
    expect(stored.state.strength).toBe(0.4)
    expect(stored.state.expandPercent).toBe(40)
    expect(stored.state.workflow).toBe('inpaint')
    expect(stored.state).not.toHaveProperty('prompt')
    expect(stored.state).not.toHaveProperty('negativePrompt')
    expect(stored.state).not.toHaveProperty('sourceImage')
    expect(stored.state).not.toHaveProperty('maskBase64')
    expect(stored.state).not.toHaveProperty('referenceImages')
  })

  it('keeps prompt text when the Images route remounts in one session', () => {
    const firstMount = renderHook(() =>
      useImageForm((state) => state.prompt)
    )
    act(() => {
      useImageForm.getState().patch({ prompt: 'Keep this between routes' })
    })
    firstMount.unmount()

    const secondMount = renderHook(() =>
      useImageForm((state) => state.prompt)
    )
    expect(secondMount.result.current).toBe('Keep this between routes')
  })

  it('rehydrates durable settings but starts prompts empty after a relaunch', async () => {
    useImageForm.setState({
      prompt: 'Do not restore this',
      negativePrompt: 'Do not restore this either',
      workflow: 'upscale',
      width: 1536,
      height: 1024,
      steps: 31,
      cfgScale: 4.5,
      seedText: '8675309',
      strength: 0.45,
    })
    const persisted = localStorage.getItem(localStorageKey.imageForm)
    expect(persisted).not.toBeNull()

    useImageForm.setState({
      ...DEFAULT_IMAGE_FORM,
      ...DEFAULT_WORKFLOW_KNOBS,
    })
    localStorage.setItem(localStorageKey.imageForm, persisted!)
    await useImageForm.persist.rehydrate()

    const state = useImageForm.getState()
    expect(state.prompt).toBe('')
    expect(state.negativePrompt).toBe('')
    expect(state.workflow).toBe('upscale')
    expect(state.width).toBe(1536)
    expect(state.height).toBe(1024)
    expect(state.steps).toBe(31)
    expect(state.cfgScale).toBe(4.5)
    expect(state.seedText).toBe('8675309')
    expect(state.strength).toBe(0.45)
  })

  it('migrates v1 records by removing old prompts without clearing settings', async () => {
    const legacy = JSON.stringify({
      version: 1,
      state: {
        prompt: 'Legacy positive prompt',
        negativePrompt: 'Legacy negative prompt',
        negativeOpen: true,
        workflow: 'edit',
        width: 768,
        height: 512,
        steps: 24,
        cfgScale: 3,
        seedText: '1234',
        runs: 3,
        strength: 0.25,
      },
    })

    useImageForm.setState({
      ...DEFAULT_IMAGE_FORM,
      ...DEFAULT_WORKFLOW_KNOBS,
    })
    localStorage.setItem(localStorageKey.imageForm, legacy)
    await useImageForm.persist.rehydrate()

    const state = useImageForm.getState()
    expect(state.prompt).toBe('')
    expect(state.negativePrompt).toBe('')
    expect(state.negativeOpen).toBe(true)
    expect(state.workflow).toBe('edit')
    expect(state.width).toBe(768)
    expect(state.height).toBe(512)
    expect(state.steps).toBe(24)
    expect(state.cfgScale).toBe(3)
    expect(state.seedText).toBe('1234')
    expect(state.runs).toBe(3)
    expect(state.strength).toBe(0.25)

    const migrated = JSON.parse(
      localStorage.getItem(localStorageKey.imageForm) ?? '{}'
    )
    expect(migrated.version).toBe(2)
    expect(migrated.state).not.toHaveProperty('prompt')
    expect(migrated.state).not.toHaveProperty('negativePrompt')
  })

  it('drops the mask when the source changes and on Clear mask', () => {
    useImageForm.setState({ maskBase64: 'data:image/png;base64,QUJD' })
    const before = useImageForm.getState().maskResetKey
    useImageForm.getState().setSourceImage({ path: '/other.png', width: 1, height: 1 })
    expect(useImageForm.getState().maskBase64).toBeNull()
    expect(useImageForm.getState().maskResetKey).toBe(before + 1)

    useImageForm.setState({ maskBase64: 'data:image/png;base64,QUJD' })
    useImageForm.getState().clearMask()
    expect(useImageForm.getState().maskBase64).toBeNull()
    expect(useImageForm.getState().sourceImage?.path).toBe('/other.png')
  })

  it('caps the extra references at three', () => {
    const { addReference, removeReference } = useImageForm.getState()
    for (const path of ['/1.png', '/2.png', '/3.png', '/4.png']) addReference(path)
    expect(useImageForm.getState().referenceImages).toEqual(['/1.png', '/2.png', '/3.png'])
    removeReference(1)
    expect(useImageForm.getState().referenceImages).toEqual(['/1.png', '/3.png'])
  })

  it('leaves the workflow alone when clamping to a model that lacks it', () => {
    useImageForm.setState({ workflow: 'edit', width: 1000, height: 700 })
    useImageForm.getState().clampTo(makeCapabilities({ workflows: ['create'] }))
    const state = useImageForm.getState()
    expect(state.workflow).toBe('edit')
    expect(state.width).toBe(1008)
  })

  it('clamps batch size to a loaded model without discarding a valid draft', () => {
    useImageForm.setState({ batchSize: 3 })
    useImageForm.getState().clampTo(makeCapabilities({ maxBatch: 4 }))
    expect(useImageForm.getState().batchSize).toBe(3)

    useImageForm.getState().clampTo(makeCapabilities({ maxBatch: 1 }))
    expect(useImageForm.getState().batchSize).toBe(1)
  })

  it('keeps the size and aspect the user set when a model starts', () => {
    // What the recording showed: 640 × 480 (Photo 4:3), 10 steps, cfg 3 set
    // while the model was stopped, then the start put Qwen's defaults back.
    useImageForm.setState({
      recipeFamily: 'qwen-image-2.1',
      width: 640,
      height: 480,
      aspect: 'photo',
      steps: 10,
      cfgScale: 3,
    })
    useImageForm.getState().adoptModel(
      'qwen-image-2.1',
      makeCapabilities({
        defaults: { steps: 40, cfgScale: 6, width: 1024, height: 1024 },
      })
    )
    expect(useImageForm.getState()).toMatchObject({
      width: 640,
      height: 480,
      aspect: 'photo',
      steps: 10,
      cfgScale: 3,
    })
  })

  it('gives another family its own defaults, keeping the prompt', () => {
    useImageForm.setState({
      recipeFamily: 'qwen-image-2.1',
      prompt: 'keep',
      width: 640,
      height: 480,
      steps: 40,
      cfgScale: 6,
    })
    useImageForm.getState().adoptModel(
      'z-image',
      makeCapabilities({
        defaults: { steps: 8, cfgScale: 1, width: 1024, height: 1024 },
      })
    )
    expect(useImageForm.getState()).toMatchObject({
      recipeFamily: 'z-image',
      prompt: 'keep',
      width: 1024,
      height: 1024,
      aspect: 'square',
      steps: 8,
      cfgScale: 1,
    })
  })

  it('takes the defaults for the first model, and keeps a restored recipe for its own', () => {
    useImageForm.setState({ steps: 31 })
    useImageForm.getState().adoptModel('z-image', makeCapabilities())
    expect(useImageForm.getState()).toMatchObject({
      recipeFamily: 'z-image',
      steps: 8,
    })

    useImageForm
      .getState()
      .applyDraft({ ...DEFAULT_IMAGE_FORM, steps: 12, cfgScale: 4 }, 'flux.1')
    useImageForm.getState().adoptModel('flux.1', makeCapabilities())
    expect(useImageForm.getState()).toMatchObject({
      recipeFamily: 'flux.1',
      steps: 12,
      cfgScale: 4,
    })
  })

  it('names the aspect again only when clamping changed the size', () => {
    useImageForm.setState({ width: 1000, height: 750, aspect: 'custom' })
    useImageForm.getState().clampTo(makeCapabilities())
    expect(useImageForm.getState()).toMatchObject({
      width: 1008,
      height: 752,
      aspect: 'photo',
    })

    useImageForm.setState({ width: 1024, height: 1024, aspect: 'custom' })
    useImageForm.getState().clampTo(makeCapabilities())
    expect(useImageForm.getState().aspect).toBe('custom')
  })

  it('persists the family its numbers are for', () => {
    useImageForm.getState().adoptModel('z-image', makeCapabilities())
    const stored = JSON.parse(
      localStorage.getItem(localStorageKey.imageForm) ?? '{}'
    )
    expect(stored.state.recipeFamily).toBe('z-image')
  })

  it('resets the workflow knobs with the rest of the numbers', () => {
    useImageForm.setState({ strength: 0.2, upscaleFactor: 4, prompt: 'keep' })
    useImageForm.getState().resetToDefaults({ steps: 8, cfgScale: 1, width: 1024, height: 1024 })
    const state = useImageForm.getState()
    expect(state.strength).toBe(DEFAULT_WORKFLOW_KNOBS.strength)
    expect(state.upscaleFactor).toBe(DEFAULT_WORKFLOW_KNOBS.upscaleFactor)
    expect(state.prompt).toBe('keep')
  })
})
