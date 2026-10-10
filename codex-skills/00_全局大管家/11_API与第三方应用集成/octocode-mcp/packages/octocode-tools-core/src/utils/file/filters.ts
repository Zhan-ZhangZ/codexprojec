export {
  DISCOVERY_IGNORED_FILE_EXTENSIONS as IGNORED_FILE_EXTENSIONS,
  DISCOVERY_IGNORED_FILE_NAMES as IGNORED_FILE_NAMES,
  DISCOVERY_IGNORED_FOLDER_NAMES as IGNORED_FOLDER_NAMES,
  getDiscoveryExtension as getExtension,
  shouldIgnoreDiscoveryDir as shouldIgnoreDir,
  shouldIgnoreDiscoveryFile as shouldIgnoreFile,
} from '@octocodeai/octocode-engine/security';
export type { DiscoveryExtensionOptions as GetExtensionOptions } from '@octocodeai/octocode-engine/security';
