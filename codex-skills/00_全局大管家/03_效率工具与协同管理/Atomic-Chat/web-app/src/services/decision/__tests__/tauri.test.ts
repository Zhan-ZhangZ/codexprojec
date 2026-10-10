import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockIPC } from '@tauri-apps/api/mocks'
import type { InvokeArgs } from '@tauri-apps/api/core'

// The official IPC mock swallows `plugin:event|unlisten`, so the detach path
// can only be observed by stubbing the event module itself.
const listen = vi.fn()
vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => listen(...args),
}))

const { TauriDecisionService, STATE_EVENT, ERROR_EVENT, RESET_EVENT } =
  await import('../tauri')
const { DefaultDecisionService } = await import('../default')
type DecisionEvent = import('../types').DecisionEvent
type DecisionStatus = import('../types').DecisionStatus

const status: DecisionStatus = {
  state: 'ready',
  enabled: true,
  model_path: '/data/decision/models/laya',
  engine: null,
  pid: 42,
  port: 51000,
  props: { api_version: 1, source: 'checkpoint-dir' },
  capabilities: ['decision', 'systemone'],
  restarts: 0,
  error: null,
  since: 1,
}

type Call = { method: string; path: string; body: unknown }

describe('TauriDecisionService commands', () => {
  let calls: Call[]

  beforeEach(() => {
    calls = []
    mockIPC((command: string, args?: InvokeArgs) => {
      expect(command).toBe('atomic_core_call')
      const call = args as Call
      calls.push(call)
      switch (`${call.method} ${call.path}`) {
        case 'GET /decision/status':
        case 'POST /decision/load':
        case 'POST /decision/unload':
          return status
        case 'GET /decision/config':
        case 'PUT /decision/config':
          return { config: { enabled: true }, status }
        case 'POST /decision/decide':
          return { unavailable: true, reason: 'starting', message: 'm', elapsed_ms: 0 }
        default:
          throw new Error(`unexpected ${call.method} ${call.path}`)
      }
    })
  })

  it('reaches every control route under /decision with snake_case bodies', async () => {
    const service = new TauriDecisionService()
    expect(service.isSupported()).toBe(true)
    expect(await service.getStatus()).toEqual(status)
    expect((await service.getConfig()).status).toEqual(status)
    await service.setConfig({ enabled: true, model_path: 'decision/models/laya', model_id: 'laya' })
    expect(await service.load()).toEqual(status)
    await service.unload()
    const request = { state: { text: 'hi' }, questions: { q: { type: 'noul' as const, instructions: 'Refund?' } } }
    expect(await service.decide(request)).toMatchObject({ unavailable: true, reason: 'starting' })

    expect(calls).toEqual([
      { method: 'GET', path: '/decision/status', body: null },
      { method: 'GET', path: '/decision/config', body: null },
      {
        method: 'PUT',
        path: '/decision/config',
        body: { enabled: true, model_path: 'decision/models/laya', model_id: 'laya' },
      },
      { method: 'POST', path: '/decision/load', body: null },
      { method: 'POST', path: '/decision/unload', body: null },
      { method: 'POST', path: '/decision/decide', body: request },
    ])
  })
})

describe('TauriDecisionService.subscribe', () => {
  beforeEach(() => {
    // A bare `listen.mockReset()` would return the mock, which Vitest runs as
    // a cleanup callback — and a pending `listen()` promise then hangs the hook.
    listen.mockReset()
  })

  it('turns the relayed state, error and snapshot events into decision events', async () => {
    const handlers = new Map<string, (event: { payload: unknown }) => void>()
    listen.mockImplementation(
      async (name: string, handler: (event: { payload: unknown }) => void) => {
        handlers.set(name, handler)
        return () => {}
      }
    )
    const received: DecisionEvent[] = []
    new TauriDecisionService().subscribe((event) => received.push(event))
    await Promise.resolve()

    expect([...handlers.keys()]).toEqual([STATE_EVENT, ERROR_EVENT, RESET_EVENT])
    handlers.get(STATE_EVENT)!({ payload: status })
    handlers.get(ERROR_EVENT)!({ payload: { code: 'MODEL_LOAD_FAILED', message: 'boom' } })
    handlers.get(RESET_EVENT)!({ payload: { generation: 2 } })
    expect(received).toEqual([
      { type: 'state', status },
      { type: 'error', error: { code: 'MODEL_LOAD_FAILED', message: 'boom' } },
      { type: 'reset' },
    ])
  })

  it('detaches each listener once, even when unsubscribed twice', async () => {
    const unlistens = [vi.fn(), vi.fn(), vi.fn()]
    let index = 0
    listen.mockImplementation(async () => unlistens[index++])

    const unsubscribe = new TauriDecisionService().subscribe(() => {})
    unsubscribe()
    unsubscribe()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(unlistens.map((fn) => fn.mock.calls.length)).toEqual([1, 1, 1])
  })
})

describe('DefaultDecisionService', () => {
  it('is unsupported, rejects every call and subscribes to nothing', async () => {
    const service = new DefaultDecisionService()
    expect(service.isSupported()).toBe(false)
    await expect(service.getStatus()).rejects.toThrow(/not available/)
    await expect(service.getConfig()).rejects.toThrow(/not available/)
    await expect(service.setConfig({ enabled: false })).rejects.toThrow(/not available/)
    await expect(service.load()).rejects.toThrow(/not available/)
    await expect(service.unload()).rejects.toThrow(/not available/)
    await expect(service.decide({ state: {}, questions: {} })).rejects.toThrow(/not available/)
    expect(service.subscribe(() => {})()).toBeUndefined()
  })
})
