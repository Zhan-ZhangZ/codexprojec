use std::collections::BTreeMap;
use std::fs;
use std::path::{Component, Path, PathBuf};

use chrono::Utc;
use reqwest::header::{ACCEPT, AUTHORIZATION, USER_AGENT};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::FromRow;
use tauri::State;
use uuid::Uuid;

use crate::db::{self, DbPool};
use crate::path_utils::path_to_string;
use crate::AppState;

use super::projects::hash_skill_directory;
use super::scanner::parse_skill_md;

const MAX_REMOTE_FILES: usize = 2_000;
const MAX_REMOTE_BYTES: usize = 25 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SkillSource {
    pub skill_id: String,
    pub source_type: String,
    pub repository_url: Option<String>,
    pub registry_id: Option<String>,
    pub git_ref: Option<String>,
    pub skill_relative_path: Option<String>,
    pub remote_revision: Option<String>,
    pub installed_content_hash: Option<String>,
    pub last_remote_hash: Option<String>,
    pub payload_scope: String,
    pub last_checked_at: Option<String>,
    pub check_status: String,
    pub check_error: Option<String>,
    pub local_modified: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillUpdateStatus {
    pub skill_id: String,
    pub source_type: String,
    pub status: String,
    pub current_hash: Option<String>,
    pub installed_hash: Option<String>,
    pub remote_hash: Option<String>,
    pub remote_revision: Option<String>,
    pub local_modified: bool,
    pub last_checked_at: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillUpdateResult {
    pub skill_id: String,
    pub status: String,
    pub previous_hash: Option<String>,
    pub installed_hash: Option<String>,
    pub copies_marked_for_sync: u64,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SkillUpdateBatchResult {
    pub succeeded: Vec<SkillUpdateResult>,
    pub skipped: Vec<SkillUpdateResult>,
    pub conflicted: Vec<SkillUpdateResult>,
    pub failed: Vec<SkillUpdateResult>,
}

#[derive(Debug, Deserialize)]
struct GitTreeResponse {
    sha: String,
    tree: Vec<GitTreeEntry>,
    #[serde(default)]
    truncated: bool,
}

#[derive(Debug, Deserialize)]
struct GitTreeEntry {
    path: String,
    #[serde(rename = "type")]
    entry_type: String,
    size: Option<usize>,
}

#[derive(Debug)]
struct RemotePayload {
    files: BTreeMap<String, Vec<u8>>,
    hash: String,
    revision: Option<String>,
}

fn parse_github_repository(url: &str) -> Result<(String, String), String> {
    let trimmed = url.trim().trim_end_matches('/').trim_end_matches(".git");
    let marker = "github.com/";
    let remainder = trimmed
        .split_once(marker)
        .map(|(_, remainder)| remainder)
        .ok_or_else(|| format!("Unsupported GitHub repository URL '{url}'"))?;
    let mut parts = remainder.split('/').filter(|part| !part.is_empty());
    let owner = parts
        .next()
        .ok_or_else(|| "GitHub repository owner is missing".to_string())?;
    let repo = parts
        .next()
        .ok_or_else(|| "GitHub repository name is missing".to_string())?;
    Ok((owner.to_string(), repo.to_string()))
}

fn github_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .user_agent("skills-manager/0.11.0")
        .build()
        .map_err(|e| e.to_string())
}

async fn github_token(pool: &DbPool) -> Result<Option<String>, String> {
    Ok(db::get_setting(pool, "github_pat")
        .await?
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty()))
}

fn authenticated(request: reqwest::RequestBuilder, token: Option<&str>) -> reqwest::RequestBuilder {
    let request = request
        .header(USER_AGENT, "skills-manager/0.11.0")
        .header(ACCEPT, "application/vnd.github+json");
    match token {
        Some(token) => request.header(AUTHORIZATION, format!("Bearer {token}")),
        None => request,
    }
}

fn hash_remote_files(files: &BTreeMap<String, Vec<u8>>) -> String {
    let mut hasher = Sha256::new();
    for (relative, bytes) in files {
        hasher.update((relative.len() as u64).to_le_bytes());
        hasher.update(relative.as_bytes());
        for chunk in bytes.chunks(32 * 1024) {
            hasher.update((chunk.len() as u64).to_le_bytes());
            hasher.update(chunk);
        }
    }
    format!("{:x}", hasher.finalize())
}

fn validate_remote_relative_path(path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(path.replace('\\', "/"));
    if path.is_absolute()
        || path.components().any(|component| {
            matches!(
                component,
                Component::ParentDir | Component::RootDir | Component::Prefix(_)
            )
        })
    {
        return Err(format!("Unsafe remote payload path '{path:?}'"));
    }
    Ok(path)
}

async fn fetch_manifest_payload(
    client: &reqwest::Client,
    source: &SkillSource,
    token: Option<&str>,
) -> Result<RemotePayload, String> {
    let url = source
        .skill_relative_path
        .as_deref()
        .filter(|value| value.starts_with("https://"))
        .ok_or_else(|| "Marketplace source is missing its manifest URL".to_string())?;
    let response = authenticated(client.get(url), token)
        .send()
        .await
        .map_err(|e| format!("Update check failed: {e}"))?;
    if !response.status().is_success() {
        return Err(format!("Update check returned {}", response.status()));
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read remote manifest: {e}"))?
        .to_vec();
    if bytes.len() > MAX_REMOTE_BYTES {
        return Err("Remote manifest exceeds the update size limit".to_string());
    }
    let mut files = BTreeMap::new();
    files.insert("SKILL.md".to_string(), bytes);
    let hash = hash_remote_files(&files);
    Ok(RemotePayload {
        files,
        hash,
        revision: None,
    })
}

async fn fetch_github_payload(
    client: &reqwest::Client,
    source: &SkillSource,
    token: Option<&str>,
) -> Result<RemotePayload, String> {
    if source.payload_scope == "manifest" {
        return fetch_manifest_payload(client, source, token).await;
    }
    let repository_url = source
        .repository_url
        .as_deref()
        .ok_or_else(|| "Tracked skill is missing repository_url".to_string())?;
    let (owner, repo) = parse_github_repository(repository_url)?;
    let git_ref = source.git_ref.as_deref().unwrap_or("main");
    let skill_root = source
        .skill_relative_path
        .as_deref()
        .ok_or_else(|| "Tracked skill is missing skill_relative_path".to_string())?
        .trim_matches('/');
    let tree_url =
        format!("https://api.github.com/repos/{owner}/{repo}/git/trees/{git_ref}?recursive=1");
    let response = authenticated(client.get(&tree_url), token)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch GitHub tree: {e}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "GitHub tree request returned {}",
            response.status()
        ));
    }
    let tree: GitTreeResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse GitHub tree: {e}"))?;
    if tree.truncated {
        return Err("GitHub tree response is truncated; refusing incomplete update".to_string());
    }
    let prefix = if skill_root.is_empty() || skill_root == "." {
        String::new()
    } else {
        format!("{skill_root}/")
    };
    let entries = tree
        .tree
        .into_iter()
        .filter(|entry| entry.entry_type == "blob" && entry.path.starts_with(&prefix))
        .collect::<Vec<_>>();
    if entries.len() > MAX_REMOTE_FILES {
        return Err(format!(
            "Remote skill contains {} files, exceeding the limit",
            entries.len()
        ));
    }
    let declared_size = entries.iter().filter_map(|entry| entry.size).sum::<usize>();
    if declared_size > MAX_REMOTE_BYTES {
        return Err("Remote skill exceeds the update size limit".to_string());
    }
    let mut files = BTreeMap::new();
    let mut downloaded_bytes = 0_usize;
    for entry in entries {
        let relative = entry.path.strip_prefix(&prefix).unwrap_or(&entry.path);
        validate_remote_relative_path(relative)?;
        let raw_url = format!(
            "https://raw.githubusercontent.com/{owner}/{repo}/{git_ref}/{}",
            entry.path
        );
        let response = authenticated(client.get(&raw_url), token)
            .send()
            .await
            .map_err(|e| format!("Failed to download '{}': {e}", entry.path))?;
        if !response.status().is_success() {
            return Err(format!(
                "Remote file '{}' returned {}",
                entry.path,
                response.status()
            ));
        }
        let bytes = response
            .bytes()
            .await
            .map_err(|e| format!("Failed to read '{}': {e}", entry.path))?
            .to_vec();
        downloaded_bytes += bytes.len();
        if downloaded_bytes > MAX_REMOTE_BYTES {
            return Err("Remote skill exceeds the update size limit".to_string());
        }
        files.insert(relative.replace('\\', "/"), bytes);
    }
    if !files.contains_key("SKILL.md") {
        return Err("Remote skill payload does not contain SKILL.md".to_string());
    }
    let hash = hash_remote_files(&files);
    Ok(RemotePayload {
        files,
        hash,
        revision: Some(tree.sha),
    })
}

