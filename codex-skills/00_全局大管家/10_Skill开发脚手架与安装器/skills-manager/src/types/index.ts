// ─── Agent Types ─────────────────────────────────────────────────────────────

export interface AgentWithStatus {
  id: string;
  display_name: string;
  category: string;
  global_skills_dir: string;
  project_skills_dir?: string;
  icon_name?: string;
  is_detected: boolean;
  is_builtin: boolean;
  is_enabled: boolean;
  supports_agents_alias?: boolean;
  adapter_status?: "verified" | "path_adapter" | "unverified" | string;
  native_install_supported?: boolean;
}

export interface CustomAgentConfig {
  id?: string;
  display_name: string;
  category?: string;
  global_skills_dir: string;
}

export interface UpdateCustomAgentConfig {
  display_name: string;
  category?: string;
  global_skills_dir: string;
}

// ─── Scan Types ───────────────────────────────────────────────────────────────

export interface ScanResult {
  total_skills: number;
  agents_scanned: number;
  skills_by_agent: Record<string, number>;
}

export type ClaudeSourceKind = "user" | "plugin" | "compatibility";

export interface ScannedSkill {
  id: string;
  row_id?: string;
  name: string;
  description?: string;
  file_path: string;
  dir_path: string;
  link_type: string;
  symlink_target?: string;
  is_central: boolean;
  source_kind?: ClaudeSourceKind | null;
  source_root?: string | null;
  is_read_only?: boolean;
  conflict_group?: string | null;
  conflict_count?: number;
}

// ─── Skill Types ──────────────────────────────────────────────────────────────

export interface Skill {
  id: string;
  name: string;
  description?: string;
  file_path: string;
  canonical_path?: string;
  is_central: boolean;
  source?: string;
  content?: string;
  scanned_at: string;
}

export interface SkillInstallation {
  skill_id: string;
  agent_id: string;
  installed_path: string;
  link_type: string;
  symlink_target?: string;
  /** ISO 8601 timestamp of when the skill was first installed. */
  installed_at?: string;
}

export interface SkillDetail extends Omit<Skill, "content"> {
  row_id?: string;
  dir_path?: string;
  source_kind?: ClaudeSourceKind | null;
  source_root?: string | null;
  is_read_only?: boolean;
  conflict_group?: string | null;
  conflict_count?: number;
  /** Agent IDs that can see this central skill through a read-only compatibility root. */
  read_only_agents?: string[];
  installations: SkillInstallation[];
  /** Collections this skill currently belongs to. */
  collections?: Collection[];
}

export interface SkillDirectoryNode {
  name: string;
  path: string;
  relative_path: string;
  is_dir: boolean;
  children: SkillDirectoryNode[];
}

export interface SkillDetailRequest {
  skillId: string;
  agentId?: string;
  rowId?: string;
}

export interface SkillWithLinks {
  id: string;
  name: string;
  description?: string;
  file_path: string;
  canonical_path?: string;
  is_central: boolean;
  source?: string;
  scanned_at: string;
  created_at?: string;
  updated_at?: string;
  /** Agent IDs that currently have this skill installed (symlink or copy). */
  linked_agents: string[];
  /** Agent IDs that can see this skill through a read-only compatibility root. */
  read_only_agents?: string[];
  primary_category?: string | null;
  tags?: string[];
  classification_source?: string | null;
  update_status?: string | null;
  local_modified?: boolean;
  /** Number of distinct managed local projects currently using this skill. */
  project_usage_count?: number;
}

// ─── Managed projects, taxonomy, and updates ─────────────────────────────────

export interface ManagedProject {
  id: string;
  path: string;
  normalized_path: string;
  display_name: string;
  is_active: boolean;
  added_at: string;
  updated_at: string;
  last_scanned_at?: string | null;
  last_scan_status: string;
  last_scan_error?: string | null;
  is_git_repository?: boolean;
  access_status?: "available" | "unavailable" | string;
  detected_platforms?: string;
  skill_count: number;
}

export interface ProjectSkillInstance {
  id: string;
  project_id: string;
  skill_id: string;
  name: string;
  description?: string | null;
  dir_path: string;
  file_path: string;
  relative_path: string;
  detected_platform: string;
  content_hash: string;
  instance_kind: "native" | "managed_symlink" | "managed_copy" | string;
  scanned_at: string;
}

export type ProjectInstallResolution = "skip" | "replace" | "rename";

export interface ProjectInstallRequest {
  skill_id: string;
  resolution?: ProjectInstallResolution;
  renamed_skill_id?: string;
}

export interface ProjectInstallPreviewItem {
  skill_id: string;
  target_skill_id: string;
  target_path: string;
  source_hash: string;
  existing_hash?: string | null;
  status: string;
  is_managed: boolean;
}

