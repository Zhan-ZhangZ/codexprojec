use chrono::{Duration, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::Row;
use std::collections::{BTreeMap, HashSet};
use tauri::State;

use crate::db::{self, DbPool};
use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceTrendItem {
    pub source: String,
    pub candidate_id: String,
    pub name: String,
    pub source_url: String,
    pub description: Option<String>,
    pub stars: Option<i64>,
    pub forks: Option<i64>,
    pub likes: Option<i64>,
    pub downloads: Option<i64>,
    pub engagement: Option<f64>,
    pub skill_count: i64,
    pub captured_at: String,
    pub window_days: i64,
    pub trend_value: f64,
    pub is_estimated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendSourceRefreshResult {
    pub source: String,
    pub status: String,
    pub captured: usize,
    pub error: Option<String>,
}

#[derive(Debug, Clone)]
struct TrendSnapshot {
    source: String,
    candidate_id: String,
    name: String,
    source_url: String,
    description: Option<String>,
    stars: Option<i64>,
    forks: Option<i64>,
    likes: Option<i64>,
    downloads: Option<i64>,
    engagement: Option<f64>,
    skill_count: i64,
    metadata_json: String,
}

async fn upsert_snapshot(pool: &DbPool, snapshot: &TrendSnapshot) -> Result<(), String> {
    let now = Utc::now();
    sqlx::query(
        "INSERT INTO marketplace_trend_snapshots
         (source, candidate_id, captured_date, captured_at, name, source_url,
          description, stars, forks, likes, downloads, engagement, skill_count,
          metadata_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(source, candidate_id, captured_date) DO UPDATE SET
           captured_at = excluded.captured_at,
           name = excluded.name,
           source_url = excluded.source_url,
           description = excluded.description,
           stars = excluded.stars,
           forks = excluded.forks,
           likes = excluded.likes,
           downloads = excluded.downloads,
           engagement = excluded.engagement,
           skill_count = excluded.skill_count,
           metadata_json = excluded.metadata_json",
    )
    .bind(&snapshot.source)
    .bind(&snapshot.candidate_id)
    .bind(now.date_naive().to_string())
    .bind(now.to_rfc3339())
    .bind(&snapshot.name)
    .bind(&snapshot.source_url)
    .bind(&snapshot.description)
    .bind(snapshot.stars)
    .bind(snapshot.forks)
    .bind(snapshot.likes)
    .bind(snapshot.downloads)
    .bind(snapshot.engagement)
    .bind(snapshot.skill_count)
    .bind(&snapshot.metadata_json)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn parse_github_repo(url: &str) -> Option<(String, String)> {
    let trimmed = url.trim().trim_end_matches('/').trim_end_matches(".git");
    let marker = "github.com/";
    let start = trimmed.to_ascii_lowercase().find(marker)? + marker.len();
    let mut parts = trimmed[start..].split('/');
    let owner = parts.next()?.trim();
    let repo = parts.next()?.split(['?', '#']).next()?.trim();
    if owner.is_empty() || repo.is_empty() {
        None
    } else {
        Some((owner.to_string(), repo.to_string()))
    }
}

async fn github_candidates(pool: &DbPool) -> Result<Vec<(String, String)>, String> {
    let mut values = vec![
        (
            "https://github.com/obra/superpowers".to_string(),
            "trusted".to_string(),
        ),
        (
            "https://github.com/anthropics/skills".to_string(),
            "trusted".to_string(),
        ),
    ];
    let rows = sqlx::query(
        "SELECT repository_url FROM skill_sources
         WHERE repository_url IS NOT NULL AND repository_url <> ''
         UNION
         SELECT source_url FROM marketplace_subscriptions
         WHERE source = 'github' AND is_enabled = 1",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;
    for row in rows {
        values.push((row.get::<String, _>(0), "tracked".to_string()));
    }
    let mut seen = HashSet::new();
    values.retain(|(url, _)| {
        parse_github_repo(url)
            .map(|(owner, repo)| seen.insert(format!("{owner}/{repo}").to_ascii_lowercase()))
            .unwrap_or(false)
    });
    Ok(values)
}

async fn refresh_github(pool: &DbPool) -> Result<usize, String> {
    let token = db::get_setting(pool, "github_pat")
        .await?
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let client = reqwest::Client::builder()
        .user_agent("skills-manager/0.11.0")
        .build()
        .map_err(|e| e.to_string())?;
    let mut captured = 0;
    let mut errors = Vec::new();
    for (url, origin) in github_candidates(pool).await? {
        let Some((owner, repo)) = parse_github_repo(&url) else {
            continue;
        };
        let mut request = client.get(format!("https://api.github.com/repos/{owner}/{repo}"));
        if let Some(token) = &token {
            request = request.bearer_auth(token);
        }
        match request.send().await {
            Ok(response) if response.status().is_success() => {
                let body = response.json::<Value>().await.map_err(|e| e.to_string())?;
                let full_name = body["full_name"].as_str().unwrap_or(&repo).to_string();
                let skill_count: i64 = sqlx::query_scalar(
                    "SELECT COUNT(*) FROM skill_sources
                     WHERE lower(repository_url) = lower(?)",
                )
                .bind(format!("https://github.com/{owner}/{repo}"))
                .fetch_one(pool)
                .await
                .unwrap_or(0);
                upsert_snapshot(
                    pool,
                    &TrendSnapshot {
                        source: "github".to_string(),
                        candidate_id: full_name.to_ascii_lowercase(),
                        name: full_name,
                        source_url: body["html_url"].as_str().unwrap_or(&url).to_string(),
                        description: body["description"].as_str().map(str::to_string),
                        stars: body["stargazers_count"].as_i64(),
                        forks: body["forks_count"].as_i64(),
                        likes: None,
                        downloads: None,
                        engagement: None,
                        skill_count: skill_count.max(1),
                        metadata_json: serde_json::json!({
                            "origin": origin,
                            "updated_at": body["updated_at"],
                        })
                        .to_string(),
                    },
                )
                .await?;
                captured += 1;
            }
            Ok(response) => errors.push(format!("{owner}/{repo}: HTTP {}", response.status())),
            Err(error) => errors.push(format!("{owner}/{repo}: {error}")),
        }
    }
    if captured == 0 && !errors.is_empty() {
        Err(errors.join("; "))
    } else {
        Ok(captured)
    }
}

fn hf_api_url(kind: &str) -> String {
    format!(
        "https://huggingface.co/api/{kind}?search=skill&sort=trendingScore&direction=-1&limit=12"
    )
}

async fn hf_has_skill_signal(
    client: &reqwest::Client,
    kind: &str,
    id: &str,
) -> Result<bool, String> {
    let prefix = match kind {
        "datasets" => format!("datasets/{id}"),
        "spaces" => format!("spaces/{id}"),
        _ => id.to_string(),
    };
    let skill_url = format!("https://huggingface.co/{prefix}/raw/main/SKILL.md");
    if let Ok(response) = client.get(&skill_url).send().await {
        if response.status().is_success() {
            return Ok(true);
        }
    }
    let readme_url = format!("https://huggingface.co/{prefix}/raw/main/README.md");
    let response = client
        .get(readme_url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Ok(false);
    }
    let text = response.text().await.map_err(|e| e.to_string())?;
    let lower = text.to_ascii_lowercase();
    Ok(lower.contains("skill.md")
        || (lower.contains("github.com/") && lower.contains("agent skill")))
}

async fn refresh_huggingface(pool: &DbPool) -> Result<usize, String> {
    let client = reqwest::Client::builder()
        .user_agent("skills-manager/0.11.0")
        .build()
        .map_err(|e| e.to_string())?;
    let mut captured = 0;
    for kind in ["models", "datasets", "spaces"] {
        let response = client
            .get(hf_api_url(kind))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !response.status().is_success() {
            continue;
        }
        let items = response
            .json::<Vec<Value>>()
            .await
            .map_err(|e| e.to_string())?;
        for item in items.into_iter().take(8) {
            let Some(id) = item["id"].as_str().or_else(|| item["modelId"].as_str()) else {
                continue;
            };
            if !hf_has_skill_signal(&client, kind, id)
                .await
                .unwrap_or(false)
            {
                continue;
            }
            let source_url = match kind {
                "datasets" => format!("https://huggingface.co/datasets/{id}"),
                "spaces" => format!("https://huggingface.co/spaces/{id}"),
                _ => format!("https://huggingface.co/{id}"),
            };
            upsert_snapshot(
                pool,
                &TrendSnapshot {
                    source: "huggingface".to_string(),
                    candidate_id: format!("{kind}:{id}"),
                    name: id.to_string(),
                    source_url,
                    description: None,
                    stars: None,
                    forks: None,
                    likes: item["likes"].as_i64(),
                    downloads: item["downloads"].as_i64(),
                    engagement: item["trendingScore"].as_f64(),
                    skill_count: 1,
                    metadata_json: serde_json::json!({"kind": kind}).to_string(),
                },
            )
            .await?;
            captured += 1;
        }
    }
    Ok(captured)
}

fn github_urls_from_text(text: &str) -> Vec<String> {
    text.split_whitespace()
        .filter_map(|token| {
            let clean = token.trim_matches(|c: char| {
                matches!(c, '(' | ')' | '[' | ']' | '<' | '>' | ',' | '"' | '\'')
            });
            parse_github_repo(clean)
                .map(|(owner, repo)| format!("https://github.com/{owner}/{repo}"))
        })
        .collect()
}

async fn refresh_x(pool: &DbPool) -> Result<usize, String> {
    let token = db::get_setting(pool, "x_bearer_token")
        .await?
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "未配置 X Bearer Token".to_string())?;
    let client = reqwest::Client::builder()
        .user_agent("skills-manager/0.11.0")
        .build()
        .map_err(|e| e.to_string())?;
    let response = client
        .get("https://api.x.com/2/tweets/search/recent")
        .bearer_auth(token)
        .query(&[
            (
                "query",
                "(\"SKILL.md\" OR \"agent skills\") github.com -is:retweet",
            ),
            ("max_results", "100"),
            ("tweet.fields", "created_at,public_metrics"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("X 最近搜索失败：HTTP {}", response.status()));
    }
    let body = response.json::<Value>().await.map_err(|e| e.to_string())?;
    let mut repos: BTreeMap<String, (String, f64, i64)> = BTreeMap::new();
    for tweet in body["data"].as_array().into_iter().flatten() {
        let text = tweet["text"].as_str().unwrap_or_default();
        let metrics = &tweet["public_metrics"];
        let likes = metrics["like_count"].as_i64().unwrap_or(0);
        let reposts = metrics["retweet_count"].as_i64().unwrap_or(0);
        let replies = metrics["reply_count"].as_i64().unwrap_or(0);
        let quotes = metrics["quote_count"].as_i64().unwrap_or(0);
        let score = likes as f64 + reposts as f64 * 2.0 + replies as f64 + quotes as f64 * 1.5;
        for url in github_urls_from_text(text) {
            let entry = repos.entry(url.clone()).or_insert((url, 0.0, 0));
            entry.1 += score;
            entry.2 += 1;
        }
    }
    for (candidate_id, (url, engagement, mentions)) in &repos {
        upsert_snapshot(
            pool,
            &TrendSnapshot {
                source: "x".to_string(),
                candidate_id: candidate_id.clone(),
                name: parse_github_repo(url)
                    .map(|(owner, repo)| format!("{owner}/{repo}"))
                    .unwrap_or_else(|| url.clone()),
                source_url: url.clone(),
                description: Some(format!("近 7 天 X 上 {mentions} 条相关讨论")),
                stars: None,
                forks: None,
                likes: None,
                downloads: None,
                engagement: Some(*engagement),
                skill_count: 1,
                metadata_json: serde_json::json!({"mentions": mentions}).to_string(),
            },
        )
        .await?;
    }
    Ok(repos.len())
}

pub async fn refresh_marketplace_trends_impl(
    pool: &DbPool,
    requested_source: Option<&str>,
) -> Result<Vec<TrendSourceRefreshResult>, String> {
    let sources = requested_source
        .map(|source| vec![source])
        .unwrap_or_else(|| vec!["github", "x", "huggingface"]);
    let mut results = Vec::new();
    for source in sources {
        let result = match source {
            "github" => refresh_github(pool).await,
            "x" => refresh_x(pool).await,
            "huggingface" => refresh_huggingface(pool).await,
            _ => Err(format!("Unsupported trend source '{source}'")),
        };
        results.push(match result {
            Ok(captured) => TrendSourceRefreshResult {
                source: source.to_string(),
                status: "success".to_string(),
                captured,
                error: None,
            },
            Err(error) => TrendSourceRefreshResult {
                source: source.to_string(),
                status: if source == "x" && error.contains("未配置") {
                    "not_configured".to_string()
                } else {
                    "error".to_string()
                },
                captured: 0,
                error: Some(error),
            },
        });
    }
    Ok(results)
}

fn primary_value(row: &sqlx::sqlite::SqliteRow) -> f64 {
    row.get::<Option<i64>, _>("stars")
        .map(|value| value as f64)
        .or_else(|| row.get::<Option<f64>, _>("engagement"))
        .or_else(|| row.get::<Option<i64>, _>("likes").map(|value| value as f64))
        .or_else(|| {
            row.get::<Option<i64>, _>("downloads")
                .map(|value| value as f64)
        })
        .unwrap_or(0.0)
}

pub async fn list_marketplace_trends_impl(
    pool: &DbPool,
    source: Option<&str>,
    window_days: i64,
) -> Result<Vec<MarketplaceTrendItem>, String> {
    if ![7, 30].contains(&window_days) {
        return Err("Trend window must be 7 or 30 days".to_string());
    }
    let latest_rows = if let Some(source) = source {
        sqlx::query(
            "SELECT s.* FROM marketplace_trend_snapshots s
             JOIN (
               SELECT source, candidate_id, MAX(captured_at) AS captured_at
               FROM marketplace_trend_snapshots WHERE source = ?
               GROUP BY source, candidate_id
             ) latest
             ON latest.source = s.source
             AND latest.candidate_id = s.candidate_id
             AND latest.captured_at = s.captured_at",
        )
        .bind(source)
        .fetch_all(pool)
        .await
    } else {
        sqlx::query(
            "SELECT s.* FROM marketplace_trend_snapshots s
             JOIN (
               SELECT source, candidate_id, MAX(captured_at) AS captured_at
               FROM marketplace_trend_snapshots GROUP BY source, candidate_id
             ) latest
             ON latest.source = s.source
             AND latest.candidate_id = s.candidate_id
             AND latest.captured_at = s.captured_at",
        )
        .fetch_all(pool)
        .await
    }
    .map_err(|e| e.to_string())?;
    let target_date: NaiveDate = Utc::now().date_naive() - Duration::days(window_days);
    let mut items = Vec::new();
    for row in latest_rows {
        let item_source: String = row.get("source");
        let candidate_id: String = row.get("candidate_id");
        let baseline = sqlx::query(
            "SELECT * FROM marketplace_trend_snapshots
             WHERE source = ? AND candidate_id = ? AND captured_date <= ?
             ORDER BY captured_date DESC LIMIT 1",
        )
        .bind(&item_source)
        .bind(&candidate_id)
        .bind(target_date.to_string())
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;
        let current = primary_value(&row);
        let (trend_value, is_estimated) = baseline
            .map(|baseline| ((current - primary_value(&baseline)).max(0.0), false))
            .unwrap_or_else(|| {
                let proxy = match item_source.as_str() {
                    "github" => current.sqrt(),
                    _ => current,
                };
                (proxy, true)
            });
        items.push(MarketplaceTrendItem {
            source: item_source,
            candidate_id,
            name: row.get("name"),
            source_url: row.get("source_url"),
            description: row.get("description"),
            stars: row.get("stars"),
            forks: row.get("forks"),
            likes: row.get("likes"),
            downloads: row.get("downloads"),
            engagement: row.get("engagement"),
            skill_count: row.get("skill_count"),
            captured_at: row.get("captured_at"),
            window_days,
            trend_value,
            is_estimated,
        });
    }
    items.sort_by(|left, right| {
        right
            .trend_value
            .partial_cmp(&left.trend_value)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| left.name.cmp(&right.name))
    });
    Ok(items)
}

#[tauri::command]
pub async fn refresh_marketplace_trends(
    state: State<'_, AppState>,
    source: Option<String>,
) -> Result<Vec<TrendSourceRefreshResult>, String> {
    refresh_marketplace_trends_impl(&state.db, source.as_deref()).await
}

#[tauri::command]
pub async fn list_marketplace_trends(
    state: State<'_, AppState>,
    source: Option<String>,
    window_days: Option<i64>,
) -> Result<Vec<MarketplaceTrendItem>, String> {
    list_marketplace_trends_impl(&state.db, source.as_deref(), window_days.unwrap_or(7)).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    use sqlx::SqlitePool;

    async fn test_pool() -> DbPool {
        let pool = SqlitePool::connect(":memory:").await.unwrap();
        db::init_database(&pool).await.unwrap();
        pool
    }

    async fn insert_github_snapshot(pool: &DbPool, date: NaiveDate, stars: i64) {
        sqlx::query(
            "INSERT INTO marketplace_trend_snapshots
             (source, candidate_id, captured_date, captured_at, name, source_url,
              stars, skill_count, metadata_json)
             VALUES ('github', 'owner/repo', ?, ?, 'owner/repo',
                     'https://github.com/owner/repo', ?, 3, '{}')",
        )
        .bind(date.to_string())
        .bind(format!("{date}T12:00:00Z"))
        .bind(stars)
        .execute(pool)
        .await
        .unwrap();
    }

    #[tokio::test]
    async fn reports_real_growth_when_a_window_baseline_exists() {
        let pool = test_pool().await;
        let today = Utc::now().date_naive();
        insert_github_snapshot(&pool, today - Duration::days(8), 100).await;
        insert_github_snapshot(&pool, today, 145).await;

        let items = list_marketplace_trends_impl(&pool, Some("github"), 7)
            .await
            .unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].trend_value, 45.0);
        assert!(!items[0].is_estimated);
    }

    #[tokio::test]
    async fn marks_cold_start_scores_as_estimates() {
        let pool = test_pool().await;
        insert_github_snapshot(&pool, Utc::now().date_naive(), 144).await;

        let items = list_marketplace_trends_impl(&pool, Some("github"), 30)
            .await
            .unwrap();
        assert_eq!(items[0].trend_value, 12.0);
        assert!(items[0].is_estimated);
    }

    #[test]
    fn extracts_and_normalizes_github_links_from_social_text() {
        let urls = github_urls_from_text(
            "Try https://github.com/obra/superpowers, and https://github.com/obra/superpowers.git",
        );
        assert_eq!(
            urls,
            vec![
                "https://github.com/obra/superpowers",
                "https://github.com/obra/superpowers"
            ]
        );
    }
}
