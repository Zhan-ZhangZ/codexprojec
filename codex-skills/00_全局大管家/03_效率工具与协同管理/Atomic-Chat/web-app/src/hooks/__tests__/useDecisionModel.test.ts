import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n/react-i18next-compat', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const lib = vi.hoisted(() => ({
  activateDecisionModel: vi.fn(),
  stopDecisionModel: vi.fn(),
  deleteDecisionModel: vi.fn(),
  downloadDecisionModel: vi.fn(),
  isDecisionModelInstalled: vi.fn(),
}))

vi.mock('@/lib/decision/models', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/decision/models')>()),
  ...lib,
}))

const cancelTransfer = vi.hoisted(() => vi.fn())
vi.mock('@/services/diffusion/transfer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/diffusion/transfer')>()),
  cancelTransfer,
}))

const raiseServer = vi.hoisted(() => vi.fn())
vi.mock('@/utils/localApiServerControl', () => ({
  raiseLocalApiServerForMediaModel: raiseServer,
}))

import { useDownloadStore } from '@/hooks/useDownloadStore'
import { useDecisionModel } from '@/hooks/useDecisionModel'
import type { DecisionCatalogModel } from '@/services/decision-catalog-registry'
import type { DecisionConfig, DecisionService } from '@/services/decision/types'
import { useDecisionStore } from '@/stores/decision-store'
import { seedServiceHub } from '@/test/service-hub'

const model: DecisionCatalogModel = {
  id: 'laya',
  name: 'Laya',
  repo: 'systemone/laya',
  revision: 'b'.repeat(40),
  languages: 'en',
  context: 8192,
  calibrated: true,
  files: [{ path: 'rl_agent_config.json', bytes: 100, sha256: 'a'.repeat(64) }],
}

const getConfig = vi.fn()

const initialDecision = useDecisionStore.getState()

beforeEach(() => {
  vi.clearAllMocks()
  useDecisionStore.setState(initialDecision, true)
  useDownloadStore.setState({
    downloads: {},
    localDownloadingModels: new Set(),
    resumableDownloads: new Set(),
  })
  lib.activateDecisionModel.mockResolvedValue({ state: 'ready' })
  lib.stopDecisionModel.mockResolvedValue(undefined)
  lib.deleteDecisionModel.mockResolvedValue(undefined)
  lib.downloadDecisionModel.mockResolvedValue(undefined)
  lib.isDecisionModelInstalled.mockResolvedValue(true)
  getConfig.mockResolvedValue({
    config: { model_path: 'decision/models/laya' },
    status: { state: 'ready' },
  })
  seedServiceHub({
    decision: {
      isSupported: () => true,
      getConfig,
    } as unknown as DecisionService,
  })
})

// Unmount before the shared teardown drops the service hub the hook reads.
afterEach(() => {
  cleanup()
})

describe('useDecisionModel', () => {
  it('reports the state only for the running model', () => {
    useDecisionStore.setState({
      config: {
        enabled: true,
        model_path: 'decision/models/laya',
      } as DecisionConfig,
      status: { state: 'starting' } as never,
    })
    const { result } = renderHook(() => useDecisionModel(model))
    expect(result.current.active).toBe(true)
    expect(result.current.running).toBe(true)
    expect(result.current.state).toBe('starting')

    const other = renderHook(() => useDecisionModel({ ...model, id: 'other' }))
    expect(other.result.current.active).toBe(false)
    expect(other.result.current.state).toBeNull()
  })

  it('is not running once stopped, though still the configured model', () => {
    useDecisionStore.setState({
      config: {
        enabled: false,
        model_path: 'decision/models/laya',
      } as DecisionConfig,
      status: { state: 'disabled' } as never,
    })
    const { result } = renderHook(() => useDecisionModel(model))
    expect(result.current.active).toBe(true)
    expect(result.current.running).toBe(false)
    expect(result.current.state).toBeNull()
  })

  it('reads progress from the download panel row', () => {
    useDownloadStore.setState({
      downloads: {
        'decision-laya': {
          id: 'decision-laya',
          name: 'decision-laya',
          progress: 0.5,
          current: 50,
          total: 100,
        } as never,
      },
    })
    const { result } = renderHook(() => useDecisionModel(model))
    expect(result.current.downloading).toBe(true)
    expect(result.current.progress).toBe(0.5)
    expect(result.current.totalBytes).toBe(100)
  })

  it('resumes a cancelled download and re-checks the disk afterwards', async () => {
    useDownloadStore.setState({
      resumableDownloads: new Set(['decision-laya']),
    })
    const { result } = renderHook(() => useDecisionModel(model))
    await act(async () => {
      await result.current.download()
    })
    expect(lib.downloadDecisionModel).toHaveBeenCalledWith(model, {
      resume: true,
    })
    expect(useDecisionStore.getState().installed.laya).toBe(true)
    expect(useDownloadStore.getState().localDownloadingModels.size).toBe(0)
  })

  it('keeps a failed download resumable', async () => {
    lib.downloadDecisionModel.mockRejectedValue(new Error('HTTP status 500'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useDecisionModel(model))
    await act(async () => {
      await result.current.download()
    })
    expect(
      useDownloadStore.getState().resumableDownloads.has('decision-laya')
    ).toBe(true)
  })

  it('cancels the transfer and keeps the download resumable', () => {
    const { result } = renderHook(() => useDecisionModel(model))
    result.current.cancelDownload()
    expect(cancelTransfer).toHaveBeenCalledWith('decision-laya')
    expect(
      useDownloadStore.getState().resumableDownloads.has('decision-laya')
    ).toBe(true)
  })

  it('raises the Local API Server once the model is up', async () => {
    const { result } = renderHook(() => useDecisionModel(model))
    await act(async () => {
      await result.current.activate()
    })
    expect(lib.activateDecisionModel).toHaveBeenCalledWith(model)
    expect(raiseServer).toHaveBeenCalledOnce()
    expect(useDecisionStore.getState().error).toBeNull()
    expect(useDecisionStore.getState().busy).toBeNull()
  })

  it('keeps the core error when the model does not start', async () => {
    lib.activateDecisionModel.mockRejectedValue({
      code: 'DECISION_ENGINE_UNSUPPORTED',
      message: 'old engine',
    })
    const { result } = renderHook(() => useDecisionModel(model))
    await act(async () => {
      await result.current.activate()
    })
    expect(raiseServer).not.toHaveBeenCalled()
    expect(useDecisionStore.getState().error?.code).toBe(
      'DECISION_ENGINE_UNSUPPORTED'
    )
  })

  it('removes with the current config and refreshes the install state', async () => {
    const config = { model_path: 'decision/models/laya' } as DecisionConfig
    useDecisionStore.setState({ config, installed: { laya: true } })
    lib.isDecisionModelInstalled.mockResolvedValue(false)
    const { result } = renderHook(() => useDecisionModel(model))
    await act(async () => {
      await result.current.remove()
    })
    expect(lib.deleteDecisionModel).toHaveBeenCalledWith(model, config)
    expect(result.current.installed).toBe(false)
  })

  it('stops the model', async () => {
    const { result } = renderHook(() => useDecisionModel(model))
    await act(async () => {
      await result.current.stop()
    })
    expect(lib.stopDecisionModel).toHaveBeenCalledOnce()
    expect(useDecisionStore.getState().config?.model_path).toBe(
      'decision/models/laya'
    )
    expect(useDecisionStore.getState().busy).toBeNull()
  })
})
