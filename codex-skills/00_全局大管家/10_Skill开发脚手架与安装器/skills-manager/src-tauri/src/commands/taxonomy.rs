use std::collections::{BTreeSet, HashMap};
use std::fs;
use std::path::Path;

use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Row};
use tauri::State;

use crate::db::{self, DbPool};
use crate::AppState;

pub const CATEGORY_IDS: &[&str] = &[
    "development",
    "ai-data",
    "devops-cloud",
    "testing-quality",
    "security",
    "docs-research",
    "design-creative",
    "automation-productivity",
    "business-ecommerce",
    "other",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryDefinition {
    pub id: String,
    pub label_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SkillTaxonomyRow {
    pub skill_id: String,
    pub primary_category: String,
    pub classification_source: String,
    pub confidence: f64,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillTaxonomy {
    pub skill_id: String,
    pub primary_category: String,
    pub tags: Vec<String>,
    pub classification_source: String,
    pub confidence: f64,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetSkillTaxonomyPayload {
    pub primary_category: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassificationResult {
    pub primary_category: String,
    pub tags: Vec<String>,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ClassificationBatchResult {
    pub classified: Vec<SkillTaxonomy>,
    pub skipped_manual: Vec<String>,
    pub failed: Vec<ClassificationFailure>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassificationFailure {
    pub skill_id: String,
    pub error: String,
}

fn normalized_tag(tag: &str) -> Option<String> {
    let tag = tag
        .trim()
        .to_lowercase()
        .replace([' ', '_'], "-")
        .chars()
        .filter(|character| character.is_ascii_alphanumeric() || *character == '-')
        .collect::<String>();
    if tag.is_empty() || tag.len() > 48 {
        None
    } else {
        Some(tag)
    }
}

fn category_rules() -> Vec<(&'static str, &'static [&'static str])> {
    vec![
        (
            "security",
            &[
                "security",
                "vulnerability",
                "threat",
                "secure",
                "auth",
                "permission",
                "secret",
                "安全",
                "漏洞",
            ],
        ),
        (
            "testing-quality",
            &[
                "test", "testing", "quality", "review", "debug", "lint", "coverage", "测试",
                "评审", "调试",
            ],
        ),
        (
            "devops-cloud",
            &[
                "devops",
                "deploy",
                "deployment",
                "docker",
                "kubernetes",
                "cloud",
                "terraform",
                "ci/cd",
                "pipeline",
                "运维",
                "部署",
                "云",
            ],
        ),
        (
            "ai-data",
            &[
                "machine learning",
                "artificial intelligence",
                "llm",
                "model",
                "data science",
                "analytics",
                "dataset",
                "sql",
                "database",
                "ai",
                "人工智能",
                "数据",
                "模型",
            ],
        ),
        (
            "design-creative",
            &[
                "design",
                "ui",
                "ux",
                "visual",
                "image",
                "video",
                "audio",
                "creative",
                "frontend design",
                "设计",
                "视觉",
                "图片",
                "视频",
            ],
        ),
        (
            "docs-research",
            &[
                "document",
                "documentation",
                "research",
                "report",
                "writing",
                "pdf",
                "presentation",
                "knowledge",
                "文档",
                "研究",
                "报告",
                "写作",
            ],
        ),
        (
            "business-ecommerce",
            &[
                "business",
                "commerce",
                "ecommerce",
                "marketing",
                "sales",
                "customer",
                "finance",
                "product management",
                "商业",
                "电商",
                "营销",
                "销售",
            ],
        ),
        (
            "automation-productivity",
            &[
                "automation",
                "workflow",
                "productivity",
                "browser",
                "email",
                "calendar",
                "slack",
                "notion",
                "自动化",
                "效率",
                "工作流",
            ],
        ),
        (
            "development",
            &[
                "code",
                "coding",
                "developer",
                "frontend",
                "backend",
                "api",
                "react",
                "typescript",
                "javascript",
                "python",
                "rust",
                "mobile",
                "programming",
                "开发",
                "编程",
                "前端",
                "后端",
            ],
        ),
    ]
}

pub fn classify_skill_text(
    name: &str,
    description: Option<&str>,
    content: &str,
) -> ClassificationResult {
    let haystack =
        format!("{}\n{}\n{}", name, description.unwrap_or_default(), content).to_lowercase();
    let rules = category_rules();
    let mut scores: HashMap<&str, usize> = HashMap::new();
    let mut tags = BTreeSet::new();

    for (category, keywords) in &rules {
        for keyword in *keywords {
            let occurrences = haystack.matches(keyword).count();
            if occurrences > 0 {
                *scores.entry(category).or_default() += occurrences.min(3);
                if keyword.is_ascii() && keyword.len() >= 3 {
                    if let Some(tag) = normalized_tag(keyword) {
                        tags.insert(tag);
                    }
                }
            }
        }
    }

    let mut ranked = scores.into_iter().collect::<Vec<_>>();
    ranked.sort_by(|left, right| right.1.cmp(&left.1).then_with(|| left.0.cmp(right.0)));
    let (primary_category, top_score) = ranked.first().copied().unwrap_or(("other", 0));
    let second_score = ranked.get(1).map(|entry| entry.1).unwrap_or(0);
    let confident = top_score >= 2 && (top_score > second_score || top_score >= 4);
    let category = if confident { primary_category } else { "other" };
    let confidence = if top_score == 0 {
        0.0
    } else {
        (top_score as f64 / (top_score + second_score.max(1)) as f64).min(0.99)
    };
    tags.insert(category.to_string());

    ClassificationResult {
        primary_category: category.to_string(),
        tags: tags.into_iter().take(8).collect(),
        confidence,
    }
}

async fn taxonomy_for_skill(
    pool: &DbPool,
    skill_id: &str,
) -> Result<Option<SkillTaxonomy>, String> {
    let Some(row) =
        sqlx::query_as::<_, SkillTaxonomyRow>("SELECT * FROM skill_taxonomy WHERE skill_id = ?")
            .bind(skill_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?
    else {
        return Ok(None);
    };
    let tags = sqlx::query("SELECT tag FROM skill_tags WHERE skill_id = ? ORDER BY tag")
        .bind(skill_id)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|row| row.get("tag"))
        .collect();
    Ok(Some(SkillTaxonomy {
        skill_id: row.skill_id,
        primary_category: row.primary_category,
        tags,
        classification_source: row.classification_source,
        confidence: row.confidence,
        updated_at: row.updated_at,
    }))
}

async fn write_taxonomy(
    pool: &DbPool,
    skill_id: &str,
    primary_category: &str,
    tags: &[String],
    source: &str,
    confidence: f64,
) -> Result<SkillTaxonomy, String> {
    if !CATEGORY_IDS.contains(&primary_category) {
        return Err(format!("Unknown skill category '{primary_category}'"));
    }
    let mut normalized_tags = tags
        .iter()
        .filter_map(|tag| normalized_tag(tag))
        .collect::<BTreeSet<_>>();
    normalized_tags.insert(primary_category.to_string());
    let now = Utc::now().to_rfc3339();
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    sqlx::query(
        "INSERT INTO skill_taxonomy
         (skill_id, primary_category, classification_source, confidence, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(skill_id) DO UPDATE SET
           primary_category = excluded.primary_category,
           classification_source = excluded.classification_source,
           confidence = excluded.confidence,
           updated_at = excluded.updated_at",
    )
    .bind(skill_id)
    .bind(primary_category)
    .bind(source)
    .bind(confidence)
    .bind(&now)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM skill_tags WHERE skill_id = ?")
        .bind(skill_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    for tag in &normalized_tags {
        sqlx::query("INSERT INTO skill_tags (skill_id, tag) VALUES (?, ?)")
            .bind(skill_id)
            .bind(tag)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(SkillTaxonomy {
        skill_id: skill_id.to_string(),
        primary_category: primary_category.to_string(),
        tags: normalized_tags.into_iter().collect(),
        classification_source: source.to_string(),
        confidence,
        updated_at: now,
    })
}

pub async fn ensure_taxonomy_for_skill(
    pool: &DbPool,
    skill_id: &str,
) -> Result<SkillTaxonomy, String> {
    if let Some(existing) = taxonomy_for_skill(pool, skill_id).await? {
        return Ok(existing);
    }
    classify_one(pool, skill_id, false).await
}

async fn classify_one(pool: &DbPool, skill_id: &str, force: bool) -> Result<SkillTaxonomy, String> {
    if let Some(existing) = taxonomy_for_skill(pool, skill_id).await? {
        if existing.classification_source == "manual" || !force {
            return Ok(existing);
        }
    }
    let skill = db::get_skill_by_id(pool, skill_id)
        .await?
        .ok_or_else(|| format!("Skill '{skill_id}' not found"))?;
    let content = fs::read_to_string(Path::new(&skill.file_path)).unwrap_or_default();
    let classification = classify_skill_text(&skill.name, skill.description.as_deref(), &content);
    write_taxonomy(
        pool,
        skill_id,
        &classification.primary_category,
        &classification.tags,
        "automatic",
        classification.confidence,
    )
    .await
}

pub async fn auto_classify_skills_impl(
    pool: &DbPool,
    skill_ids: Option<Vec<String>>,
    force: bool,
) -> Result<ClassificationBatchResult, String> {
    let ids = match skill_ids {
        Some(ids) => ids,
        None => db::get_central_skills(pool)
            .await?
            .into_iter()
            .map(|skill| skill.id)
            .collect(),
    };
    let mut result = ClassificationBatchResult::default();
    for skill_id in ids {
        if taxonomy_for_skill(pool, &skill_id)
            .await?
            .is_some_and(|taxonomy| taxonomy.classification_source == "manual")
        {
            result.skipped_manual.push(skill_id);
            continue;
        }
        match classify_one(pool, &skill_id, force).await {
            Ok(taxonomy) => result.classified.push(taxonomy),
            Err(error) => result
                .failed
                .push(ClassificationFailure { skill_id, error }),
        }
    }
    Ok(result)
}

#[tauri::command]
pub async fn list_skill_categories() -> Result<Vec<CategoryDefinition>, String> {
    Ok(CATEGORY_IDS
        .iter()
        .map(|id| CategoryDefinition {
            id: (*id).to_string(),
            label_key: format!("skillCategories.{id}"),
        })
        .collect())
}

#[tauri::command]
pub async fn get_skill_taxonomy(
    state: State<'_, AppState>,
    skill_id: String,
) -> Result<SkillTaxonomy, String> {
    ensure_taxonomy_for_skill(&state.db, &skill_id).await
}

#[tauri::command]
pub async fn set_skill_taxonomy(
    state: State<'_, AppState>,
    skill_id: String,
    payload: SetSkillTaxonomyPayload,
) -> Result<SkillTaxonomy, String> {
    db::get_skill_by_id(&state.db, &skill_id)
        .await?
        .ok_or_else(|| format!("Skill '{skill_id}' not found"))?;
    write_taxonomy(
        &state.db,
        &skill_id,
        &payload.primary_category,
        &payload.tags,
        "manual",
        1.0,
    )
    .await
}

#[tauri::command]
pub async fn auto_classify_skills(
    state: State<'_, AppState>,
    skill_ids: Option<Vec<String>>,
    force: Option<bool>,
) -> Result<ClassificationBatchResult, String> {
    auto_classify_skills_impl(&state.db, skill_ids, force.unwrap_or(false)).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{self, Skill};
    use sqlx::SqlitePool;

    #[test]
    fn classifies_clear_examples_and_uses_other_for_low_confidence() {
        let security = classify_skill_text(
            "security-review",
            Some("Review vulnerabilities and secrets"),
            "# Security\nThreat analysis and secure authentication",
        );
        assert_eq!(security.primary_category, "security");
        let unknown = classify_skill_text("helper", Some("Helps with things"), "# Helper");
        assert_eq!(unknown.primary_category, "other");
    }

    #[tokio::test]
    async fn manual_classification_survives_automatic_runs() {
        let pool = SqlitePool::connect(":memory:").await.unwrap();
        db::init_database(&pool).await.unwrap();
        db::upsert_skill(
            &pool,
            &Skill {
                id: "manual".to_string(),
                name: "Security Tool".to_string(),
                description: Some("security vulnerability".to_string()),
                file_path: "missing.md".to_string(),
                canonical_path: None,
                is_central: true,
                source: None,
                content: None,
                scanned_at: Utc::now().to_rfc3339(),
            },
        )
        .await
        .unwrap();
        write_taxonomy(
            &pool,
            "manual",
            "docs-research",
            &["writing".to_string()],
            "manual",
            1.0,
        )
        .await
        .unwrap();
        let result = auto_classify_skills_impl(&pool, Some(vec!["manual".to_string()]), true)
            .await
            .unwrap();
        assert_eq!(result.skipped_manual, vec!["manual"]);
        assert_eq!(
            taxonomy_for_skill(&pool, "manual")
                .await
                .unwrap()
                .unwrap()
                .primary_category,
            "docs-research"
        );
    }
}
