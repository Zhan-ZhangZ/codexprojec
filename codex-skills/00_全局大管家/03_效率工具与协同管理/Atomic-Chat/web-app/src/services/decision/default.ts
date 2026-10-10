/**
 * Default Decision Service — the no-op used on web and mobile, where there is
 * no core to run a decision model. `isSupported()` is false so the UI never
 * offers the page, and every call rejects in case something reaches it anyway.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import type {
  DecisionConfig,
  DecisionConfigAnswer,
  DecisionDecideRequest,
  DecisionEvent,
  DecisionOutcome,
  DecisionService,
  DecisionStatus,
} from './types'

export const DECISION_UNSUPPORTED =
  'Decision models are not available on this platform.'

export class DefaultDecisionService implements DecisionService {
  isSupported(): boolean {
    return false
  }

  async getStatus(): Promise<DecisionStatus> {
    throw new Error(DECISION_UNSUPPORTED)
  }

  async getConfig(): Promise<DecisionConfigAnswer> {
    throw new Error(DECISION_UNSUPPORTED)
  }

  async setConfig(_patch: Partial<DecisionConfig>): Promise<DecisionConfigAnswer> {
    throw new Error(DECISION_UNSUPPORTED)
  }

  async load(): Promise<DecisionStatus> {
    throw new Error(DECISION_UNSUPPORTED)
  }

  async unload(): Promise<DecisionStatus> {
    throw new Error(DECISION_UNSUPPORTED)
  }

  async decide(_request: DecisionDecideRequest): Promise<DecisionOutcome> {
    throw new Error(DECISION_UNSUPPORTED)
  }

  subscribe(_handler: (event: DecisionEvent) => void): () => void {
    return () => {}
  }
}
