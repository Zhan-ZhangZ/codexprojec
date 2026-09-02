---
name: mcp-github-pr-issue-analyser
description: 基于 MCP 协议的 GitHub PR 审查与 Issue 管理服务器。将复杂的 PR Diff 抓取、Issue 生命周期流转封装为标准工具协议。Leading Words: MCP协议服务, GitHub PR深度分析, Issue生命周期自动化管理, MCP工具集成
version: v32.0.0
metadata:
  upstream: github.com/saidsef/mcp-github-pr-issue-analyser
---

# mcp-github-pr-issue-analyser

把 GitHub 仓库管理能力接进任意 MCP 客户端的服务器：48 个工具覆盖 PR 分析与合并、Issue/标签/里程碑流转、tag 与 release 管理、Projects v2 项目板、用户活跃度查询，另附 9 篇随服务器分发的 `skill://` 工作流指引。stdio / HTTP 双传输，静态 token 或 GitHub OAuth2（按调用者身份审计）鉴权。

## 前置依赖（本技能包不含，需客户自行准备）

- **uv**（提供 `uvx`）：服务器代码由 `uvx` 直接从上游 GitHub 仓库拉取运行，本地无需克隆源码；本技能包只保留官方文档层与 K8s 清单
- **GitHub 令牌**：PAT 需 `repo` scope（读组织成员需 `read:org`）；项目板工具需 `read:project`（读）/ `project`（写），`repo` 不覆盖

## 安装挂载

stdio 最简形态（Claude Desktop / Claude Code / Cursor 通用）：

```json
{
  "mcpServers": {
    "github_prs_issues": {
      "command": "uvx",
      "args": ["https://github.com/saidsef/mcp-github-pr-issue-analyser.git"],
      "env": { "GITHUB_TOKEN": "<your-github-token>" }
    }
  }
}
```

- 各客户端现成片段（Codex TOML、VS Code、Claude Code CLI / `codex mcp add`、远程 HTTP + OAuth2 免 token 配置）：[docs/mcp-clients.md](docs/mcp-clients.md)
- 运行模式（stdio / HTTP / Docker 发布镜像 / Kustomize 上 K8s）：[docs/installation.md](docs/installation.md)

## 核心能力（服务端 48 个工具，全表见 [docs/tools.md](docs/tools.md)）

| 分组 | 代表工具 |
| --- | --- |
| PR 分析与审查 | `get_pr_diff`（限额+全量尺寸）、`get_pr_linked_issues`、`get_pr_status_checks`、`add_inline_pr_comment`、`update_reviews`（approve / request changes） |
| PR 管理 | `create_pr`、`set_pr_draft`、`update_pr_branch`、`merge_pr`（merge/squash/rebase）、`update_pr_comment` / `reply_to_review_comment`（改写已发评论） |
| Issue / 标签 / 里程碑 | `create_issue`、`update_issue`、`search_issues_prs`、`create_milestone`、`set_issue_milestone` |
| tag 与 release | `create_tag`、`create_release`、`update_release`、`delete_release` / `delete_tag`（destructive） |
| Projects v2 项目板 | `add_to_project`、`set_project_field`（GraphQL，REST 无此面） |
| 用户与活跃度 | `search_user`、`get_user_activities`、`get_repo_stars_since`（GraphQL，带截断标记） |

长耗时读工具以 task 注册，客户端可轮询不阻塞。

## 配置要点

- 鉴权三模式按环境变量自动选定：stdio 免鉴权 → `MCP_ENABLE_REMOTE=true` 静态 token → 三变量齐全走 GitHub OAuth2；完整变量表（端口、超时、diff 限额、ETag 条件请求缓存、日志级别）见 [docs/configuration.md](docs/configuration.md)
- 多副本部署需共享 token store：`REDIS_HOST_PORT` 或 `DYNAMODB_TABLE_ARN`（后者附最小 IAM policy 与 EKS IRSA 注解说明，同页）
- HTTP 模式 `GET /metrics` 免鉴权暴露 Prometheus 指标，抓取配置与常用 PromQL 见 [docs/metrics.md](docs/metrics.md)
- Kubernetes 清单在本包 [deployment/](deployment/)：`kubectl apply -k deployment/`，Secret/ConfigMap 键位表见 installation 页

## v32.0.0 相对本地旧版（31.x，2026-07 集成）变化要点

- **工具面大幅扩张**：新增 Projects v2 项目板（5 工具）、release 更正/撤回与 `delete_tag`、里程碑管理、PR 评论改写与回复、`set_pr_draft` / `update_pr_branch`、`list_repos`、star 增长榜；工作流指引从 6 篇增至 9 篇（新增 error-handling、interactive-ui、project-boards）
- **文档重组为 mkdocs 站点**（`docs/` 六页，同步发布 Read the Docs），ASCII 架构图改为 SVG（[docs/architecture.svg](docs/architecture.svg)）
- **运维能力**：新增 DynamoDB token store、`JWT_SIGNING_KEY`、ETag 条件请求缓存（304 不计费限流）、`GITHUB_API_CONNECT_TIMEOUT` 独立连接超时
- v32.0.0 本体：403 时保留 GitHub 原始错误信息（#376）

## 引用索引

- [README.md](README.md) — 官方总览与快速开始
- [docs/tools.md](docs/tools.md) — 全量工具清单与 `skill://` 资源目录
- [docs/installation.md](docs/installation.md) — 安装与运行（源码 / Docker / Kubernetes）
- [docs/configuration.md](docs/configuration.md) — 鉴权模式、环境变量、OAuth App、token store、IAM policy、PAT scope
- [docs/mcp-clients.md](docs/mcp-clients.md) — 各客户端现成配置与连通性验证
- [docs/architecture.md](docs/architecture.md) — 分层架构与请求路径
- [docs/metrics.md](docs/metrics.md) — Prometheus 端点与抓取
- [deployment/](deployment/) — Kustomize K8s 清单（base + overlays）
