/**
 * Tauri Decision Service — desktop implementation.
 *
 * A thin wrapper over the core's `/atomic/v1/decision/*` routes, reached
 * through the Rust relay (`atomic_core_call`). A failure rejects with the
 * relay's plain `{code, message, details?}` object, untouched. Events arrive
 * as the relayed `atomic-core://decision:*` events.
 */

import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

import { createSafeUnlisten } from '@/lib/tauriEvent'

import { DefaultDecisionService } from './default'
import type {
  DecisionConfig,
  DecisionConfigAnswer,
  DecisionCoreError,
  DecisionDecideRequest,
  DecisionEvent,
  DecisionOutcome,
  DecisionStatus,
} from './types'

/** The core's control-route prefix for the decision model. */
export const DECISION_PREFIX = '/decision'

export const STATE_EVENT = 'atomic-core://decision:state'
export const ERROR_EVENT = 'atomic-core://decision:error'
/** The relay's snapshot: a core generation attached. */
export const RESET_EVENT = 'atomic-core://snapshot'

type Method = 'GET' | 'POST' | 'PUT'

export function coreCall<T>(
  method: Method,
  path: string,
  body: unknown = null
): Promise<T> {
  return invoke<T>('atomic_core_call', {
    method,
    path: `${DECISION_PREFIX}${path}`,
    body,
  })
}

export class TauriDecisionService extends DefaultDecisionService {
  override isSupported(): boolean {
    return true
  }

  override async getStatus(): Promise<DecisionStatus> {
    return coreCall<DecisionStatus>('GET', '/status')
  }

  override async getConfig(): Promise<DecisionConfigAnswer> {
    return coreCall<DecisionConfigAnswer>('GET', '/config')
  }

  override async setConfig(
    patch: Partial<DecisionConfig>
  ): Promise<DecisionConfigAnswer> {
    return coreCall<DecisionConfigAnswer>('PUT', '/config', patch)
  }

  override async load(): Promise<DecisionStatus> {
    return coreCall<DecisionStatus>('POST', '/load')
  }

  override async unload(): Promise<DecisionStatus> {
    return coreCall<DecisionStatus>('POST', '/unload')
  }

  override async decide(
    request: DecisionDecideRequest
  ): Promise<DecisionOutcome> {
    return coreCall<DecisionOutcome>('POST', '/decide', request)
  }

  override subscribe(handler: (event: DecisionEvent) => void): () => void {
    const pending: Promise<UnlistenFn>[] = [
      listen<DecisionStatus>(STATE_EVENT, (event) =>
        handler({ type: 'state', status: event.payload })
      ),
      listen<DecisionCoreError>(ERROR_EVENT, (event) =>
        handler({ type: 'error', error: event.payload })
      ),
      listen(RESET_EVENT, () => handler({ type: 'reset' })),
    ]

    let detached = false
    return () => {
      // A second call (StrictMode, two consumers) must not unlisten the same
      // handler twice: that is what raises Tauri's `handlerId` TypeError.
      if (detached) return
      detached = true
      for (const promise of pending.splice(0)) {
        promise.then((unlisten) => createSafeUnlisten(unlisten)()).catch(() => {})
      }
    }
  }
}
