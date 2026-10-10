import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SystemUsage } from '@/hooks/useHardware'
import type { InvokeArgs } from '@tauri-apps/api/core'
import { mockIPC } from '@tauri-apps/api/mocks'

// Desktop by default; the mobile test flips it. Hardware facts come from the
// core, which mobile does not run, so the service answers null there.
const platform = vi.hoisted(() => ({ HARDWARE_MONITORING: true }))
vi.mock('@/lib/platform/const', async () => {
  const { PlatformFeature } = await import('@/lib/platform/types')
  return {
    PlatformFeatures: new Proxy({} as Record<string, boolean>, {
      get: (_target, key) =>
        key === PlatformFeature.HARDWARE_MONITORING
          ? platform.HARDWARE_MONITORING
          : false,
    }),
  }
})

const { TauriHardwareService } = await import('../hardware/tauri')

/** The core's `SystemInfo`: what `GET /hardware/info` wraps in `info`. */
const coreInfo = {
  cpu: {
    arch: 'x86_64',
    core_count: 8,
    extensions: ['SSE', 'AVX'],
    extensions_known: true,
    name: 'Intel Core i7',
  },
  gpus: [
    {
      name: 'NVIDIA RTX 3080',
      total_memory: 10240,
      vendor: 'NVIDIA',
      uuid: 'GPU-uuid-1',
      driver_version: '472.12',
      nvidia_info: { index: 0, compute_capability: '8.6' },
      vulkan_info: {
        index: 0,
        device_id: 123,
        device_type: 'DiscreteGpu',
        api_version: '1.2.0',
      },
    },
  ],
  os_type: 'windows',
  os_name: 'Windows 11',
  total_memory: 16384,
}

