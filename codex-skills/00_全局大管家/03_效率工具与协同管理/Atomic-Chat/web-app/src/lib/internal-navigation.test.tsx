import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installInternalNavigationHandler } from './internal-navigation'

const cleanups: (() => void)[] = []
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
})

async function setup(install: boolean) {
  const root = createRootRoute({
    component: () => (
      <>
        <Link to="/settings/general">
          <span>Settings</span>
        </Link>
        <Link to="/api">API</Link>
        <Outlet />
      </>
    ),
  })
  const routeTree = root.addChildren(
    ['/', '/settings/general', '/api'].map((path) =>
      createRoute({
        getParentRoute: () => root,
        path,
        component: () => <div>Page</div>,
      })
    )
  )
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  const escapedLinks = vi.fn()
  // Observe what the opener's window listener sees after React and document.
  const opener = (event: MouseEvent) => {
    if (!event.defaultPrevented) {
      escapedLinks()
      event.preventDefault()
    }
  }
  window.addEventListener('click', opener)
  window.addEventListener('auxclick', opener)
  cleanups.push(() => {
    window.removeEventListener('click', opener)
    window.removeEventListener('auxclick', opener)
  })
  if (install)
    cleanups.push(
      installInternalNavigationHandler((href) => {
        void router.navigate({ href })
      })
    )
  render(<RouterProvider router={router} />)
  await screen.findByText('Settings')
  return { router, escapedLinks }
}

describe('desktop internal navigation', () => {
  it('reproduces a modified internal click escaping the router', async () => {
    const { router, escapedLinks } = await setup(false)
    fireEvent.click(screen.getByText('Settings'), { ctrlKey: true })
    expect(router.state.location.pathname).toBe('/')
    expect(escapedLinks).toHaveBeenCalledOnce()
  })

  it.each([
    ['Settings', '/settings/general', {}],
    ['Settings', '/settings/general', { ctrlKey: true }],
    ['Settings', '/settings/general', { shiftKey: true }],
    ['API', '/api', {}],
    ['API', '/api', { ctrlKey: true }],
    ['API', '/api', { shiftKey: true }],
  ])('keeps %s at %s in the router with %j', async (label, path, modifiers) => {
    const { router, escapedLinks } = await setup(true)
    fireEvent.click(screen.getByText(label), modifiers)
    await waitFor(() => expect(router.state.location.pathname).toBe(path))
    expect(escapedLinks).not.toHaveBeenCalled()
  })

  it('keeps middle clicks inside the app', async () => {
    const { router, escapedLinks } = await setup(true)
    fireEvent(
      screen.getByText('Settings'),
      new MouseEvent('auxclick', {
        button: 1,
        bubbles: true,
        cancelable: true,
      })
    )
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/settings/general')
    )
    expect(escapedLinks).not.toHaveBeenCalled()
  })

  it('preserves the query and fragment of native internal links', () => {
    const navigate = vi.fn()
    cleanups.push(installInternalNavigationHandler(navigate))
    render(
      <a href="/settings/general?from=sidebar#storage" target="_blank">
        Storage
      </a>
    )
    expect(fireEvent.click(screen.getByText('Storage'))).toBe(false)
    expect(navigate).toHaveBeenCalledWith(
      '/settings/general?from=sidebar#storage'
    )
  })

  it.each([
    ['https://example.com/settings/general', false],
    ['http://127.0.0.1:1337/v1', false],
    ['mailto:help@example.com', false],
    ['#storage', false],
    ['/download.txt', true],
  ])(
    'leaves external links, fragments and downloads to their handlers: %s',
    (href, download) => {
      const navigate = vi.fn()
      cleanups.push(installInternalNavigationHandler(navigate))
      render(
        <a href={href} download={download || undefined} target="_blank">
          Link
        </a>
      )
      expect(fireEvent.click(screen.getByText('Link'))).toBe(true)
      expect(navigate).not.toHaveBeenCalled()
    }
  )

  it('ignores malformed URLs without throwing from the global handler', () => {
    const navigate = vi.fn()
    cleanups.push(installInternalNavigationHandler(navigate))
    render(
      <a href="http://[" target="_blank">
        Malformed
      </a>
    )
    expect(fireEvent.click(screen.getByText('Malformed'))).toBe(true)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('respects a click already handled by the component', () => {
    const navigate = vi.fn()
    cleanups.push(installInternalNavigationHandler(navigate))
    render(
      <a href="/api" onClick={(event) => event.preventDefault()}>
        API
      </a>
    )
    expect(fireEvent.click(screen.getByText('API'), { ctrlKey: true })).toBe(
      false
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('removes its listeners when disposed', () => {
    const navigate = vi.fn()
    const dispose = installInternalNavigationHandler(navigate)
    render(
      <a href="/api" target="_blank">
        API
      </a>
    )
    dispose()
    expect(fireEvent.click(screen.getByText('API'), { ctrlKey: true })).toBe(
      true
    )
    expect(navigate).not.toHaveBeenCalled()
  })
})
