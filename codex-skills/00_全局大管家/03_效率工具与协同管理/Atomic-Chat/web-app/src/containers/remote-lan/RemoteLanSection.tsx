import { useLanAccess } from '@/hooks/useLanAccess'
import {
  type LocalApiServerControl,
  useRemoteAccess,
} from '@/hooks/useRemoteAccess'
import { PlatformFeatures } from '@/lib/platform/const'
import { PlatformFeature } from '@/lib/platform/types'
import { cn } from '@/lib/utils'

import { LanAccessCard } from './LanAccessCard'
import { RemoteAccessCard } from './RemoteAccessCard'

/**
 * Remote access and LAN access on the API screen.
 *
 * `server` is the screen's own control, shared with its Start/Stop button:
 * each control re-checks the server on focus and owns a "loading model" flag,
 * and everything that starts or stops the server must agree on both.
 */
export function RemoteLanSection({
  server,
}: {
  server: LocalApiServerControl
}) {
  const remote = useRemoteAccess({ server })
  const lan = useLanAccess({ server, hasApiKey: remote.hasApiKey })
  const remoteAccess = PlatformFeatures[PlatformFeature.REMOTE_ACCESS]

  // Side by side the two cards share the row's height: the shorter one
  // stretches instead of leaving a hole above the metrics.
  return (
    <div
      className={cn('grid grid-cols-1 gap-3', remoteAccess && 'lg:grid-cols-2')}
    >
      {remoteAccess && <RemoteAccessCard remote={remote} />}
      <LanAccessCard lan={lan} />
    </div>
  )
}