describe('TauriHardwareService', () => {
  let hardwareService: InstanceType<typeof TauriHardwareService>
  let ipcHandler: ReturnType<typeof vi.fn>

  beforeEach(() => {
    platform.HARDWARE_MONITORING = true
    ipcHandler = vi.fn()
    mockIPC((command: string, args?: InvokeArgs) => ipcHandler(command, args))
    hardwareService = new TauriHardwareService()
    vi.clearAllMocks()
  })

  describe('getHardwareInfo', () => {
    it('reads the facts from the core and keeps their source and probe time', async () => {
      ipcHandler.mockResolvedValue({
        info: coreInfo,
        source: 'probe',
        probed_at: 1_760_000_000_000,
        warnings: [],
      })

      const result = await hardwareService.getHardwareInfo()

      expect(ipcHandler).toHaveBeenCalledTimes(1)
      expect(ipcHandler).toHaveBeenCalledWith('atomic_core_call', {
        method: 'GET',
        path: '/hardware/info',
        body: null,
      })
      expect(result).toEqual({
        ...coreInfo,
        source: 'probe',
        probed_at: 1_760_000_000_000,
      })
      // The plugin's shape survives, plus the two fields the plugin never had.
      expect(result?.cpu.extensions_known).toBe(true)
      expect(result?.gpus[0].uuid).toBe('GPU-uuid-1')
      expect(result).not.toHaveProperty('warnings')
    })

    it('names an injected override as the source', async () => {
      ipcHandler.mockResolvedValue({
        info: coreInfo,
        source: 'override',
        probed_at: 42,
        warnings: ['override active'],
      })

      const result = await hardwareService.getHardwareInfo()

      expect(result?.source).toBe('override')
      expect(result?.probed_at).toBe(42)
    })

    it('never asks the hardware plugin for facts', async () => {
      ipcHandler.mockResolvedValue({
        info: coreInfo,
        source: 'probe',
        probed_at: 1,
        warnings: [],
      })

      await hardwareService.getHardwareInfo()

      const commands = ipcHandler.mock.calls.map(([command]) => command)
      expect(commands).not.toContain('plugin:hardware|get_system_info')
    })

    it('passes a core refusal through untouched', async () => {
      const refusal = {
        code: 'CORE_UNREACHABLE',
        message: 'the core is not running',
      }
      ipcHandler.mockRejectedValue(refusal)

      await expect(hardwareService.getHardwareInfo()).rejects.toBe(refusal)
    })

    it('answers null on mobile without calling anything', async () => {
      platform.HARDWARE_MONITORING = false

      const result = await hardwareService.getHardwareInfo()

      expect(result).toBeNull()
      expect(ipcHandler).not.toHaveBeenCalled()
    })
  })

  describe('getSystemUsage', () => {
    it('should call invoke with correct command and return system usage data', async () => {
      const mockSystemUsage: SystemUsage = {
        cpu: 45.5,
        used_memory: 8192,
        total_memory: 16384,
        gpus: [
          {
            uuid: 'gpu-uuid-1',
            used_memory: 2048,
            total_memory: 10240,
          },
        ],
      }

      ipcHandler.mockResolvedValue(mockSystemUsage)

      const result = await hardwareService.getSystemUsage()

      expect(ipcHandler).toHaveBeenCalledWith(
        'plugin:hardware|get_system_usage',
        {}
      )
      expect(result).toEqual(mockSystemUsage)
    })

    it('should handle invoke rejection', async () => {
      const mockError = new Error('Failed to get system usage')
      ipcHandler.mockRejectedValue(mockError)

      await expect(hardwareService.getSystemUsage()).rejects.toThrow(
        'Failed to get system usage'
      )
      expect(ipcHandler).toHaveBeenCalledWith(
        'plugin:hardware|get_system_usage',
        {}
      )
    })

    it('should return correct type from invoke', async () => {
      const mockSystemUsage: SystemUsage = {
        cpu: 25.0,
        used_memory: 4096,
        total_memory: 8192,
        gpus: [],
      }

      ipcHandler.mockResolvedValue(mockSystemUsage)

      const result = await hardwareService.getSystemUsage()

      expect(result).toBeDefined()
      expect(typeof result.cpu).toBe('number')
      expect(typeof result.used_memory).toBe('number')
      expect(typeof result.total_memory).toBe('number')
      expect(Array.isArray(result.gpus)).toBe(true)
    })

    it('should handle system usage with multiple GPUs', async () => {
      const mockSystemUsage: SystemUsage = {
        cpu: 35.2,
        used_memory: 12288,
        total_memory: 32768,
        gpus: [
          {
            uuid: 'gpu-uuid-1',
            used_memory: 4096,
            total_memory: 8192,
          },
          {
            uuid: 'gpu-uuid-2',
            used_memory: 6144,
            total_memory: 12288,
          },
        ],
      }

      ipcHandler.mockResolvedValue(mockSystemUsage)

      const result = await hardwareService.getSystemUsage()

      expect(result.gpus).toHaveLength(2)
      expect(result.gpus[0].uuid).toBe('gpu-uuid-1')
      expect(result.gpus[1].uuid).toBe('gpu-uuid-2')
    })
  })

  describe('refreshHardwareInfo', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      warnSpy.mockRestore()
    })

    it('refreshes the plugin usage rows first, then re-probes the core', async () => {
      ipcHandler.mockResolvedValue(undefined)

      await hardwareService.refreshHardwareInfo()

      expect(ipcHandler).toHaveBeenCalledTimes(2)
      expect(ipcHandler).toHaveBeenNthCalledWith(
        1,
        'plugin:hardware|refresh_system_info',
        {}
      )
      expect(ipcHandler).toHaveBeenNthCalledWith(2, 'atomic_core_call', {
        method: 'POST',
        path: '/hardware/refresh',
        body: null,
      })
      expect(warnSpy).not.toHaveBeenCalled()
    })

    it('swallows a core refresh failure so the usage refresh still counts', async () => {
      const refusal = { code: 'CORE_UNREACHABLE', message: 'down' }
      ipcHandler.mockImplementation((command: string) =>
        command === 'atomic_core_call'
          ? Promise.reject(refusal)
          : Promise.resolve(undefined)
      )

      await expect(hardwareService.refreshHardwareInfo()).resolves.toBeUndefined()

      expect(ipcHandler).toHaveBeenCalledTimes(2)
      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to refresh hardware facts in the core:',
        refusal
      )
    })

    it('propagates a plugin refresh failure and does not reach the core', async () => {
      ipcHandler.mockRejectedValue(new Error('plugin gone'))

      await expect(hardwareService.refreshHardwareInfo()).rejects.toThrow(
        'plugin gone'
      )
      expect(ipcHandler).toHaveBeenCalledTimes(1)
      expect(ipcHandler).toHaveBeenCalledWith(
        'plugin:hardware|refresh_system_info',
        {}
      )
    })
  })

  describe('setActiveGpus', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleSpy.mockRestore()
    })

    it('should log the provided GPU data', async () => {
      const gpuData = { gpus: [0, 1, 2] }

      await hardwareService.setActiveGpus(gpuData)

      expect(consoleSpy).toHaveBeenCalledWith(gpuData)
    })

    it('should handle empty GPU array', async () => {
      const gpuData = { gpus: [] }

      await hardwareService.setActiveGpus(gpuData)

      expect(consoleSpy).toHaveBeenCalledWith(gpuData)
    })

    it('should complete successfully', async () => {
      const gpuData = { gpus: [0, 1] }

      await expect(
        hardwareService.setActiveGpus(gpuData)
      ).resolves.toBeUndefined()
    })
  })

  describe('integration tests', () => {
    it('should handle concurrent calls to getHardwareInfo and getSystemUsage', async () => {
      const mockSystemUsage: SystemUsage = {
        cpu: 15.5,
        used_memory: 16384,
        total_memory: 32768,
        gpus: [],
      }

      ipcHandler.mockImplementation((command: string) =>
        command === 'atomic_core_call'
          ? Promise.resolve({
              info: coreInfo,
              source: 'probe',
              probed_at: 7,
              warnings: [],
            })
          : Promise.resolve(mockSystemUsage)
      )

      const [hardwareResult, usageResult] = await Promise.all([
        hardwareService.getHardwareInfo(),
        hardwareService.getSystemUsage(),
      ])

      expect(hardwareResult).toEqual({
        ...coreInfo,
        source: 'probe',
        probed_at: 7,
      })
      expect(usageResult).toEqual(mockSystemUsage)
      expect(ipcHandler).toHaveBeenCalledTimes(2)
      expect(ipcHandler).toHaveBeenNthCalledWith(1, 'atomic_core_call', {
        method: 'GET',
        path: '/hardware/info',
        body: null,
      })
      expect(ipcHandler).toHaveBeenNthCalledWith(
        2,
        'plugin:hardware|get_system_usage',
        {}
      )
    })
  })
})
