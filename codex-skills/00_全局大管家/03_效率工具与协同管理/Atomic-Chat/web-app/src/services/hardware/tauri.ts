/**
 * Tauri Hardware Service - Desktop implementation
 *
 * Hardware facts (CPU, GPUs, memory) come from the atomic-chat-core probe:
 * the core is the only source of hardware facts for backend decisions and for
 * this settings surface (ADR 2026-09-27-the-core-is-the-only-source-of-hardware-facts-and-backend-decisions).
 * `tauri-plugin-hardware` stays for the System Monitor usage poll only.
 */

import { invoke } from '@tauri-apps/api/core'
import type { HardwareData, SystemUsage, DeviceList } from './types'
import { DefaultHardwareService } from './default'
import { LOCAL_LLAMACPP_EXTENSION_NAME } from '@/lib/utils'
import { PlatformFeatures } from '@/lib/platform/const'
import { PlatformFeature } from '@/lib/platform/types'

/** The core's `GET /atomic/v1/hardware/info` and `POST /atomic/v1/hardware/refresh` body. */
interface CoreHardwareInfo {
  info: Omit<HardwareData, 'source' | 'probed_at'>
  source: 'probe' | 'override'
  probed_at: number
  warnings: string[]
}

export class TauriHardwareService extends DefaultHardwareService {
  async getHardwareInfo(): Promise<HardwareData | null> {
    // Mobile has neither the core nor the hardware plugin.
    if (!PlatformFeatures[PlatformFeature.HARDWARE_MONITORING]) return null
    const { info, source, probed_at } = await invoke<CoreHardwareInfo>(
      'atomic_core_call',
      { method: 'GET', path: '/hardware/info', body: null }
    )
    return { ...info, source, probed_at }
  }

  async getSystemUsage(): Promise<SystemUsage | null> {
    return invoke('plugin:hardware|get_system_usage') as Promise<SystemUsage>
  }

  async getLlamacppDevices(): Promise<DeviceList[]> {
    // Use the OS-appropriate extension name instead of a hardcoded
    // '@janhq/llamacpp-extension'. On Windows and Linux the turboquant
    // `@janhq/llamacpp-extension` is excluded from the installer bundle
    // (see `package.json :: build:extensions:{win32,linux}` and ADRs
    // 2026-05-22 / 2026-05-28), so only `@janhq/llamacpp-upstream-extension`
    // is registered. Without this, the GPU panel showed the misleading
    // "llamacpp extension not found" error on Windows and Linux even when
    // the upstream extension was running and the backend was on GPU.
    const extensionManager = window.core.extensionManager
    const llamacppExtension = extensionManager.getByName(
      LOCAL_LLAMACPP_EXTENSION_NAME
    )

    if (!llamacppExtension) {
      throw new Error(
        `llama.cpp extension '${LOCAL_LLAMACPP_EXTENSION_NAME}' not found`
      )
    }

    return llamacppExtension.getDevices()
  }

  async setActiveGpus(data: { gpus: number[] }): Promise<void> {
    // TODO: llama.cpp extension should handle this
    console.log(data)
  }

  async refreshHardwareInfo(): Promise<void> {
    // The plugin refresh re-enumerates the usage rows (GPU uuids, Linux NVML
    // reset after resume); the core re-probes the facts. A core failure must
    // never block the usage refresh, so it is logged and swallowed.
    await invoke('plugin:hardware|refresh_system_info')
    try {
      await invoke('atomic_core_call', {
        method: 'POST',
        path: '/hardware/refresh',
        body: null,
      })
    } catch (error) {
      console.warn('Failed to refresh hardware facts in the core:', error)
    }
  }
}
