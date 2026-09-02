---
name: zlibrary-mcp
description: Z-Library 图书检索与下载 MCP 服务。提供基于 Z-Library 的电子书资源搜索与下载能力。
version: 1.4.0
metadata:
    upstream: github.com/rookslog/zlibrary-mcp
---

# Z-Library MCP 服务集成指南

**⚠️ 强制前置要求 (Prerequisite)**:
在执行任何操作前，**必须首先使用 `view_file` 或 `read_url_content` 阅读本目录下的 `README.md`**，以全面掌握 MCP 服务的安装、参数配置、环境变量要求及启动方式。完整参数与 13 个工具的出入参定义见 [docs/api.md](docs/api.md)。

> 本技能为 npm 分发形态的文档层：用户经 `npm install -g zlibrary-mcp` 安装服务本体，本目录仅保留官方文档、配置示例与部署文件。源码级细节一律指向 GitHub 定 tag 链接。

## 1. 核心法则 (Golden Rules)
- **环境安全**：`ZLIBRARY_EMAIL`/`ZLIBRARY_PASSWORD`/`ANNAS_SECRET_KEY` 等凭据只能写入 MCP 客户端配置或环境变量，不得硬编码、不得打印到输出；日志经 stderr 输出，stdout 是 JSON-RPC 协议通道。
- **职责单一**：本技能专门处理电子书的多源检索、下载与 RAG 文本抽取，不承担其他文件操作。
- **优雅降级**：单一来源失败时明确报告来源归属与原因码，并建议切换来源（Z-Library 限额 → LibGen 免账号下载）而非静默重试。

## 2. 能力速览（v1.4.0，13 个工具）

三大来源，能力与门槛不同：

| 来源 | 账号 | 日限额 | 搜索 | 下载 |
|------|------|--------|------|------|
| Library Genesis | 不需要 | 无 | ✅ | ✅（v1.4.0 新增） |
| Z-Library | 需要 | 约 10 本/日 | ✅ | ✅ |
| Anna's Archive | 下载需 API key | 按会员等级 | ✅ | 仅 key 下载 |

- **搜索（7）**：`search_books`、`full_text_search`、`search_by_term`、`search_by_author`、`search_advanced`（模糊匹配）、`search_multi_source`（LibGen / Anna's Archive）、`get_recent_books`
- **元数据（1）**：`get_book_metadata`（词条、描述、评分）
- **合集（1）**：`fetch_booklist`（专家策展书单）
- **下载与处理（2）**：`download_book_to_file`（可带 `process_for_rag`）、`process_document_for_rag`（EPUB/PDF/TXT → 文件型 RAG 输出）
- **实用（2）**：`get_download_limits`（剩余配额）、`get_download_history`

关键行为：无需任何凭据服务即可启动（缺 Z-Library 凭据仅 stderr 警告，LibGen 全功能可用）；RAG 输出落盘到 `./processed_rag_output/` 并只返回文件路径，避免上下文溢出。

## 3. 安装挂载

**前置**：Node.js 22+、Python 3.10+、UV。

**方案 A（推荐）npm 全局安装**：

```bash
npm install -g zlibrary-mcp
cd "$(npm root -g)/zlibrary-mcp" && bash setup-uv.sh --no-dev   # 一次性 Python 桥接环境
```

stdio 挂载配置（模板见 [.mcp.json.example](.mcp.json.example)、[docs/examples/mcp-config-template.md](docs/examples/mcp-config-template.md)）：

```json
{
  "mcpServers": {
    "zlibrary": {
      "command": "zlibrary-mcp",
      "env": {
        "ZLIBRARY_EMAIL": "your-email@example.com",
        "ZLIBRARY_PASSWORD": "your-password"
      }
    }
  }
}
```

**方案 B Docker（HTTP/SSE 传输）**：直接用 GHCR 预构建镜像（含 rag 抽取层），命令与 SSE 校验见 [docker/README.md](docker/README.md)；环境变量模板见 [docker/env.example](docker/env.example)，compose 编排见 [docker/docker-compose.yaml](docker/docker-compose.yaml)。

**方案 C 源码构建（开发）**：不在本技能范围内，参见 GitHub 仓库 `rookslog/zlibrary-mcp` README 的 Option B；旧 pip/venv 安装迁移 UV 见 [docs/MIGRATION_V2.md](docs/MIGRATION_V2.md)。

## 4. 配置要点

