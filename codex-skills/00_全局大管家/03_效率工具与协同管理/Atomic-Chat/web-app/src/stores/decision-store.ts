import { create } from 'zustand'

import { getServiceHub } from '@/hooks/useServiceHub'
import { isDecisionModelInstalled } from '@/lib/decision/models'
import {
  fetchDecisionCatalog,
  getBaselineDecisionCatalog,
  type DecisionCatalog,
} from '@/services/decision-catalog-registry'
import type {
  DecisionConfig,
  DecisionCoreError,
  DecisionStatus,
} from '@/services/decision/types'

/** The relay's rejection, or anything else a call threw, as `{code, message}`. */
export function toDecisionError(error: unknown): DecisionCoreError {
  if (typeof error === 'object' && error !== null) {
    const { code, message, details } = error as Record<string, unknown>
    if (typeof code === 'string' && typeof message === 'string') {
      return { code, message, ...(typeof details === 'string' ? { details } : {}) }
    }
  }
  return {
    code: 'INTERNAL_ERROR',
    message: error instanceof Error ? error.message : String(error),
  }
}

type DecisionStore = {
  catalog: DecisionCatalog
  status: DecisionStatus | null
  config: DecisionConfig | null
  /** Model id → every file of it is on disk. */
  installed: Record<string, boolean>
  /** The last failure of a call or a `decision:error` event, cleared by the next success. */
  error: DecisionCoreError | null
  /** Model id with an activate / stop / remove in flight. */
  busy: string | null
  loadCatalog: (force?: boolean) => Promise<void>
  refresh: () => Promise<void>
  refreshInstalled: () => Promise<void>
  setStatus: (status: DecisionStatus) => void
  setConfig: (config: DecisionConfig) => void
  setError: (error: DecisionCoreError | null) => void
  setBusy: (id: string | null) => void
  /** Follow the core's events; returns the unsubscribe. */
  bind: () => () => void
}

export const useDecisionStore = create<DecisionStore>()((set, get) => ({
  catalog: getBaselineDecisionCatalog(),
  status: null,
  config: null,
  installed: {},
  error: null,
  busy: null,

  loadCatalog: async (force = false) => {
    const { catalog } = await fetchDecisionCatalog({ force })
    set({ catalog })
    await get().refreshInstalled()
  },

  refresh: async () => {
    const decision = getServiceHub().decision()
    if (!decision.isSupported()) return
    try {
      const { config, status } = await decision.getConfig()
      set({ config, status })
    } catch (error) {
      set({ error: toDecisionError(error) })
    }
  },

  refreshInstalled: async () => {
    const { catalog } = get()
    const entries = await Promise.all(
      catalog.models.map(
        async (model) => [model.id, await isDecisionModelInstalled(model)] as const
      )
    )
    set({ installed: Object.fromEntries(entries) })
  },

  setStatus: (status) => set({ status }),
  setConfig: (config) => set({ config }),
  setError: (error) => set({ error }),
  setBusy: (busy) => set({ busy }),

  bind: () => {
    const decision = getServiceHub().decision()
    if (!decision.isSupported()) return () => {}
    const unsubscribe = decision.subscribe((event) => {
      if (event.type === 'state') {
        set({ status: event.status })
        if (event.status.state === 'ready') set({ error: null })
      } else if (event.type === 'error') {
        set({ error: event.error })
      } else {
        void get().refresh()
      }
    })
    void get().refresh()
    void get().loadCatalog()
    return unsubscribe
  },
}))
