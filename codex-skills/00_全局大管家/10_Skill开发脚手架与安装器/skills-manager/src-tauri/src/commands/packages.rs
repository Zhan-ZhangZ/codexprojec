use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Row};
use tauri::State;
use uuid::Uuid;

use crate::db::DbPool;
use crate::AppState;

use super::projects::{
    batch_install_skills_to_project_impl, ProjectBatchInstallResult, ProjectInstallRequest,
};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SkillPackage {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub source_type: String,
    pub repository_url: String,
    pub git_ref: Option<String>,
    pub installed_revision: Option<String>,
    pub remote_revision: Option<String>,
    pub snapshot_path: String,
    pub content_hash: String,
    pub license: Option<String>,
    pub update_status: String,
    pub check_error: Option<String>,
    pub imported_at: String,
    pub updated_at: String,
    pub last_checked_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PackageSkill {
    pub package_id: String,
    pub skill_id: String,
    pub relative_path: String,
    pub default_enabled: bool,
    pub is_required: bool,
    pub sort_order: i64,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PackagePlatformAdapter {
    pub package_id: String,
    pub agent_id: String,
    pub adapter_kind: String,
    pub manifest_path: Option<String>,
    pub has_hooks: bool,
    pub risk_level: String,
    pub is_verified: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillPackageSummary {
    #[serde(flatten)]
    pub package: SkillPackage,
    pub child_skill_count: i64,
    pub enabled_child_count: i64,
    pub has_native_adapters: bool,
    pub has_hooks: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillPackageDetail {
    pub package: SkillPackageSummary,
    pub skills: Vec<PackageSkill>,
    pub adapters: Vec<PackagePlatformAdapter>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageInstallResult {
    pub deployment_id: String,
    pub package_id: String,
    pub project_id: String,
    pub install_mode: String,
    pub selected_skill_ids: Vec<String>,
    pub skill_result: ProjectBatchInstallResult,
}

pub async fn list_skill_packages_impl(pool: &DbPool) -> Result<Vec<SkillPackageSummary>, String> {
    let rows = sqlx::query(
        "SELECT p.*,
                COUNT(DISTINCT ps.skill_id) AS child_skill_count,
                COALESCE(SUM(CASE WHEN ps.default_enabled = 1 THEN 1 ELSE 0 END), 0)
                  AS enabled_child_count,
                EXISTS(SELECT 1 FROM package_platform_adapters a
                       WHERE a.package_id = p.id) AS has_native_adapters,
                EXISTS(SELECT 1 FROM package_platform_adapters a
                       WHERE a.package_id = p.id AND a.has_hooks = 1) AS has_hooks
         FROM skill_packages p
         LEFT JOIN package_skills ps ON ps.package_id = p.id
         GROUP BY p.id
         ORDER BY lower(p.name), p.id",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;
    rows.into_iter()
        .map(|row| {
            Ok(SkillPackageSummary {
                package: SkillPackage {
                    id: row.get("id"),
                    name: row.get("name"),
                    description: row.get("description"),
                    source_type: row.get("source_type"),
                    repository_url: row.get("repository_url"),
                    git_ref: row.get("git_ref"),
                    installed_revision: row.get("installed_revision"),
                    remote_revision: row.get("remote_revision"),
                    snapshot_path: row.get("snapshot_path"),
                    content_hash: row.get("content_hash"),
                    license: row.get("license"),
                    update_status: row.get("update_status"),
                    check_error: row.get("check_error"),
                    imported_at: row.get("imported_at"),
                    updated_at: row.get("updated_at"),
                    last_checked_at: row.get("last_checked_at"),
                },
                child_skill_count: row.get("child_skill_count"),
                enabled_child_count: row.get("enabled_child_count"),
                has_native_adapters: row.get("has_native_adapters"),
                has_hooks: row.get("has_hooks"),
            })
        })
        .collect()
}

pub async fn get_skill_package_impl(
    pool: &DbPool,
    package_id: &str,
) -> Result<SkillPackageDetail, String> {
    let package = list_skill_packages_impl(pool)
        .await?
        .into_iter()
        .find(|package| package.package.id == package_id)
        .ok_or_else(|| format!("Skill package '{package_id}' not found"))?;
    let skills = sqlx::query_as::<_, PackageSkill>(
        "SELECT ps.package_id, ps.skill_id, ps.relative_path, ps.default_enabled,
                ps.is_required, ps.sort_order, s.name, s.description
         FROM package_skills ps
         JOIN skills s ON s.id = ps.skill_id
         WHERE ps.package_id = ?
         ORDER BY ps.sort_order, lower(s.name)",
    )
    .bind(package_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;
    let adapters = sqlx::query_as::<_, PackagePlatformAdapter>(
        "SELECT * FROM package_platform_adapters
         WHERE package_id = ? ORDER BY agent_id, adapter_kind",
    )
    .bind(package_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(SkillPackageDetail {
        package,
        skills,
        adapters,
    })
}

pub async fn install_skill_package_to_project_impl(
    pool: &DbPool,
    package_id: &str,
    project_id: &str,
    selected_skill_ids: Option<Vec<String>>,
    install_mode: Option<&str>,
    confirm_native_changes: bool,
    method: Option<&str>,
) -> Result<PackageInstallResult, String> {
    let detail = get_skill_package_impl(pool, package_id).await?;
    let install_mode = install_mode.unwrap_or("generic");
    if !["generic", "native"].contains(&install_mode) {
        return Err(format!("Unsupported package install mode '{install_mode}'"));
    }
    if install_mode == "native" {
        if !confirm_native_changes {
            return Err(
                "NATIVE_CHANGE_CONFIRMATION_REQUIRED: 平台原生安装可能修改插件、Hooks 或平台配置，必须先预览并明确确认。"
                    .to_string(),
            );
        }
        if detail.package.has_hooks || detail.adapters.iter().any(|adapter| !adapter.is_verified) {
            return Err(
                "NATIVE_ADAPTER_NOT_VERIFIED: 该技能包包含尚未验证的 Hooks 或平台清单。当前版本不会执行外部脚本，请使用通用安装或等待对应平台适配器。"
                    .to_string(),
            );
        }
    }

    let available = detail
        .skills
        .iter()
        .map(|skill| skill.skill_id.clone())
        .collect::<std::collections::HashSet<_>>();
    let selected = selected_skill_ids.unwrap_or_else(|| {
        detail
            .skills
            .iter()
            .filter(|skill| skill.default_enabled || skill.is_required)
            .map(|skill| skill.skill_id.clone())
            .collect()
    });
    if selected.is_empty() {
        return Err("Select at least one package skill".to_string());
    }
    if let Some(unknown) = selected
        .iter()
        .find(|skill_id| !available.contains(*skill_id))
    {
        return Err(format!(
            "Skill '{unknown}' does not belong to package '{package_id}'"
        ));
    }
    for required in detail.skills.iter().filter(|skill| skill.is_required) {
        if !selected.contains(&required.skill_id) {
            return Err(format!(
                "Required package skill '{}' cannot be deselected",
                required.skill_id
            ));
        }
    }

    let requests = selected
        .iter()
        .map(|skill_id| ProjectInstallRequest {
            skill_id: skill_id.clone(),
            resolution: None,
            renamed_skill_id: None,
        })
        .collect::<Vec<_>>();
    let skill_result =
        batch_install_skills_to_project_impl(pool, project_id, &requests, method).await?;
    let deployment_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let status = if skill_result.failed.is_empty() && skill_result.conflicted.is_empty() {
        "installed"
    } else {
        "partial"
    };
    sqlx::query(
        "INSERT INTO project_package_installations
         (id, project_id, package_id, package_revision, install_mode,
          selected_skill_ids, change_manifest, status, installed_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?, ?)
         ON CONFLICT(project_id, package_id, install_mode) DO UPDATE SET
           package_revision = excluded.package_revision,
           selected_skill_ids = excluded.selected_skill_ids,
           status = excluded.status,
           updated_at = excluded.updated_at",
    )
    .bind(&deployment_id)
    .bind(project_id)
    .bind(package_id)
    .bind(&detail.package.package.installed_revision)
    .bind(install_mode)
    .bind(serde_json::to_string(&selected).map_err(|e| e.to_string())?)
    .bind(status)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(PackageInstallResult {
        deployment_id,
        package_id: package_id.to_string(),
        project_id: project_id.to_string(),
        install_mode: install_mode.to_string(),
        selected_skill_ids: selected,
        skill_result,
    })
}

#[tauri::command]
pub async fn list_skill_packages(
    state: State<'_, AppState>,
) -> Result<Vec<SkillPackageSummary>, String> {
    list_skill_packages_impl(&state.db).await
}

#[tauri::command]
pub async fn get_skill_package(
    state: State<'_, AppState>,
    package_id: String,
) -> Result<SkillPackageDetail, String> {
    get_skill_package_impl(&state.db, &package_id).await
}

#[tauri::command]
pub async fn install_skill_package_to_project(
    state: State<'_, AppState>,
    package_id: String,
    project_id: String,
    selected_skill_ids: Option<Vec<String>>,
    install_mode: Option<String>,
    confirm_native_changes: Option<bool>,
    method: Option<String>,
) -> Result<PackageInstallResult, String> {
    install_skill_package_to_project_impl(
        &state.db,
        &package_id,
        &project_id,
        selected_skill_ids,
        install_mode.as_deref(),
        confirm_native_changes.unwrap_or(false),
        method.as_deref(),
    )
    .await
}
