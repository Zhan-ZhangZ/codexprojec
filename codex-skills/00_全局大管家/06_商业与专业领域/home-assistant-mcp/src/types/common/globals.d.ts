declare global {
  const Buffer: typeof import('buffer').Buffer;
  const process: NodeJS.Process;
  const global: typeof globalThis;
  const setImmediate: (callback: (...args: unknown[]) => void, ...args: unknown[]) => NodeJS.Immediate;
  const WorkerGlobalScope: typeof globalThis;
}

export {};
