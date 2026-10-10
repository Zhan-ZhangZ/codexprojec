import { createFileRoute, redirect } from '@tanstack/react-router'
import { route } from '@/constants/routes'

/**
 * Remote & LAN moved out of Settings onto the API screen, next to the server
 * both cards expose. The URL is still reachable from older links, so it
 * forwards rather than 404s.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute(route.settings.remote_lan as any)({
  beforeLoad: () => {
    throw redirect({ to: route.api.index })
  },
})