export interface ProjectInstallResultItem {
  skill_id: string;
  target_skill_id: string;
  target_path: string;
  method?: string | null;
  status: string;
  error?: string | null;
}

export interface ProjectBatchInstallResult {
  succeeded: ProjectInstallResultItem[];
  skipped: ProjectInstallResultItem[];
  conflicted: ProjectInstallResultItem[];
  failed: ProjectInstallResultItem[];
}

export interface CentralImportResult {
  skill_id: string;
  status: "imported" | "deduplicated";
  content_hash: string;
  canonical_path: string;
}

export interface SkillCategory {
  id: string;
  label_key: string;
}

export interface SkillTaxonomy {
  skill_id: string;
  primary_category: string;
  tags: string[];
  classification_source: "auto" | "manual" | "ai" | string;
  confidence: number;
  updated_at: string;
}

export interface SkillUpdateStatus {
  skill_id: string;
  source_type: string;
  status:
    | "untracked"
    | "up_to_date"
    | "update_available"
    | "local_modified"
    | "conflict"
    | "check_failed"
    | string;
  current_hash?: string | null;
  installed_hash?: string | null;
  remote_hash?: string | null;
  remote_revision?: string | null;
  local_modified: boolean;
  last_checked_at?: string | null;
  error?: string | null;
}

export interface SkillUpdateResult {
  skill_id: string;
  status: string;
  previous_hash?: string | null;
  installed_hash?: string | null;
  copies_marked_for_sync: number;
  error?: string | null;
}

export interface SkillUpdateBatchResult {
  succeeded: SkillUpdateResult[];
  skipped: SkillUpdateResult[];
  conflicted: SkillUpdateResult[];
  failed: SkillUpdateResult[];
}

export interface BatchInstallResult {
  succeeded: string[];
  failed: Array<{ agent_id: string; error: string }>;
}

export interface DeleteCentralSkillOptions {
  cascadeUninstall: boolean;
}

export interface DeleteCentralSkillResult {
  skillId: string;
  removedCanonicalPath: string;
  uninstalledAgents: string[];
  skippedReadOnlyAgents: string[];
}

export interface CentralSkillBundle {
  name: string;
  relativePath: string;
  path: string;
  isSymlink: boolean;
  skillCount: number;
  linkedAgentCount: number;
  readOnlyAgentCount: number;
}

export interface CentralSkillBundleDeletePreview {
  bundle: CentralSkillBundle;
  skills: SkillWithLinks[];
  affectedAgents: string[];
  skippedReadOnlyAgents: string[];
}

export interface CentralSkillBundleDetail {
  bundle: CentralSkillBundle;
  skills: SkillWithLinks[];
}

export interface DeleteCentralSkillBundleOptions {
  cascadeUninstall: boolean;
}

export interface DeleteCentralSkillBundleResult {
  relativePath: string;
  removedBundlePath: string;
  removedKind: "directory" | "symlink" | string;
  removedSkillIds: string[];
  uninstalledAgents: string[];
  skippedReadOnlyAgents: string[];
}

// ─── Collection Types ─────────────────────────────────────────────────────────