- **凭据**（`.env` 模板见 [.env.example](.env.example)）：`ZLIBRARY_EMAIL`、`ZLIBRARY_PASSWORD`（Z-Library 必需）；`ZLIBRARY_MIRROR` 自定义镜像；`ANNAS_SECRET_KEY` 仅 Anna's Archive 下载需要。
- **Python 抽取分层**（详见 [docs/optional-dependencies.md](docs/optional-dependencies.md)）：`uv sync --no-dev` 核心层（搜索/元数据/下载）；`--extra rag` 加 PDF/EPUB 抽取；`--extra scholar` 再加学术版式与 OCR。缺层时服务会返回确切的补装命令。
- **重试与熔断**：`RETRY_MAX_RETRIES`、`RETRY_INITIAL_DELAY`、`CIRCUIT_BREAKER_THRESHOLD` 等均可配，全表见 [docs/RETRY_CONFIGURATION.md](docs/RETRY_CONFIGURATION.md)。
- **日志**：`LOG_LEVEL` 控制级别；`debug` 会记录检索词，提交日志前需脱敏。

## 5. 轨迹驱动执行引擎 (Execution Trajectory)
- **State 0: 需求分析** - 明确书名、作者、ISBN 或全文关键词，并确认用户是否有 Z-Library 账号、是否需要 RAG 抽取。
- **State 1: 配置检查** - 检查 MCP 客户端已挂载 `zlibrary` 服务；Z-Library 工具前确认凭据已配置；抽取前确认 rag/scholar 分层已安装。
- **State 2: 服务调用** - 优先 `search_books`（Z-Library）或 `search_multi_source`（免账号来源）；下载一律把搜索结果作为 `bookDetails` 传给 `download_book_to_file`，不要凭空构造 ID。
- **State 3: 结果返回** - 呈现下载文件路径或 RAG 输出路径（`processed_file_path` 等字段），必要时调用 `get_download_limits` 提示剩余配额。

## 6. 异常处理模式 (Exception Handling)
- **依赖缺失**：Node.js 22+ / Python 3.10+ / UV 缺失时先补齐；PDF/EPUB 报分层缺失时按错误信息执行对应的 `uv sync --no-dev --extra rag|scholar`。
- **来源不可达**：v1.4.0 起错误归属来源并带原因码（`dns_failure` 与 `connect_timeout` 处置不同：换镜像 vs 等恢复）；先运行 `npm run doctor` 区分上游故障与服务缺陷，再查 [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)。
- **下载失败**：Z-Library 检查凭据与日限额（约 10 本/日）；LibGen 链接有效期不足 2.5 小时，过期即重新搜索；Anna's Archive 无 key 不支持免费下载通道，指引用户开 key 或浏览器打开记录页。
- **限额触顶**：主动切换 `search_multi_source` 的 `source: "libgen"`（无账号无限额）。

## 7. 参考文档索引

| 文档 | 内容 |
|------|------|
| [README.md](README.md) | 官方总览：安装、13 工具、三来源、配置、FAQ |
| [docs/api.md](docs/api.md) | 全部工具的参数、类型与示例 |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | 启动失败、连接断开等排障 |
| [docs/RETRY_CONFIGURATION.md](docs/RETRY_CONFIGURATION.md) | 重试、熔断、超时预算全表 |
| [docs/optional-dependencies.md](docs/optional-dependencies.md) | core/rag/scholar 三层依赖边界 |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | 部署路径与平台边界 |
| [docs/MIGRATION_V2.md](docs/MIGRATION_V2.md) | 旧 pip/venv 安装迁移 UV |
| [docs/examples/](docs/examples/mcp-config-template.md)、[docs/installation/](docs/installation/system-wide-setup.md) | MCP 配置模板与系统级安装 |
| [docker/](docker/README.md) | GHCR 镜像与 compose 部署 |
| [.env.example](.env.example) / [.mcp.json.example](.mcp.json.example) | 凭据与挂载配置模板 |
| [CHANGELOG.md](CHANGELOG.md) | 版本历史 |

## 8. v1.4.0 能力变化（本地 1.3.2 → 1.4.0）
- **LibGen 可下载**：`download_book_to_file` 直接接受 `search_multi_source` 结果，镜像 `li → vg → la` 按实际出字节故障转移，无需 Z-Library 凭据——日限额触顶后的完整兜底链路。
- **无凭据可启动**：缺 Z-Library 凭据从进程退出改为 stderr 警告，LibGen-only 安装开箱即用。
- **安全修复**：`annas-archive.is` 从 `ANNAS_TRUSTED_HOSTS` 移除（仿冒站会经 fast-download URL 参数泄露 key）。
- **显式 `source: "annas"` 不再被静默路由到 LibGen**（无 key 搜索属正常能力）。
- 上游组织已由 `loganrooks` 迁移为 `rookslog`（GitHub 重定向生效），本文件 `metadata.upstream` 与所有外链均已指向新地址。
