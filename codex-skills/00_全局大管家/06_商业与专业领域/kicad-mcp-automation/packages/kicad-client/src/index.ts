// Client interface
export type { IKiCadClient } from './client/interface.js';

// Client implementations
export { MockKiCadClient } from './client/mock-client.js';
export { FileKiCadClient } from './client/file-client.js';

// Types
export type {
  KiCadProject,
  KiCadBoard,
  KiCadComponent,
  KiCadNet,
  DRCResult,
  DRCError,
  DRCWarning,
  ExportOptions,
  ClientOptions,
} from './types/index.js';

// Errors
export {
  KiCadClientError,
  ConnectionError,
  TimeoutError,
  OperationError,
  ProjectError,
} from './errors/index.js';