export interface Collection {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CollectionWithSkills extends Collection {
  skill_ids: string[];
}

export interface CollectionDetail extends Collection {
  /** Full skill objects that are members of this collection. */
  skills: Skill[];
}

export interface CollectionBatchInstallResult {
  succeeded: string[];
  failed: Array<{ agent_id: string; error: string }>;
}

// ─── Settings Types ───────────────────────────────────────────────────────────

export interface ScanDirectory {
  id: number;
  path: string;
  label?: string;
  is_active: boolean;
  is_builtin: boolean;
  added_at: string;
}

// ─── Discover Types ───────────────────────────────────────────────────────────

export interface ScanRoot {
  path: string;
  label: string;
  exists: boolean;
  enabled: boolean;
}

export interface ObsidianVault {
  id: string;
  name: string;
  path: string;
  skill_count: number;
}

export interface DiscoveredSkill {
  id: string;
  name: string;
  description?: string;
  file_path: string;
  dir_path: string;
  platform_id: string;
  platform_name: string;
  project_path: string;
  project_name: string;
  is_already_central: boolean;
}

export interface DiscoveredProject {
  project_path: string;
  project_name: string;
  skills: DiscoveredSkill[];
}

export interface DiscoverResult {
  total_projects: number;
  total_skills: number;
  projects: DiscoveredProject[];
}

export interface DiscoverProgressPayload {
  percent: number;
  current_path: string;
  skills_found: number;
  projects_found: number;
}

export interface DiscoverFoundPayload {
  project: DiscoveredProject;
}

export interface DiscoverCompletePayload {
  total_projects: number;
  total_skills: number;
}

export type ImportTarget =
  | { type: "central" }
  | { type: "platform"; agent_id: string };

export interface DiscoverImportResult {
  skill_id: string;
  target: string;
}

// ─── Marketplace Types ───────────────────────────────────────────────────────

export interface SkillRegistry {
  id: string;
  name: string;
  source_type: "github" | "http_json";
  url: string;
  normalized_url?: string | null;
  is_builtin: boolean;
  is_enabled: boolean;
  last_synced: string | null;
  last_attempted_sync?: string | null;
  last_sync_status?: "never" | "success" | "error";
  last_sync_error?: string | null;
  cache_updated_at?: string | null;
  cache_expires_at?: string | null;
  etag?: string | null;
  last_modified?: string | null;
  created_at: string;
}

export interface MarketplaceSkill {
  id: string;
  registry_id: string;
  name: string;
  description?: string;
  download_url: string;
  is_installed: boolean;
  synced_at: string;
  cache_updated_at?: string | null;
}

export interface GitHubRepoRef {
  owner: string;
  repo: string;
  branch: string;
  normalizedUrl: string;
}

export interface GitHubSkillConflict {
  existingSkillId: string;
  existingName: string;
  existingCanonicalPath?: string | null;
  proposedSkillId: string;
  proposedName: string;
}

export interface GitHubSkillPreview {
  sourcePath: string;
  skillId: string;
  skillName: string;
  description?: string | null;
  rootDirectory: string;
  skillDirectoryName: string;
  downloadUrl: string;
  conflict?: GitHubSkillConflict | null;
}

export interface GitHubRepoPreview {
  repo: GitHubRepoRef;
  skills: GitHubSkillPreview[];
}

export type DuplicateResolution = "overwrite" | "skip" | "rename";

export interface GitHubSkillImportSelection {
  sourcePath: string;
  resolution: DuplicateResolution;
  renamedSkillId?: string | null;
}

export interface ImportedGitHubSkillSummary {
  sourcePath: string;
  originalSkillId: string;
  importedSkillId: string;
  skillName: string;
  targetDirectory: string;
  resolution: DuplicateResolution;
}

export interface GitHubRepoImportResult {
  repo: GitHubRepoRef;
  importedSkills: ImportedGitHubSkillSummary[];
  skippedSkills: string[];
  package?: ImportedGitHubPackageSummary | null;
}

export interface MarketplaceTrendItem {
  source: "github" | "x" | "huggingface" | string;
  candidate_id: string;
  name: string;
  source_url: string;
  description?: string | null;
  stars?: number | null;
  forks?: number | null;
  likes?: number | null;
  downloads?: number | null;
  engagement?: number | null;
  skill_count: number;
  captured_at: string;
  window_days: 7 | 30;
  trend_value: number;
  is_estimated: boolean;
}

export interface TrendSourceRefreshResult {
  source: string;
  status: "success" | "error" | "not_configured" | string;
  captured: number;
  error?: string | null;
}

export interface ImportedGitHubPackageSummary {
  packageId: string;
  packageName: string;
  snapshotPath: string;
  contentHash: string;
  childSkillIds: string[];
}

export interface SkillPackageSummary {
  id: string;
  name: string;
  description?: string | null;
  source_type: string;
  repository_url: string;
  git_ref?: string | null;
  installed_revision?: string | null;
  remote_revision?: string | null;
  snapshot_path: string;
  content_hash: string;
  license?: string | null;
  update_status: string;
  check_error?: string | null;
  imported_at: string;
  updated_at: string;
  last_checked_at?: string | null;
  child_skill_count: number;
  enabled_child_count: number;
  has_native_adapters: boolean;
  has_hooks: boolean;
}

export interface PackageSkill {
  package_id: string;
  skill_id: string;
  relative_path: string;
  default_enabled: boolean;
  is_required: boolean;
  sort_order: number;
  name: string;
  description?: string | null;
}

export interface PackagePlatformAdapter {
  package_id: string;
  agent_id: string;
  adapter_kind: string;
  manifest_path?: string | null;
  has_hooks: boolean;
  risk_level: string;
  is_verified: boolean;
}

export interface SkillPackageDetail {
  package: SkillPackageSummary;
  skills: PackageSkill[];
  adapters: PackagePlatformAdapter[];
}

export type GitHubImportProgressPhase = "preparing" | "writing" | "finalizing";

export interface GitHubImportProgressPayload {
  phase: GitHubImportProgressPhase;
  currentSkill?: string | null;
  currentPath?: string | null;
  completedFiles: number;
  totalFiles: number;
  completedBytes: number;
  totalBytes: number;
}
