import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
  redirect: (options: Record<string, unknown>) =>
    Object.assign(new Error('redirect'), { redirect: options }),
}))

import { Route } from '../remote-lan'

describe('/settings/remote-lan', () => {
  it('forwards older links to the API screen, where Remote & LAN lives', () => {
    let thrown: unknown
    try {
      ;(Route as unknown as { beforeLoad: () => void }).beforeLoad()
    } catch (error) {
      thrown = error
    }

    expect((thrown as { redirect: { to: string } }).redirect).toEqual({
      to: '/api/',
    })
  })
})
