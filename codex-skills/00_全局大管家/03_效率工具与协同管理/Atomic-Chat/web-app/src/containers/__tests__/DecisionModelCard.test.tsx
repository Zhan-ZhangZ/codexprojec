import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DecisionModelState } from '@/hooks/useDecisionModel'

const state = vi.hoisted(() => ({ current: {} as DecisionModelState }))

vi.mock('@/hooks/useDecisionModel', () => ({
  useDecisionModel: () => state.current,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    className,
    children,
  }: {
    to: string
    className?: string
    children: React.ReactNode
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('@/i18n/react-i18next-compat', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

import { getBaselineDecisionCatalog } from '@/services/decision-catalog-registry'
import { useDecisionStore } from '@/stores/decision-store'
import DecisionModelCard, { DecisionModelStatus } from '../DecisionModelCard'

const model = getBaselineDecisionCatalog().models[0]

const modelState = (
  overrides: Partial<DecisionModelState>
): DecisionModelState => ({
  installed: true,
  downloading: false,
  progress: 0,
  currentBytes: 0,
  totalBytes: 0,
  active: false,
  running: false,
  state: null,
  busy: false,
  download: vi.fn(),
  cancelDownload: vi.fn(),
  remove: vi.fn(),
  activate: vi.fn(),
  stop: vi.fn(),
  ...overrides,
})

describe('DecisionModelCard', () => {
  beforeEach(() => {
    useDecisionStore.setState({ busy: null })
  })

  it('starts an installed model where models are run', async () => {
    state.current = modelState({})
    render(<DecisionModelCard model={model} />)

    await userEvent.click(
      screen.getByRole('button', { name: 'settings:decision.start' })
    )
    expect(state.current.activate).toHaveBeenCalledOnce()
    expect(
      screen.queryByRole('button', { name: 'hub:open' })
    ).not.toBeInTheDocument()
  })

  it('turns Start into a red Stop once the model runs, as chat models do', async () => {
    state.current = modelState({ running: true, state: 'starting' })
    render(<DecisionModelCard model={model} />)

    const stop = screen.getByRole('button', { name: 'settings:decision.stop' })
    expect(stop).toHaveAttribute('data-variant', 'destructive')
    expect(
      screen.queryByRole('button', { name: 'settings:decision.start' })
    ).not.toBeInTheDocument()
    await userEvent.click(stop)
    expect(state.current.stop).toHaveBeenCalledOnce()
  })

  it('offers Open and removal in place of Start once installed, given onOpen', async () => {
    state.current = modelState({ running: true, state: 'starting' })
    const onOpen = vi.fn()
    render(<DecisionModelCard model={model} onOpen={onOpen} />)

    await userEvent.click(screen.getByRole('button', { name: 'hub:open' }))
    expect(onOpen).toHaveBeenCalledOnce()
    expect(
      screen.getByRole('button', { name: 'settings:decision.remove' })
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: /settings:decision\.(start|stop)/ })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('settings:decision.state.starting')
    ).not.toBeInTheDocument()
  })

  it('says a served model is available in the API, and what a starting one is doing', () => {
    state.current = modelState({ running: true, state: 'ready' })
    const { rerender } = render(<DecisionModelStatus model={model} />)
    expect(
      screen.getByRole('link', { name: 'settings:decision.availableInApi' })
    ).toHaveAttribute('href', '/api/')

    state.current = modelState({ running: true, state: 'starting' })
    rerender(<DecisionModelStatus model={model} key="starting" />)
    expect(screen.getByText('settings:decision.state.starting')).toBeVisible()
    expect(
      screen.queryByText('settings:decision.availableInApi')
    ).not.toBeInTheDocument()

    state.current = modelState({ running: false, state: null })
    rerender(<DecisionModelStatus model={model} key="stopped" />)
    expect(
      screen.queryByText(/settings:decision\.(availableInApi|state)/)
    ).not.toBeInTheDocument()
  })

  it('downloads a model that is not on disk, with or without onOpen', async () => {
    state.current = modelState({ installed: false })
    render(<DecisionModelCard model={model} onOpen={vi.fn()} />)

    expect(
      screen.queryByRole('button', { name: 'hub:open' })
    ).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'hub:download' }))
    expect(state.current.download).toHaveBeenCalledOnce()
  })
})
