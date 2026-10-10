use std::collections::{BTreeMap, HashSet};
use std::fs;
use std::io::Read;
use std::path::{Component, Path, PathBuf};

use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{FromRow, Row};
use tauri::State;
use uuid::Uuid;

use crate::db::{self, DbPool};
use crate::path_utils::path_to_string;
use crate::AppState;

use super::linker::{copy_dir_all, create_symlink, remove_symlink_path, symlink_target_path};
use super::scanner::{parse_skill_md, scan_skill_root, ScanDirectoryOptions};
use super::taxonomy::ensure_taxonomy_for_skill;

const HASH_IGNORED_NAMES: &[&str] = &[
    ".DS_Store",
    "Thumbs.db",
    ".skillsmanage-backup",
    ".skillsmanage-stage",
];

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Project {
    pub id: String,
    pub path: String,
    pub normalized_path: String,
    pub display_name: String,
    pub is_active: bool,
    pub added_at: String,
    pub updated_at: String,
    pub last_scanned_at: Option<String>,
    pub last_scan_status: String,
    pub last_scan_error: Option<String>,
    pub is_git_repository: bool,
    pub access_status: String,
    pub detected_platforms: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ProjectSkillInstance {
    pub id: String,
    pub project_id: String,
    pub skill_id: String,
    pub name: String,
    pub description: Option<String>,
    pub dir_path: String,
    pub file_path: String,
    pub relative_path: String,
    pub detected_platform: String,
    pub content_hash: String,
    pub instance_kind: String,
    pub scanned_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ProjectSkillInstallation {
    pub project_id: String,
    pub central_skill_id: String,
    pub target_path: String,
    pub method: String,
    pub installed_hash: String,
    pub managed_by_app: bool,
    pub installed_at: String,
    pub updated_at: String,
    pub sync_status: String,
    pub adapter_paths: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectWithStats {
    #[serde(flatten)]
    pub project: Project,
    pub skill_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConflictResolution {
    Skip,
    Replace,
    Rename,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInstallRequest {
    pub skill_id: String,
    pub resolution: Option<ConflictResolution>,
    pub renamed_skill_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInstallPreviewItem {
    pub skill_id: String,
    pub target_skill_id: String,
    pub target_path: String,
    pub source_hash: String,
    pub existing_hash: Option<String>,
    pub status: String,
    pub is_managed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInstallResultItem {
    pub skill_id: String,
    pub target_skill_id: String,
    pub target_path: String,
    pub method: Option<String>,
    pub status: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProjectBatchInstallResult {
    pub succeeded: Vec<ProjectInstallResultItem>,
    pub skipped: Vec<ProjectInstallResultItem>,
    pub conflicted: Vec<ProjectInstallResultItem>,
    pub failed: Vec<ProjectInstallResultItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectScanResult {
    pub project: ProjectWithStats,
    pub skills: Vec<ProjectSkillInstance>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalCentralImportResult {
    pub skill_id: String,
    pub status: String,
    pub content_hash: String,
    pub canonical_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProjectPayload {
    pub display_name: Option<String>,
    pub is_active: Option<bool>,
}

fn normalize_comparison_path(path: &Path) -> String {
    let value = path_to_string(path)
        .trim_end_matches(['/', '\\'])
        .replace('\\', "/");
    if cfg!(windows) {
        value.to_lowercase()
    } else {
        value
    }
}

pub fn normalize_existing_project_path(path: &str) -> Result<(PathBuf, String), String> {
    let trimmed = path.trim().trim_matches(['"', '\'']);
    if trimmed.is_empty() {
        return Err("Project path cannot be empty".to_string());
    }
    let candidate = PathBuf::from(trimmed);
    if !candidate.exists() {
        return Err(format!(
            "Project directory '{}' does not exist",
            candidate.display()
        ));
    }
    if !candidate.is_dir() {
        return Err(format!(
            "Project path '{}' is not a directory",
            candidate.display()
        ));
    }
    let canonical = fs::canonicalize(&candidate)
        .map_err(|e| format!("Failed to resolve project directory: {e}"))?;
    let normalized = normalize_comparison_path(&canonical);
    Ok((canonical, normalized))
}

pub fn sanitize_skill_id(value: &str) -> Result<String, String> {
    let value = value.trim().to_lowercase().replace(' ', "-");
    if value.is_empty()
        || value.len() > 128
        || value.starts_with('.')
        || value.contains("..")
        || !value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err(format!("Invalid skill id '{value}'"));
    }
    Ok(value)
}

fn should_ignore_hash_entry(name: &str) -> bool {
    HASH_IGNORED_NAMES.contains(&name)
        || name.ends_with(".tmp")
        || name.starts_with(".skillsmanage-stage-")
        || name.starts_with(".skillsmanage-backup-")
}

fn collect_hash_files(
    root: &Path,
    current: &Path,
    files: &mut BTreeMap<String, PathBuf>,
) -> Result<(), String> {
    for entry in
        fs::read_dir(current).map_err(|e| format!("Failed to read '{}': {e}", current.display()))?
    {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {e}"))?;
        let name = entry.file_name().to_string_lossy().into_owned();
        if should_ignore_hash_entry(&name) {
            continue;
        }
        let path = entry.path();
        let file_type = entry
            .file_type()
            .map_err(|e| format!("Failed to inspect '{}': {e}", path.display()))?;
        if file_type.is_symlink() {
            return Err(format!(
                "Skill payload contains an unsupported nested symlink '{}'",
                path.display()
            ));
        }
        if file_type.is_dir() {
            collect_hash_files(root, &path, files)?;
        } else if file_type.is_file() {
            let relative = path
                .strip_prefix(root)
                .map_err(|_| "Failed to compute relative hash path".to_string())?
                .to_string_lossy()
                .replace('\\', "/");
            files.insert(relative, path);
        }
    }
    Ok(())
}

pub fn hash_skill_directory(path: &Path) -> Result<String, String> {
    if !path.join("SKILL.md").is_file() {
        return Err(format!(
            "Skill directory '{}' does not contain SKILL.md",
            path.display()
        ));
    }
    let mut files = BTreeMap::new();
    collect_hash_files(path, path, &mut files)?;
    let mut hasher = Sha256::new();
    for (relative, file_path) in files {
        hasher.update((relative.len() as u64).to_le_bytes());
        hasher.update(relative.as_bytes());
        let mut file = fs::File::open(&file_path)
            .map_err(|e| format!("Failed to open '{}': {e}", file_path.display()))?;
        let mut buffer = [0_u8; 32 * 1024];
        loop {
            let count = file
                .read(&mut buffer)
                .map_err(|e| format!("Failed to hash '{}': {e}", file_path.display()))?;
            if count == 0 {
                break;
            }
            hasher.update((count as u64).to_le_bytes());
            hasher.update(&buffer[..count]);
        }
    }
    Ok(format!("{:x}", hasher.finalize()))
}

fn instance_id(project_id: &str, relative_path: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(project_id.as_bytes());
    hasher.update([0]);
    hasher.update(relative_path.as_bytes());
    format!("{:x}", hasher.finalize())
}

async fn get_project(pool: &DbPool, project_id: &str) -> Result<Project, String> {
    sqlx::query_as::<_, Project>("SELECT * FROM projects WHERE id = ?")
        .bind(project_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Project '{project_id}' not found"))
}

async fn list_projects_impl(pool: &DbPool) -> Result<Vec<ProjectWithStats>, String> {
    let rows = sqlx::query(
        "SELECT p.*, COUNT(i.id) AS skill_count
         FROM projects p
         LEFT JOIN project_skill_instances i ON i.project_id = p.id
         GROUP BY p.id
         ORDER BY lower(p.display_name), p.normalized_path",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(rows
        .into_iter()
        .map(|row| ProjectWithStats {
            project: Project {
                id: row.get("id"),
                path: row.get("path"),
                normalized_path: row.get("normalized_path"),
                display_name: row.get("display_name"),
                is_active: row.get("is_active"),
                added_at: row.get("added_at"),
                updated_at: row.get("updated_at"),
                last_scanned_at: row.get("last_scanned_at"),
                last_scan_status: row.get("last_scan_status"),
                last_scan_error: row.get("last_scan_error"),
                is_git_repository: row.get("is_git_repository"),
                access_status: row.get("access_status"),
                detected_platforms: row.get("detected_platforms"),
            },
            skill_count: row.get("skill_count"),
        })
        .collect())
}

pub async fn add_project_impl(
    pool: &DbPool,
    path: &str,
    display_name: Option<&str>,
) -> Result<ProjectScanResult, String> {
    let (canonical, normalized_path) = normalize_existing_project_path(path)?;
    let canonical_string = path_to_string(&canonical);
    let default_name = canonical
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.trim().is_empty())
        .unwrap_or("Project");
    let display_name = display_name
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .unwrap_or(default_name);
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();
    let is_git_repository = canonical.join(".git").exists();
    sqlx::query(
        "INSERT INTO projects
         (id, path, normalized_path, display_name, is_active, added_at, updated_at,
          last_scan_status, is_git_repository, access_status, detected_platforms)
         VALUES (?, ?, ?, ?, 1, ?, ?, 'never', ?, 'available', '[]')",
    )
    .bind(&id)
    .bind(&canonical_string)
    .bind(&normalized_path)
    .bind(display_name)
    .bind(&now)
    .bind(&now)
    .bind(is_git_repository)
    .execute(pool)
    .await
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            format!(
                "Project directory '{}' has already been added",
                canonical.display()
            )
        } else {
            e.to_string()
        }
    })?;
    scan_project_impl(pool, &id).await
}

pub async fn update_project_impl(
    pool: &DbPool,
    project_id: &str,
    payload: UpdateProjectPayload,
) -> Result<Project, String> {
    let project = get_project(pool, project_id).await?;
    let display_name = payload
        .display_name
        .as_deref()
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .unwrap_or(&project.display_name);
    let is_active = payload.is_active.unwrap_or(project.is_active);
    sqlx::query("UPDATE projects SET display_name = ?, is_active = ?, updated_at = ? WHERE id = ?")
        .bind(display_name)
        .bind(is_active)
        .bind(Utc::now().to_rfc3339())
        .bind(project_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    get_project(pool, project_id).await
}

pub async fn remove_project_impl(pool: &DbPool, project_id: &str) -> Result<(), String> {
    get_project(pool, project_id).await?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM project_skill_instances WHERE project_id = ?")
        .bind(project_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM project_skill_installations WHERE project_id = ?")
        .bind(project_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM projects WHERE id = ?")
        .bind(project_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    tx.commit().await.map_err(|e| e.to_string())
}

async fn installation_map(
    pool: &DbPool,
    project_id: &str,
) -> Result<BTreeMap<String, ProjectSkillInstallation>, String> {
    let rows = sqlx::query_as::<_, ProjectSkillInstallation>(
        "SELECT * FROM project_skill_installations WHERE project_id = ?",
    )
    .bind(project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(rows
        .into_iter()
        .map(|row| (normalize_comparison_path(Path::new(&row.target_path)), row))
        .collect())
}

async fn project_skill_roots(pool: &DbPool) -> Result<Vec<(String, String)>, String> {
    let rows = sqlx::query(
        "SELECT id, project_skills_dir, supports_agents_alias
         FROM agents
         WHERE is_enabled = 1 AND id <> 'central' AND id <> 'obsidian'
         ORDER BY CASE WHEN id = 'codex' THEN 0 ELSE 1 END, lower(display_name)",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;
    let mut roots = vec![(".agents/skills".to_string(), "agents".to_string())];
    let mut seen = HashSet::from([".agents/skills".to_string()]);
    for row in rows {
        let agent_id: String = row.get("id");
        let supports_alias: bool = row.get("supports_agents_alias");
        if supports_alias {
            continue;
        }
        let Some(relative): Option<String> = row.get("project_skills_dir") else {
            continue;
        };
        let normalized = relative.trim_matches(['/', '\\']).replace('\\', "/");
        if !normalized.is_empty() && seen.insert(normalized.clone()) {
            roots.push((normalized, agent_id));
        }
    }
    Ok(roots)
}

pub async fn scan_project_impl(
    pool: &DbPool,
    project_id: &str,
) -> Result<ProjectScanResult, String> {
    let project = get_project(pool, project_id).await?;
    let root = PathBuf::from(&project.path);
    if !root.is_dir() {
        let error = format!("Project directory '{}' is unavailable", root.display());
        sqlx::query(
            "UPDATE projects SET last_scan_status = 'error', last_scan_error = ?,
             access_status = 'unavailable',
             last_scanned_at = ?, updated_at = ? WHERE id = ?",
        )
        .bind(&error)
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .bind(project_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
        return Err(error);
    }
    sqlx::query(
        "UPDATE projects SET last_scan_status = 'scanning', last_scan_error = NULL WHERE id = ?",
    )
    .bind(project_id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    let managed = installation_map(pool, project_id).await?;
    let now = Utc::now().to_rfc3339();
    let mut instances = Vec::new();
    let mut seen_relative_paths = HashSet::new();

    for (relative_root, platform) in project_skill_roots(pool).await? {
        let skill_root = root.join(&relative_root);
        if !skill_root.is_dir() {
            continue;
        }
        for scanned in scan_skill_root(
            &skill_root,
            false,
            ScanDirectoryOptions {
                nested: true,
                max_depth: 2,
                follow_symlinks: true,
            },
        ) {
            let dir_path = PathBuf::from(&scanned.dir_path);
            let relative_path = dir_path
                .strip_prefix(&root)
                .map_err(|_| {
                    format!(
                        "Skill path '{}' is outside project '{}'",
                        dir_path.display(),
                        root.display()
                    )
                })?
                .to_string_lossy()
                .replace('\\', "/");
            if !seen_relative_paths.insert(relative_path.clone()) {
                continue;
            }
            let content_hash = hash_skill_directory(&dir_path)?;
            let normalized_dir = normalize_comparison_path(&dir_path);
            let instance_kind = managed
                .get(&normalized_dir)
                .map(|installation| {
                    if installation.method == "copy" {
                        "managed_copy"
                    } else {
                        "managed_symlink"
                    }
                })
                .unwrap_or("native");
            instances.push(ProjectSkillInstance {
                id: instance_id(project_id, &relative_path),
                project_id: project_id.to_string(),
                skill_id: scanned.id,
                name: scanned.name,
                description: scanned.description,
                dir_path: scanned.dir_path,
                file_path: scanned.file_path,
                relative_path,
                detected_platform: platform.clone(),
                content_hash,
                instance_kind: instance_kind.to_string(),
                scanned_at: now.clone(),
            });
        }
    }

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM project_skill_instances WHERE project_id = ?")
        .bind(project_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    for instance in &instances {
        sqlx::query(
            "INSERT INTO project_skill_instances
             (id, project_id, skill_id, name, description, dir_path, file_path,
              relative_path, detected_platform, content_hash, instance_kind, scanned_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&instance.id)
        .bind(&instance.project_id)
        .bind(&instance.skill_id)
        .bind(&instance.name)
        .bind(&instance.description)
        .bind(&instance.dir_path)
        .bind(&instance.file_path)
        .bind(&instance.relative_path)
        .bind(&instance.detected_platform)
        .bind(&instance.content_hash)
        .bind(&instance.instance_kind)
        .bind(&instance.scanned_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }
    let detected_platforms = instances
        .iter()
        .map(|instance| instance.detected_platform.clone())
        .collect::<std::collections::BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    sqlx::query(
        "UPDATE projects SET last_scan_status = 'success', last_scan_error = NULL,
         access_status = 'available', detected_platforms = ?,
         is_git_repository = ?, last_scanned_at = ?, updated_at = ? WHERE id = ?",
    )
    .bind(serde_json::to_string(&detected_platforms).map_err(|e| e.to_string())?)
    .bind(root.join(".git").exists())
    .bind(&now)
    .bind(&now)
    .bind(project_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;
    tx.commit().await.map_err(|e| e.to_string())?;

    let project = list_projects_impl(pool)
        .await?
        .into_iter()
        .find(|item| item.project.id == project_id)
        .ok_or_else(|| "Project disappeared after scan".to_string())?;
    Ok(ProjectScanResult {
        project,
        skills: instances,
    })
}

async fn list_project_skills_impl(
    pool: &DbPool,
    project_id: &str,
) -> Result<Vec<ProjectSkillInstance>, String> {
    get_project(pool, project_id).await?;
    sqlx::query_as::<_, ProjectSkillInstance>(
        "SELECT * FROM project_skill_instances
         WHERE project_id = ? ORDER BY lower(name), relative_path",
    )
    .bind(project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())
}

async fn central_skill_dir(pool: &DbPool, skill_id: &str) -> Result<PathBuf, String> {
    let skill = db::get_skill_by_id(pool, skill_id)
        .await?
        .ok_or_else(|| format!("Central skill '{skill_id}' not found"))?;
    if !skill.is_central {
        return Err(format!("Skill '{skill_id}' is not in Central"));
    }
    let dir = skill
        .canonical_path
        .map(PathBuf::from)
        .or_else(|| {
            PathBuf::from(skill.file_path)
                .parent()
                .map(Path::to_path_buf)
        })
        .ok_or_else(|| format!("Central skill '{skill_id}' has no valid directory"))?;
    if !dir.join("SKILL.md").is_file() {
        return Err(format!(
            "Central skill '{skill_id}' is missing at '{}'",
            dir.display()
        ));
    }
    Ok(dir)
}

fn direct_project_target(project: &Project, skill_id: &str) -> Result<PathBuf, String> {
    let skill_id = sanitize_skill_id(skill_id)?;
    let target_root = PathBuf::from(&project.path).join(".agents").join("skills");
    Ok(target_root.join(skill_id))
}

fn validate_direct_child(target_root: &Path, target: &Path) -> Result<(), String> {
    if target.parent() != Some(target_root)
        || target
            .components()
            .any(|component| matches!(component, Component::ParentDir))
    {
        return Err(format!(
            "Refusing operation outside managed project skill root '{}'",
            target_root.display()
        ));
    }
    Ok(())
}

async fn preview_item(
    pool: &DbPool,
    project: &Project,
    request: &ProjectInstallRequest,
) -> Result<ProjectInstallPreviewItem, String> {
    let source = central_skill_dir(pool, &request.skill_id).await?;
    let source_hash = hash_skill_directory(&source)?;
    let target_skill_id = match request.resolution {
        Some(ConflictResolution::Rename) => sanitize_skill_id(
            request
                .renamed_skill_id
                .as_deref()
                .ok_or_else(|| "Rename resolution requires renamed_skill_id".to_string())?,
        )?,
        _ => sanitize_skill_id(&request.skill_id)?,
    };
    let target = direct_project_target(project, &target_skill_id)?;
    let existing_hash = if target.exists() {
        Some(hash_skill_directory(&target)?)
    } else {
        None
    };
    let is_managed: bool = sqlx::query_scalar(
        "SELECT EXISTS(
           SELECT 1 FROM project_skill_installations
           WHERE project_id = ? AND target_path = ? AND managed_by_app = 1
         )",
    )
    .bind(&project.id)
    .bind(path_to_string(&target))
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;
    let status = match existing_hash.as_deref() {
        None => "ready",
        Some(existing) if existing == source_hash => "already_installed",
        Some(_) => "conflict",
    };
    Ok(ProjectInstallPreviewItem {
        skill_id: request.skill_id.clone(),
        target_skill_id,
        target_path: path_to_string(&target),
        source_hash,
        existing_hash,
        status: status.to_string(),
        is_managed,
    })
}

pub async fn preview_project_install_impl(
    pool: &DbPool,
    project_id: &str,
    requests: &[ProjectInstallRequest],
) -> Result<Vec<ProjectInstallPreviewItem>, String> {
    let project = get_project(pool, project_id).await?;
    let mut results = Vec::with_capacity(requests.len());
    for request in requests {
        results.push(preview_item(pool, &project, request).await?);
    }
    Ok(results)
}

fn remove_path_by_metadata(path: &Path, recorded_method: Option<&str>) -> Result<(), String> {
    let metadata = fs::symlink_metadata(path)
        .map_err(|e| format!("Failed to inspect '{}': {e}", path.display()))?;
    if metadata.file_type().is_symlink() {
        remove_symlink_path(path)
            .map_err(|e| format!("Failed to remove symlink '{}': {e}", path.display()))?;
        return Ok(());
    }
    if metadata.is_dir() && recorded_method == Some("copy") {
        fs::remove_dir_all(path)
            .map_err(|e| format!("Failed to remove managed copy '{}': {e}", path.display()))?;
        return Ok(());
    }
    Err(format!(
        "Path '{}' is not an authorized managed installation",
        path.display()
    ))
}

fn restore_staged_paths(staged: &[(PathBuf, PathBuf)]) {
    for (original, backup) in staged.iter().rev() {
        if fs::symlink_metadata(backup).is_ok() && fs::symlink_metadata(original).is_err() {
            let _ = fs::rename(backup, original);
        }
    }
}

fn cleanup_staged_paths(staged: &[(PathBuf, PathBuf)], method: &str) {
    for (_, backup) in staged.iter().rev() {
        if fs::symlink_metadata(backup).is_ok() {
            let _ = remove_path_by_metadata(backup, Some(method));
        }
    }
}

fn create_project_installation(
    source: &Path,
    target: &Path,
    requested_method: &str,
) -> Result<String, String> {
    let target_root = target
        .parent()
        .ok_or_else(|| "Project target has no parent".to_string())?;
    fs::create_dir_all(target_root)
        .map_err(|e| format!("Failed to create '{}': {e}", target_root.display()))?;
    match requested_method {
        "copy" => {
            copy_dir_all(source, target)?;
            Ok("copy".to_string())
        }
        "symlink" => {
            let relative = symlink_target_path(target_root, source);
            create_symlink(&relative, target)?;
            Ok("symlink".to_string())
        }
        _ => {
            let relative = symlink_target_path(target_root, source);
            create_symlink(&relative, target).map_err(|error| {
                if cfg!(windows) {
                    format!(
                        "SYMLINK_CONFIRM_COPY_REQUIRED: 无法创建目录软链接。请启用 Windows 开发者模式或以具备权限的账户运行；确认后可改用复制安装。{error}"
                    )
                } else {
                    error
                }
            })?;
            Ok("symlink".to_string())
        }
    }
}

async fn create_platform_adapter_installations(
    pool: &DbPool,
    project: &Project,
    target_skill_id: &str,
    canonical_target: &Path,
    method: &str,
) -> Result<Vec<PathBuf>, String> {
    let rows = sqlx::query(
        "SELECT id, project_skills_dir
         FROM agents
         WHERE is_enabled = 1 AND is_detected = 1
           AND supports_agents_alias = 0
           AND project_skills_dir IS NOT NULL
         ORDER BY lower(display_name)",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;
    let project_root = PathBuf::from(&project.path);
    let mut created: Vec<PathBuf> = Vec::new();
    let mut seen_roots = HashSet::new();
    for row in rows {
        let relative: String = row.get("project_skills_dir");
        let normalized = relative.trim_matches(['/', '\\']).replace('\\', "/");
        if normalized.is_empty()
            || normalized == ".agents/skills"
            || !seen_roots.insert(normalized.clone())
        {
            continue;
        }
        let adapter_root = project_root.join(&normalized);
        let adapter_target = adapter_root.join(target_skill_id);
        if fs::symlink_metadata(&adapter_target).is_ok() {
            return Err(format!(
                "Platform adapter target '{}' already exists and will not be overwritten",
                adapter_target.display()
            ));
        }
        fs::create_dir_all(&adapter_root).map_err(|e| {
            format!(
                "Failed to create platform adapter directory '{}': {e}",
                adapter_root.display()
            )
        })?;
        let result = if method == "copy" {
            copy_dir_all(canonical_target, &adapter_target)
        } else {
            let relative_target = symlink_target_path(&adapter_root, canonical_target);
            create_symlink(&relative_target, &adapter_target)
        };
        if let Err(error) = result {
            for path in created.iter().rev() {
                let _ = remove_path_by_metadata(path, Some(method));
            }
            return Err(format!(
                "Failed to create platform adapter '{}': {error}",
                adapter_target.display()
            ));
        }
        created.push(adapter_target);
    }
    Ok(created)
}

async fn install_one(
    pool: &DbPool,
    project: &Project,
    request: &ProjectInstallRequest,
    method: &str,
) -> Result<ProjectInstallResultItem, ProjectInstallResultItem> {
    let preview = match preview_item(pool, project, request).await {
        Ok(preview) => preview,
        Err(error) => {
            return Err(ProjectInstallResultItem {
                skill_id: request.skill_id.clone(),
                target_skill_id: request
                    .renamed_skill_id
                    .clone()
                    .unwrap_or_else(|| request.skill_id.clone()),
                target_path: String::new(),
                method: None,
                status: "failed".to_string(),
                error: Some(error),
            })
        }
    };
    let result_item = |status: &str, actual_method: Option<String>, error: Option<String>| {
        ProjectInstallResultItem {
            skill_id: preview.skill_id.clone(),
            target_skill_id: preview.target_skill_id.clone(),
            target_path: preview.target_path.clone(),
            method: actual_method,
            status: status.to_string(),
            error,
        }
    };
    if preview.status == "already_installed" {
        return Ok(result_item("skipped", None, None));
    }
    if preview.status == "conflict"
        && !matches!(request.resolution, Some(ConflictResolution::Replace))
        && !matches!(request.resolution, Some(ConflictResolution::Rename))
    {
        return Ok(result_item("conflicted", None, None));
    }
    if matches!(request.resolution, Some(ConflictResolution::Skip)) {
        return Ok(result_item("skipped", None, None));
    }

    let source = match central_skill_dir(pool, &request.skill_id).await {
        Ok(path) => path,
        Err(error) => return Err(result_item("failed", None, Some(error))),
    };
    let target = PathBuf::from(&preview.target_path);
    let target_root = PathBuf::from(&project.path).join(".agents").join("skills");
    if let Err(error) = validate_direct_child(&target_root, &target) {
        return Err(result_item("failed", None, Some(error)));
    }

    let previous_installation = sqlx::query_as::<_, ProjectSkillInstallation>(
        "SELECT * FROM project_skill_installations
         WHERE project_id = ? AND central_skill_id = ?",
    )
    .bind(&project.id)
    .bind(&request.skill_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| {
        result_item(
            "failed",
            None,
            Some(format!("Failed to inspect previous installation: {error}")),
        )
    })?;
    let backup = target_root.join(format!(".skillsmanage-backup-{}", Uuid::new_v4()));
    let had_existing = fs::symlink_metadata(&target).is_ok();
    if had_existing {
        if let Err(error) = fs::rename(&target, &backup) {
            return Err(result_item(
                "failed",
                None,
                Some(format!("Failed to stage existing target: {error}")),
            ));
        }
    }
    let mut staged_adapters: Vec<(PathBuf, PathBuf)> = Vec::new();
    if let Some(previous) = previous_installation
        .as_ref()
        .filter(|item| item.managed_by_app)
    {
        let previous_paths =
            serde_json::from_str::<Vec<String>>(&previous.adapter_paths).unwrap_or_default();
        let project_root = PathBuf::from(&project.path);
        for previous_path in previous_paths {
            let original = PathBuf::from(previous_path);
            if !original.starts_with(&project_root) || fs::symlink_metadata(&original).is_err() {
                continue;
            }
            let parent = match original.parent() {
                Some(parent) => parent,
                None => continue,
            };
            let adapter_backup =
                parent.join(format!(".skillsmanage-adapter-backup-{}", Uuid::new_v4()));
            if let Err(error) = fs::rename(&original, &adapter_backup) {
                restore_staged_paths(&staged_adapters);
                if had_existing {
                    let _ = fs::rename(&backup, &target);
                }
                return Err(result_item(
                    "failed",
                    None,
                    Some(format!(
                        "Failed to stage existing platform adapter: {error}"
                    )),
                ));
            }
            staged_adapters.push((original, adapter_backup));
        }
    }
    let actual_method = match create_project_installation(&source, &target, method) {
        Ok(method) => method,
        Err(error) => {
            restore_staged_paths(&staged_adapters);
            if had_existing {
                let _ = fs::rename(&backup, &target);
            }
            return Err(result_item("failed", None, Some(error)));
        }
    };
    let installed_hash = match hash_skill_directory(&source) {
        Ok(hash) => hash,
        Err(error) => {
            let _ = remove_path_by_metadata(&target, Some(&actual_method));
            restore_staged_paths(&staged_adapters);
            if had_existing {
                let _ = fs::rename(&backup, &target);
            }
            return Err(result_item("failed", Some(actual_method), Some(error)));
        }
    };
    let adapter_paths = match create_platform_adapter_installations(
        pool,
        project,
        &preview.target_skill_id,
        &target,
        &actual_method,
    )
    .await
    {
        Ok(paths) => paths,
        Err(error) => {
            let _ = remove_path_by_metadata(&target, Some(&actual_method));
            restore_staged_paths(&staged_adapters);
            if had_existing {
                let _ = fs::rename(&backup, &target);
            }
            return Err(result_item("failed", Some(actual_method), Some(error)));
        }
    };
    let now = Utc::now().to_rfc3339();
    let db_result = sqlx::query(
        "INSERT INTO project_skill_installations
         (project_id, central_skill_id, target_path, method, installed_hash,
          managed_by_app, installed_at, updated_at, sync_status, adapter_paths)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, 'synced', ?)
         ON CONFLICT(project_id, central_skill_id) DO UPDATE SET
           target_path = excluded.target_path,
           method = excluded.method,
           installed_hash = excluded.installed_hash,
           managed_by_app = 1,
           updated_at = excluded.updated_at,
           sync_status = 'synced',
           adapter_paths = excluded.adapter_paths",
    )
    .bind(&project.id)
    .bind(&request.skill_id)
    .bind(path_to_string(&target))
    .bind(&actual_method)
    .bind(&installed_hash)
    .bind(&now)
    .bind(&now)
    .bind(
        serde_json::to_string(
            &adapter_paths
                .iter()
                .map(|path| path_to_string(path))
                .collect::<Vec<_>>(),
        )
        .map_err(|error| {
            result_item(
                "failed",
                Some(actual_method.clone()),
                Some(error.to_string()),
            )
        })?,
    )
    .execute(pool)
    .await;
    if let Err(error) = db_result {
        for adapter_path in adapter_paths.iter().rev() {
            let _ = remove_path_by_metadata(adapter_path, Some(&actual_method));
        }
        let _ = remove_path_by_metadata(&target, Some(&actual_method));
        restore_staged_paths(&staged_adapters);
        if had_existing {
            let _ = fs::rename(&backup, &target);
        }
        return Err(result_item(
            "failed",
            Some(actual_method),
            Some(format!("Failed to record installation: {error}")),
        ));
    }
    if let Some(previous) = previous_installation.as_ref() {
        cleanup_staged_paths(&staged_adapters, &previous.method);
    }
    if had_existing {
        let backup_meta = fs::symlink_metadata(&backup);
        if let Ok(meta) = backup_meta {
            if meta.file_type().is_symlink() {
                let _ = remove_symlink_path(&backup);
            } else if meta.is_dir() {
                let _ = fs::remove_dir_all(&backup);
            }
        }
    }
    Ok(result_item("succeeded", Some(actual_method), None))
}

pub async fn batch_install_skills_to_project_impl(
    pool: &DbPool,
    project_id: &str,
    requests: &[ProjectInstallRequest],
    method: Option<&str>,
) -> Result<ProjectBatchInstallResult, String> {
    let project = get_project(pool, project_id).await?;
    let method = method.unwrap_or("auto");
    if !["auto", "symlink", "copy"].contains(&method) {
        return Err(format!("Unsupported install method '{method}'"));
    }
    let mut result = ProjectBatchInstallResult::default();
    for request in requests {
        match install_one(pool, &project, request, method).await {
            Ok(item) if item.status == "succeeded" => result.succeeded.push(item),
            Ok(item) if item.status == "skipped" => result.skipped.push(item),
            Ok(item) => result.conflicted.push(item),
            Err(item) => result.failed.push(item),
        }
    }
    let _ = scan_project_impl(pool, project_id).await;
    Ok(result)
}

pub async fn install_collection_to_project_impl(
    pool: &DbPool,
    project_id: &str,
    collection_id: &str,
    method: Option<&str>,
) -> Result<ProjectBatchInstallResult, String> {
    db::get_collection_by_id(pool, collection_id)
        .await?
        .ok_or_else(|| format!("Collection '{collection_id}' not found"))?;
    let skills = db::get_collection_skills(pool, collection_id).await?;
    let requests = skills
        .into_iter()
        .map(|skill| ProjectInstallRequest {
            skill_id: skill.id,
            resolution: None,
            renamed_skill_id: None,
        })
        .collect::<Vec<_>>();
    batch_install_skills_to_project_impl(pool, project_id, &requests, method).await
}

pub async fn uninstall_project_skill_impl(
    pool: &DbPool,
    project_id: &str,
    central_skill_id: &str,
) -> Result<(), String> {
    let project = get_project(pool, project_id).await?;
    let installation = sqlx::query_as::<_, ProjectSkillInstallation>(
        "SELECT * FROM project_skill_installations
         WHERE project_id = ? AND central_skill_id = ?",
    )
    .bind(project_id)
    .bind(central_skill_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| {
        "This project skill is native or untracked and cannot be uninstalled by the app".to_string()
    })?;
    if !installation.managed_by_app {
        return Err("Refusing to remove an unmanaged project skill".to_string());
    }
    let adapter_paths =
        serde_json::from_str::<Vec<String>>(&installation.adapter_paths).unwrap_or_default();
    for adapter_path in adapter_paths.into_iter().rev() {
        let adapter_path = PathBuf::from(adapter_path);
        if fs::symlink_metadata(&adapter_path).is_ok() {
            remove_path_by_metadata(&adapter_path, Some(&installation.method))?;
        }
    }
    let target_root = PathBuf::from(&project.path).join(".agents").join("skills");
    let target = PathBuf::from(&installation.target_path);
    validate_direct_child(&target_root, &target)?;
    if fs::symlink_metadata(&target).is_ok() {
        remove_path_by_metadata(&target, Some(&installation.method))?;
    }
    sqlx::query(
        "DELETE FROM project_skill_installations
         WHERE project_id = ? AND central_skill_id = ?",
    )
    .bind(project_id)
    .bind(central_skill_id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    let _ = scan_project_impl(pool, project_id).await;
    Ok(())
}

pub async fn sync_project_skill_copy_impl(
    pool: &DbPool,
    project_id: &str,
    central_skill_id: &str,
) -> Result<ProjectInstallResultItem, String> {
    let project = get_project(pool, project_id).await?;
    let installation = sqlx::query_as::<_, ProjectSkillInstallation>(
        "SELECT * FROM project_skill_installations
         WHERE project_id = ? AND central_skill_id = ?",
    )
    .bind(project_id)
    .bind(central_skill_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "Managed project installation not found".to_string())?;
    if !installation.managed_by_app || installation.method != "copy" {
        return Err("Only managed copy installations require synchronization".to_string());
    }
    let request = ProjectInstallRequest {
        skill_id: central_skill_id.to_string(),
        resolution: Some(ConflictResolution::Replace),
        renamed_skill_id: None,
    };
    match install_one(pool, &project, &request, "copy").await {
        Ok(item) | Err(item) if item.status == "succeeded" => Ok(item),
        Ok(item) | Err(item) => Err(item.error.unwrap_or(item.status)),
    }
}

pub async fn import_local_skill_to_central_impl(
    pool: &DbPool,
    path: &str,
) -> Result<LocalCentralImportResult, String> {
    let candidate = PathBuf::from(path.trim().trim_matches(['"', '\'']));
    let source_dir = if candidate.is_file()
        && candidate.file_name().and_then(|name| name.to_str()) == Some("SKILL.md")
    {
        candidate
            .parent()
            .ok_or_else(|| "SKILL.md has no parent directory".to_string())?
            .to_path_buf()
    } else {
        candidate
    };
    let source_dir = fs::canonicalize(&source_dir)
        .map_err(|e| format!("Failed to resolve local skill directory: {e}"))?;
    let info = parse_skill_md(&source_dir.join("SKILL.md"))
        .ok_or_else(|| "Selected directory does not contain a valid SKILL.md".to_string())?;
    let fallback_id = source_dir
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(&info.name);
    let skill_id = sanitize_skill_id(fallback_id)?;
    let content_hash = hash_skill_directory(&source_dir)?;

    let central = db::get_agent_by_id(pool, "central")
        .await?
        .ok_or_else(|| "Central Skills directory is not configured".to_string())?;
    let central_root = PathBuf::from(central.global_skills_dir);
    fs::create_dir_all(&central_root)
        .map_err(|e| format!("Failed to create Central Skills directory: {e}"))?;
    let target = central_root.join(&skill_id);

    if target.exists() {
        let existing_hash = hash_skill_directory(&target)?;
        if existing_hash != content_hash {
            return Err(format!(
                "Central skill '{skill_id}' already exists with different content"
            ));
        }
        return Ok(LocalCentralImportResult {
            skill_id,
            status: "deduplicated".to_string(),
            content_hash,
            canonical_path: path_to_string(&target),
        });
    }

    let stage = central_root.join(format!(".skillsmanage-stage-{}", Uuid::new_v4()));
    copy_dir_all(&source_dir, &stage)?;
    hash_skill_directory(&stage)?;
    fs::rename(&stage, &target).map_err(|e| {
        let _ = fs::remove_dir_all(&stage);
        format!("Failed to publish local skill into Central Skills: {e}")
    })?;

    let now = Utc::now().to_rfc3339();
    let skill = db::Skill {
        id: skill_id.clone(),
        name: info.name,
        description: info.description,
        file_path: path_to_string(&target.join("SKILL.md")),
        canonical_path: Some(path_to_string(&target)),
        is_central: true,
        source: Some("local".to_string()),
        content: None,
        scanned_at: now.clone(),
    };
    if let Err(error) = db::upsert_skill(pool, &skill).await {
        let _ = fs::remove_dir_all(&target);
        return Err(error);
    }
    sqlx::query(
        "INSERT INTO skill_sources
         (skill_id, source_type, repository_url, installed_content_hash, last_remote_hash,
          payload_scope, last_checked_at, check_status, local_modified)
         VALUES (?, 'local', ?, ?, ?, 'directory', ?, 'untracked', 0)
         ON CONFLICT(skill_id) DO UPDATE SET source_type = excluded.source_type,
           repository_url = excluded.repository_url,
           installed_content_hash = excluded.installed_content_hash,
           last_remote_hash = excluded.last_remote_hash,
           payload_scope = excluded.payload_scope,
           last_checked_at = excluded.last_checked_at,
           check_status = excluded.check_status,
           local_modified = 0",
    )
    .bind(&skill_id)
    .bind(path_to_string(&source_dir))
    .bind(&content_hash)
    .bind(&content_hash)
    .bind(&now)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    let _ = ensure_taxonomy_for_skill(pool, &skill_id).await?;

    Ok(LocalCentralImportResult {
        skill_id,
        status: "imported".to_string(),
        content_hash,
        canonical_path: path_to_string(&target),
    })
}

pub async fn import_external_skill_to_central_impl(
    pool: &DbPool,
    source: &str,
) -> Result<LocalCentralImportResult, String> {
    let source = source.trim();
    if !(source.starts_with("http://") || source.starts_with("https://")) {
        return import_local_skill_to_central_impl(pool, source).await;
    }
    let response = reqwest::Client::builder()
        .user_agent("skills-manager/0.11.0")
        .build()
        .map_err(|e| e.to_string())?
        .get(source)
        .send()
        .await
        .map_err(|e| format!("下载外部 SKILL.md 失败：{e}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "下载外部 SKILL.md 失败：HTTP {}",
            response.status()
        ));
    }
    let content = response
        .text()
        .await
        .map_err(|e| format!("读取外部 SKILL.md 失败：{e}"))?;
    if content.len() > 2 * 1024 * 1024 {
        return Err("外部 SKILL.md 超过 2 MiB 安全限制".to_string());
    }
    let temp_root = std::env::temp_dir().join(format!("skillsmanage-raw-{}", Uuid::new_v4()));
    let initial = temp_root.join("downloaded-skill");
    fs::create_dir_all(&initial).map_err(|e| format!("创建外部技能临时目录失败：{e}"))?;
    fs::write(initial.join("SKILL.md"), &content)
        .map_err(|e| format!("写入外部技能临时文件失败：{e}"))?;
    let info = parse_skill_md(&initial.join("SKILL.md")).ok_or_else(|| {
        let _ = fs::remove_dir_all(&temp_root);
        "外部链接未返回有效的 SKILL.md".to_string()
    })?;
    let skill_id = sanitize_skill_id(&info.name)?;
    let named = temp_root.join(&skill_id);
    fs::rename(&initial, &named).map_err(|e| {
        let _ = fs::remove_dir_all(&temp_root);
        format!("准备外部技能失败：{e}")
    })?;
    let result = import_local_skill_to_central_impl(pool, &path_to_string(&named)).await;
    let _ = fs::remove_dir_all(&temp_root);
    if let Ok(imported) = &result {
        sqlx::query(
            "UPDATE skill_sources
             SET source_type = 'raw_url', repository_url = ?, payload_scope = 'skill'
             WHERE skill_id = ?",
        )
        .bind(source)
        .bind(&imported.skill_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    }
    result
}

#[tauri::command]
pub async fn list_projects(state: State<'_, AppState>) -> Result<Vec<ProjectWithStats>, String> {
    list_projects_impl(&state.db).await
}

#[tauri::command]
pub async fn add_project(
    state: State<'_, AppState>,
    path: String,
    display_name: Option<String>,
) -> Result<ProjectScanResult, String> {
    add_project_impl(&state.db, &path, display_name.as_deref()).await
}

#[tauri::command]
pub async fn update_project(
    state: State<'_, AppState>,
    project_id: String,
    payload: UpdateProjectPayload,
) -> Result<Project, String> {
    update_project_impl(&state.db, &project_id, payload).await
}

#[tauri::command]
pub async fn remove_project(state: State<'_, AppState>, project_id: String) -> Result<(), String> {
    remove_project_impl(&state.db, &project_id).await
}

#[tauri::command]
pub async fn scan_project(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<ProjectScanResult, String> {
    scan_project_impl(&state.db, &project_id).await
}

#[tauri::command]
pub async fn list_project_skills(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<Vec<ProjectSkillInstance>, String> {
    list_project_skills_impl(&state.db, &project_id).await
}

#[tauri::command]
pub async fn preview_project_install(
    state: State<'_, AppState>,
    project_id: String,
    requests: Vec<ProjectInstallRequest>,
) -> Result<Vec<ProjectInstallPreviewItem>, String> {
    preview_project_install_impl(&state.db, &project_id, &requests).await
}

#[tauri::command]
pub async fn batch_install_skills_to_project(
    state: State<'_, AppState>,
    project_id: String,
    requests: Vec<ProjectInstallRequest>,
    method: Option<String>,
) -> Result<ProjectBatchInstallResult, String> {
    batch_install_skills_to_project_impl(&state.db, &project_id, &requests, method.as_deref()).await
}

#[tauri::command]
pub async fn install_collection_to_project(
    state: State<'_, AppState>,
    project_id: String,
    collection_id: String,
    method: Option<String>,
) -> Result<ProjectBatchInstallResult, String> {
    install_collection_to_project_impl(&state.db, &project_id, &collection_id, method.as_deref())
        .await
}

#[tauri::command]
pub async fn uninstall_project_skill(
    state: State<'_, AppState>,
    project_id: String,
    central_skill_id: String,
) -> Result<(), String> {
    uninstall_project_skill_impl(&state.db, &project_id, &central_skill_id).await
}

#[tauri::command]
pub async fn sync_project_skill_copy(
    state: State<'_, AppState>,
    project_id: String,
    central_skill_id: String,
) -> Result<ProjectInstallResultItem, String> {
    sync_project_skill_copy_impl(&state.db, &project_id, &central_skill_id).await
}

#[tauri::command]
pub async fn import_local_skill_to_central(
    state: State<'_, AppState>,
    path: String,
) -> Result<LocalCentralImportResult, String> {
    import_local_skill_to_central_impl(&state.db, &path).await
}

#[tauri::command]
pub async fn import_external_skill_to_central(
    state: State<'_, AppState>,
    source: String,
) -> Result<LocalCentralImportResult, String> {
    import_external_skill_to_central_impl(&state.db, &source).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{self, Skill};
    use sqlx::SqlitePool;
    use tempfile::TempDir;

    async fn test_pool() -> DbPool {
        let pool = SqlitePool::connect(":memory:").await.unwrap();
        db::init_database(&pool).await.unwrap();
        pool
    }

    fn write_skill(root: &Path, id: &str, body: &str) -> PathBuf {
        let dir = root.join(id);
        fs::create_dir_all(&dir).unwrap();
        fs::write(
            dir.join("SKILL.md"),
            format!("---\nname: {id}\ndescription: Test skill\n---\n\n{body}\n"),
        )
        .unwrap();
        dir
    }

    async fn add_central(pool: &DbPool, root: &Path, id: &str, body: &str) {
        let dir = write_skill(root, id, body);
        db::upsert_skill(
            pool,
            &Skill {
                id: id.to_string(),
                name: id.to_string(),
                description: Some("Test".to_string()),
                file_path: path_to_string(&dir.join("SKILL.md")),
                canonical_path: Some(path_to_string(&dir)),
                is_central: true,
                source: Some("test".to_string()),
                content: None,
                scanned_at: Utc::now().to_rfc3339(),
            },
        )
        .await
        .unwrap();
    }

    #[test]
    fn hash_is_stable_and_ignores_transient_files() {
        let temp = TempDir::new().unwrap();
        let skill = write_skill(temp.path(), "stable", "alpha");
        fs::create_dir_all(skill.join("references")).unwrap();
        fs::write(skill.join("references/z.txt"), "z").unwrap();
        fs::write(skill.join("references/a.txt"), "a").unwrap();
        let first = hash_skill_directory(&skill).unwrap();
        fs::write(skill.join(".skillsmanage-stage-ignore.tmp"), "ignored").unwrap();
        let second = hash_skill_directory(&skill).unwrap();
        assert_eq!(first, second);
        fs::write(skill.join("references/a.txt"), "changed").unwrap();
        assert_ne!(first, hash_skill_directory(&skill).unwrap());
    }

    #[tokio::test]
    async fn project_paths_are_unique_and_removal_keeps_files() {
        let pool = test_pool().await;
        let project = TempDir::new().unwrap();
        let added = add_project_impl(&pool, project.path().to_str().unwrap(), None)
            .await
            .unwrap();
        assert!(
            add_project_impl(&pool, project.path().to_str().unwrap(), None)
                .await
                .is_err()
        );
        remove_project_impl(&pool, &added.project.project.id)
            .await
            .unwrap();
        assert!(project.path().exists());
    }

    #[tokio::test]
    async fn same_named_skills_in_two_projects_have_distinct_instances() {
        let pool = test_pool().await;
        let first = TempDir::new().unwrap();
        let second = TempDir::new().unwrap();
        write_skill(&first.path().join(".agents/skills"), "shared", "first");
        write_skill(&second.path().join(".agents/skills"), "shared", "second");
        let first_result = add_project_impl(&pool, first.path().to_str().unwrap(), None)
            .await
            .unwrap();
        let second_result = add_project_impl(&pool, second.path().to_str().unwrap(), None)
            .await
            .unwrap();
        assert_eq!(
            first_result.skills[0].skill_id,
            second_result.skills[0].skill_id
        );
        assert_ne!(first_result.skills[0].id, second_result.skills[0].id);
        assert_ne!(
            first_result.skills[0].content_hash,
            second_result.skills[0].content_hash
        );
    }

    #[tokio::test]
    async fn install_deduplicates_and_refuses_untracked_uninstall() {
        let pool = test_pool().await;
        let central = TempDir::new().unwrap();
        let project = TempDir::new().unwrap();
        add_central(&pool, central.path(), "demo", "same").await;
        let added = add_project_impl(&pool, project.path().to_str().unwrap(), None)
            .await
            .unwrap();
        let request = ProjectInstallRequest {
            skill_id: "demo".to_string(),
            resolution: None,
            renamed_skill_id: None,
        };
        let first = batch_install_skills_to_project_impl(
            &pool,
            &added.project.project.id,
            std::slice::from_ref(&request),
            Some("copy"),
        )
        .await
        .unwrap();
        assert_eq!(first.succeeded.len(), 1);
        let second = batch_install_skills_to_project_impl(
            &pool,
            &added.project.project.id,
            &[request],
            Some("copy"),
        )
        .await
        .unwrap();
        assert_eq!(second.skipped.len(), 1);

        let native = write_skill(
            &project.path().join(".agents/skills"),
            "native",
            "do not remove",
        );
        assert!(
            uninstall_project_skill_impl(&pool, &added.project.project.id, "native")
                .await
                .is_err()
        );
        assert!(native.exists());
    }

    #[tokio::test]
    async fn different_content_reports_conflict_and_replace_updates_copy() {
        let pool = test_pool().await;
        let central = TempDir::new().unwrap();
        let project = TempDir::new().unwrap();
        add_central(&pool, central.path(), "demo", "central").await;
        let target = write_skill(
            &project.path().join(".agents/skills"),
            "demo",
            "project-local",
        );
        let added = add_project_impl(&pool, project.path().to_str().unwrap(), None)
            .await
            .unwrap();
        let conflict = ProjectInstallRequest {
            skill_id: "demo".to_string(),
            resolution: None,
            renamed_skill_id: None,
        };
        let result = batch_install_skills_to_project_impl(
            &pool,
            &added.project.project.id,
            &[conflict],
            Some("copy"),
        )
        .await
        .unwrap();
        assert_eq!(result.conflicted.len(), 1);
        let replace = ProjectInstallRequest {
            skill_id: "demo".to_string(),
            resolution: Some(ConflictResolution::Replace),
            renamed_skill_id: None,
        };
        let result = batch_install_skills_to_project_impl(
            &pool,
            &added.project.project.id,
            &[replace],
            Some("copy"),
        )
        .await
        .unwrap();
        assert_eq!(result.succeeded.len(), 1);
        assert!(fs::read_to_string(target.join("SKILL.md"))
            .unwrap()
            .contains("central"));
    }

    #[tokio::test]
    async fn copy_sync_replaces_managed_platform_adapters_without_conflict() {
        let pool = test_pool().await;
        db::update_agent_detected(&pool, "claude-code", true)
            .await
            .unwrap();
        let central = TempDir::new().unwrap();
        let project = TempDir::new().unwrap();
        add_central(&pool, central.path(), "demo", "first").await;
        let added = add_project_impl(&pool, project.path().to_str().unwrap(), None)
            .await
            .unwrap();
        let request = ProjectInstallRequest {
            skill_id: "demo".to_string(),
            resolution: None,
            renamed_skill_id: None,
        };
        let installed = batch_install_skills_to_project_impl(
            &pool,
            &added.project.project.id,
            &[request],
            Some("copy"),
        )
        .await
        .unwrap();
        assert_eq!(installed.succeeded.len(), 1);
        let adapter = project.path().join(".claude/skills/demo/SKILL.md");
        assert!(fs::read_to_string(&adapter).unwrap().contains("first"));

        fs::write(
            central.path().join("demo/SKILL.md"),
            "---\nname: demo\ndescription: Test skill\n---\n\nsecond\n",
        )
        .unwrap();
        let synced = sync_project_skill_copy_impl(&pool, &added.project.project.id, "demo")
            .await
            .unwrap();
        assert_eq!(synced.status, "succeeded");
        assert!(fs::read_to_string(adapter).unwrap().contains("second"));
    }
}
