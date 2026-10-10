/** Keep desktop app routes inside the webview before the opener sees them. */
export function installInternalNavigationHandler(
  navigate: (href: string) => void
): () => void {
  const handleClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button > 1) return

    const anchor = event
      .composedPath()
      .find(
        (node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement
      )
    if (!anchor || anchor.hasAttribute('download')) return
    const href = anchor.getAttribute('href')
    if (!href || href.startsWith('#')) return

    let target: URL
    try {
      target = new URL(anchor.href)
    } catch {
      // User-authored content can contain malformed links.
      return
    }
    const current = new URL(window.location.href)
    // URL.origin is "null" for tauri: URLs, so compare protocol and host too.
    if (
      target.protocol !== current.protocol ||
      target.host !== current.host ||
      target.origin !== current.origin
    )
      return

    event.preventDefault()
    navigate(`${target.pathname}${target.search}${target.hash}`)
  }

  // React handles ordinary Link clicks first. Modified clicks and native
  // fallbacks arrive here before plugin-opener's window click listener.
  document.addEventListener('click', handleClick)
  document.addEventListener('auxclick', handleClick)
  return () => {
    document.removeEventListener('click', handleClick)
    document.removeEventListener('auxclick', handleClick)
  }
}
