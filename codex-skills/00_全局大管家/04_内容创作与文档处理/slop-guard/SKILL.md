---
name: slop-guard
description: "规则型散文 AI 腔评分器（Slop Scoring，Agent Skills Hub 实测 4/5）。纯程序化 0-100 打分，无 LLM 裁判、无 API 调用：默认 24 条可配置规则、200+ 字面与结构启发式（破折号密度、名言式收尾、对比句式、套话词组、占位符、节奏失衡等），返回分数+档位标签+逐条违规上下文+具体修改建议；uvx slop-guard 一键起本地 MCP 服务（check_slop / check_slop_file），支持自定义规则 JSONL。Leading Words: AI腔评分, 散文linter, slop检测, 0-100打分, 规则引擎, MCP本地服务, 违规建议"
metadata:
  upstream: "github.com/eric-tramel/slop-guard"
---

# slop-guard · Slop Scoring to Stop Slop

**上游仓库**：<https://github.com/eric-tramel/slop-guard>

规则驱动的散文 linter：给文本的「公式化 AI 写作模式」打 0–100 分。不需要模型、不联网，纯程序化判定。

## 接入方式（MCP，双客户端同命令）

```bash
# Claude Code
claude mcp add slop-guard -- uvx slop-guard
# Codex（或写入 ~/.codex/config.toml 的 [mcp_servers.slop-guard]）
codex mcp add slop-guard -- uvx slop-guard
# 自定义规则集：追加 -c /path/to/config.jsonl
```

也可作为 Python 包/CLI 使用（源码在本目录 `src/slop_guard/`，`pyproject.toml` 可安装）。

## 工具面

- `check_slop`：内存中的文本 → 结构化 JSON 诊断
- `check_slop_file`：磁盘文件 → 同上

Agent 拿到逐条 span 与建议后可直接喂回改写循环。

## 文档索引

- 快速上手：[docs/get-started.md](docs/get-started.md) · Agent 接入细节：[docs/agents.md](docs/agents.md) · 总览：[docs/index.md](docs/index.md)
- 全部规则说明（每条一页，含动机与阈值）：[docs/rules/index.md](docs/rules/index.md)（ai-disclosure、em-dash-density、closing-aphorism、contrast-pair、weasel-phrase、slop-word、rhythm、paragraph-balance 等 24 条）

## 集成说明（本库维护）

- 集成日期：2026-10-10；上游 HEAD：`7ef2113`（2026-07-09）；Agent Skills Hub 2026-10-07 实测 Reads human 4/5、事实全保、检出 5 项（2 项结构层）。
- 瘦身剔除（dev 基建/研究产物）：benchmark 研究目录（含字体与图表脚本）、landing 宣传站、tests、tools 文档站生成器、Makefile、uv.lock、zensical 站点配置、.github/.claude/.codex/.mcp.json/AGENTS 等上游开发配置、docs/stylesheets 站点样式；README 中 benchmark 配图 3 处改写为上游绝对 URL，脚本名为叙述性提及保留。
- 保留 `src/` 全量（引擎、规则库、MCP 服务、CLI、默认规则资产）与 `docs/` 使用文档。
