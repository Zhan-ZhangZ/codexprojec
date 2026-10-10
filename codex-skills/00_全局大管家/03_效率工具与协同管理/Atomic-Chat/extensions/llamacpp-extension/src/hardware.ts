/**
 * Hardware facts for this extension. Since ADR 2026-09-27 the core measures the machine itself and is
 * the only source backend selection reads, so `getSystemInfo()` asks the core; only usage polling
 * (System Monitor) and the uuid-matched VRAM correction in `getDevices()` still read the plugin.
 */
import { getHardwareInfo } from './adapter/coreRuntime'

export {
  getSystemInfo as getPluginSystemInfo,
  getSystemUsage,
  type SystemInfo,
  type SystemUsage,
} from '../../../src-tauri/plugins/tauri-plugin-hardware/guest-js/index'
import type { SystemInfo } from '../../../src-tauri/plugins/tauri-plugin-hardware/guest-js/index'

export async function getSystemInfo(): Promise<SystemInfo> {
  return (await getHardwareInfo<SystemInfo>()).info
}