async fn source_for_skill(pool: &DbPool, skill_id: &str) -> Result<SkillSource, String> {
    sqlx::query_as::<_, SkillSource>("SELECT * FROM skill_sources WHERE skill_id = ?")
        .bind(skill_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Skill '{skill_id}' has no tracked update source"))
}

fn central_directory(skill: &db::Skill) -> Result<PathBuf, String> {
    skill
        .canonical_path
        .as_deref()
        .map(PathBuf::from)
        .or_else(|| Path::new(&skill.file_path).parent().map(Path::to_path_buf))
        .filter(|path| path.join("SKILL.md").is_file())
        .ok_or_else(|| format!("Central skill '{}' has no valid directory", skill.id))
}

async fn write_check_status(
    pool: &DbPool,
    skill_id: &str,
    status: &str,
    current_hash: Option<&str>,
    remote: Option<&RemotePayload>,
    error: Option<&str>,
) -> Result<SkillUpdateStatus, String> {
    let source = source_for_skill(pool, skill_id).await?;
    let now = Utc::now().to_rfc3339();
    let local_modified = matches!(status, "local_modified" | "conflict");
    sqlx::query(
        "UPDATE skill_sources SET last_remote_hash = COALESCE(?, last_remote_hash),
         remote_revision = COALESCE(?, remote_revision), last_checked_at = ?,
         check_status = ?, check_error = ?, local_modified = ? WHERE skill_id = ?",
    )
    .bind(remote.map(|payload| payload.hash.as_str()))
    .bind(remote.and_then(|payload| payload.revision.as_deref()))
    .bind(&now)
    .bind(status)
    .bind(error)
    .bind(local_modified)
    .bind(skill_id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(SkillUpdateStatus {
        skill_id: skill_id.to_string(),
        source_type: source.source_type,
        status: status.to_string(),
        current_hash: current_hash.map(str::to_string),
        installed_hash: source.installed_content_hash,
        remote_hash: remote.map(|payload| payload.hash.clone()),
        remote_revision: remote.and_then(|payload| payload.revision.clone()),
        local_modified,
        last_checked_at: Some(now),
        error: error.map(str::to_string),
    })
}

pub async fn check_one_update(pool: &DbPool, skill_id: &str) -> Result<SkillUpdateStatus, String> {
    let source = source_for_skill(pool, skill_id).await?;
    if !["github", "marketplace"].contains(&source.source_type.as_str()) {
        return write_check_status(pool, skill_id, "untracked", None, None, None).await;
    }
    let skill = db::get_skill_by_id(pool, skill_id)
        .await?
        .ok_or_else(|| format!("Skill '{skill_id}' not found"))?;
    let directory = central_directory(&skill)?;
    let current_hash = hash_skill_directory(&directory)?;
    let installed_hash = source
        .installed_content_hash
        .clone()
        .unwrap_or_else(|| current_hash.clone());
    let client = github_client()?;
    let token = github_token(pool).await?;
    let remote = match fetch_github_payload(&client, &source, token.as_deref()).await {
        Ok(payload) => payload,
        Err(error) => {
            return write_check_status(
                pool,
                skill_id,
                "check_failed",
                Some(&current_hash),
                None,
                Some(&error),
            )
            .await
        }
    };
    let status = match (
        current_hash == installed_hash,
        remote.hash == installed_hash,
    ) {
        (true, true) => "up_to_date",
        (true, false) => "update_available",
        (false, true) => "local_modified",
        (false, false) => "conflict",
    };
    write_check_status(
        pool,
        skill_id,
        status,
        Some(&current_hash),
        Some(&remote),
        None,
    )
    .await
}

pub async fn check_skill_updates_impl(
    pool: &DbPool,
    skill_ids: Option<Vec<String>>,
) -> Result<Vec<SkillUpdateStatus>, String> {
    let ids = match skill_ids {
        Some(ids) => ids,
        None => sqlx::query_scalar::<_, String>(
            "SELECT skill_id FROM skill_sources
             WHERE source_type IN ('github', 'marketplace') ORDER BY skill_id",
        )
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?,
    };
    let mut statuses = Vec::with_capacity(ids.len());
    for id in ids {
        statuses.push(check_one_update(pool, &id).await?);
    }
    Ok(statuses)
}

fn write_payload(payload: &RemotePayload, stage: &Path) -> Result<(), String> {
    fs::create_dir_all(stage)
        .map_err(|e| format!("Failed to create update stage '{}': {e}", stage.display()))?;
    for (relative, bytes) in &payload.files {
        let relative = validate_remote_relative_path(relative)?;
        let target = stage.join(relative);
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create '{}': {e}", parent.display()))?;
        }
        fs::write(&target, bytes)
            .map_err(|e| format!("Failed to stage '{}': {e}", target.display()))?;
    }
    if parse_skill_md(&stage.join("SKILL.md")).is_none() {
        return Err("Updated SKILL.md has invalid or missing frontmatter".to_string());
    }
    Ok(())
}

pub async fn update_central_skill_impl(
    pool: &DbPool,
    skill_id: &str,
    force: bool,
) -> Result<SkillUpdateResult, String> {
    let checked = check_one_update(pool, skill_id).await?;
    if checked.status != "update_available" && !force {
        return Ok(SkillUpdateResult {
            skill_id: skill_id.to_string(),
            status: checked.status,
            previous_hash: checked.current_hash,
            installed_hash: checked.installed_hash,
            copies_marked_for_sync: 0,
            error: None,
        });
    }
    let source = source_for_skill(pool, skill_id).await?;
    let client = github_client()?;
    let token = github_token(pool).await?;
    let payload = fetch_github_payload(&client, &source, token.as_deref()).await?;
    let skill = db::get_skill_by_id(pool, skill_id)
        .await?
        .ok_or_else(|| format!("Skill '{skill_id}' not found"))?;
    let target = central_directory(&skill)?;
    let parent = target
        .parent()
        .ok_or_else(|| "Central skill directory has no parent".to_string())?;
    let stage = parent.join(format!(".skillsmanage-stage-{}", Uuid::new_v4()));
    let backup = parent.join(format!(".skillsmanage-backup-{}", Uuid::new_v4()));
    if let Err(error) = write_payload(&payload, &stage) {
        let _ = fs::remove_dir_all(&stage);
        return Err(error);
    }
    let staged_hash = hash_skill_directory(&stage)?;
    if staged_hash != payload.hash {
        let _ = fs::remove_dir_all(&stage);
        return Err("Staged update hash does not match downloaded payload".to_string());
    }
    fs::rename(&target, &backup).map_err(|e| format!("Failed to back up Central skill: {e}"))?;
    if let Err(error) = fs::rename(&stage, &target) {
        let _ = fs::rename(&backup, &target);
        return Err(format!("Failed to activate update: {error}"));
    }
    let info = parse_skill_md(&target.join("SKILL.md"))
        .ok_or_else(|| "Activated update has invalid SKILL.md".to_string())?;
    let now = Utc::now().to_rfc3339();
    let update_result = async {
        sqlx::query(
            "UPDATE skills SET name = ?, description = ?, file_path = ?,
             canonical_path = ?, scanned_at = ? WHERE id = ?",
        )
        .bind(info.name)
        .bind(info.description)
        .bind(path_to_string(&target.join("SKILL.md")))
        .bind(path_to_string(&target))
        .bind(&now)
        .bind(skill_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
        sqlx::query(
            "UPDATE skill_sources SET installed_content_hash = ?,
             last_remote_hash = ?, remote_revision = COALESCE(?, remote_revision),
             last_checked_at = ?, check_status = 'up_to_date', check_error = NULL,
             local_modified = 0 WHERE skill_id = ?",
        )
        .bind(&payload.hash)
        .bind(&payload.hash)
        .bind(payload.revision.as_deref())
        .bind(&now)
        .bind(skill_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
        let project_copies = sqlx::query(
            "UPDATE project_skill_installations SET sync_status = 'needs_sync',
             updated_at = ? WHERE central_skill_id = ? AND method = 'copy'",
        )
        .bind(&now)
        .bind(skill_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?
        .rows_affected();
        let global_copies = sqlx::query(
            "UPDATE skill_installations SET sync_status = 'needs_sync'
             WHERE skill_id = ? AND link_type = 'copy'",
        )
        .bind(skill_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?
        .rows_affected();
        Ok::<u64, String>(project_copies + global_copies)
    }
    .await;
    let copies_marked_for_sync = match update_result {
        Ok(count) => count,
        Err(error) => {
            let _ = fs::remove_dir_all(&target);
            let _ = fs::rename(&backup, &target);
            return Err(format!(
                "Update database write failed; restored backup: {error}"
            ));
        }
    };
    fs::remove_dir_all(&backup)
        .map_err(|e| format!("Update succeeded but backup cleanup failed: {e}"))?;
    Ok(SkillUpdateResult {
        skill_id: skill_id.to_string(),
        status: "updated".to_string(),
        previous_hash: checked.current_hash,
        installed_hash: Some(payload.hash),
        copies_marked_for_sync,
        error: None,
    })
}

pub async fn batch_update_central_skills_impl(
    pool: &DbPool,
    skill_ids: Vec<String>,
) -> Result<SkillUpdateBatchResult, String> {
    let mut batch = SkillUpdateBatchResult::default();
    for skill_id in skill_ids {
        match update_central_skill_impl(pool, &skill_id, false).await {
            Ok(result) if result.status == "updated" => batch.succeeded.push(result),
            Ok(result) if matches!(result.status.as_str(), "conflict" | "local_modified") => {
                batch.conflicted.push(result)
            }
            Ok(result) => batch.skipped.push(result),
            Err(error) => batch.failed.push(SkillUpdateResult {
                skill_id,
                status: "failed".to_string(),
                previous_hash: None,
                installed_hash: None,
                copies_marked_for_sync: 0,
                error: Some(error),
            }),
        }
    }
    Ok(batch)
}

#[tauri::command]
pub async fn check_skill_updates(
    state: State<'_, AppState>,
    skill_ids: Option<Vec<String>>,
) -> Result<Vec<SkillUpdateStatus>, String> {
    check_skill_updates_impl(&state.db, skill_ids).await
}

#[tauri::command]
pub async fn update_central_skill(
    state: State<'_, AppState>,
    skill_id: String,
    force: Option<bool>,
) -> Result<SkillUpdateResult, String> {
    update_central_skill_impl(&state.db, &skill_id, force.unwrap_or(false)).await
}

#[tauri::command]
pub async fn batch_update_central_skills(
    state: State<'_, AppState>,
    skill_ids: Vec<String>,
) -> Result<SkillUpdateBatchResult, String> {
    batch_update_central_skills_impl(&state.db, skill_ids).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn remote_hash_matches_directory_hash_algorithm() {
        let temp = tempfile::TempDir::new().unwrap();
        fs::write(
            temp.path().join("SKILL.md"),
            "---\nname: demo\ndescription: Demo\n---\n",
        )
        .unwrap();
        fs::create_dir_all(temp.path().join("references")).unwrap();
        fs::write(temp.path().join("references/a.txt"), "a").unwrap();
        let files = BTreeMap::from([
            (
                "SKILL.md".to_string(),
                fs::read(temp.path().join("SKILL.md")).unwrap(),
            ),
            (
                "references/a.txt".to_string(),
                fs::read(temp.path().join("references/a.txt")).unwrap(),
            ),
        ]);
        assert_eq!(
            hash_remote_files(&files),
            hash_skill_directory(temp.path()).unwrap()
        );
    }

    #[test]
    fn rejects_remote_path_traversal() {
        assert!(validate_remote_relative_path("../secret").is_err());
        assert!(validate_remote_relative_path("references/readme.md").is_ok());
    }

    #[test]
    fn parses_supported_github_urls() {
        assert_eq!(
            parse_github_repository("https://github.com/owner/repo.git").unwrap(),
            ("owner".to_string(), "repo".to_string())
        );
    }
}
