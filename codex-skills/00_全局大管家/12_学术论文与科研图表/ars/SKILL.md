---
name: academic-research-skills-codex
description: "ARS 学术研究全流程套件 (ARS-Codex)。深度文献调研、系统性综述与 Meta 分析、苏格拉底式选题收敛、IMRaD 论文写作与修改、引用核查与学术诚信门、审稿模拟与编辑决策信、科研到论文全流水线、实验方案设计与统计解读一站式覆盖，支持 ars-plan / ars-reviewer / ars-full 等别名指令直达对应工作流。Leading Words: 深度文献调研, 系统性综述, Meta分析, 论文写作修改, 审稿模拟, 引用核查, 学术诚信, 实验设计, 选题收敛, ars指令"
metadata:
  version: "3.21.1"
  upstream: "github.com/Imbad0202/academic-research-skills"
  upstream_commit: "94436237"
  layout: "upstream-flat"
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch, Bash(uv *), Bash(python *), Bash(python3 *)
---

# ARS-Codex（学术研究全流程套件）

上游 ARS 套件的完整集成，四个能力工作流 + 27 种模式 + 16 条 `ars-*` 指令。
本文件是唯一入口路由；按用户意图选择一个工作流后再加载对应文件，**禁止默认全量加载**。

## First Rule（懒加载）

1. 先按下方路由表确定用户意图对应的工作流；
2. 只在需要高级参数、配置、环境变量时才读 `README.md`（英文）/ `README.zh-CN.md`（中文）；
3. 进入工作流后读该工作流目录的说明与 `WORKFLOW.md`（如有），只加载当前阶段需要的
   agent / reference / template / shared 文件；
4. 所有模式的总注册表是 `MODE_REGISTRY.md`——查模式触发词与输出形态以它为准。

## Workflow Router（按意图选择）

| 用户意图 | 工作流目录 | 典型指令 |
|---|---|---|
| 深度文献调研 / 快速简报 / 系统性综述(PRSMA) / 事实核查 / 苏格拉底选题 | `deep-research/` | `ars-lit-review`, `ars-plan`, `ars-3w` |
| IMRaD 论文写作 / 大纲 / 摘要 / 修订 | `academic-paper/` | `ars-outline`, `ars-abstract`, `ars-revision` |
| 模拟同行评审 / 编辑决策信 / rebuttal 审计 | `academic-paper-reviewer/` | `ars-reviewer`, `ars-rebuttal-audit` |
| 科研到论文端到端全流水线（10 阶段） | `academic-pipeline/` | `ars-full` |
| 引用核查 / 诚信披露 / 格式转换等横切操作 | `commands/` + `scripts/` | `ars-citation-check`, `ars-disclosure`, `ars-format-convert` |

`commands/` 下每个 `ars-*.md` 都是一条直达指令的完整说明，可直接按需读取。

## 支撑目录

- `shared/` — 跨工作流共享的规范、schema 与工具函数（各工作流按需引用）；
- `agents/` — 套件级 agent 定义；
- `hooks/` — 运行时防护钩子（`hooks.json` 声明，`run_guard.sh` 执行）；
- `tools/`、`scripts/` — 运行时分析脚本与数据适配器（obsidian / zotero / folder_scan）；
- `docs/`、`POSITIONING.md`、`THIRD_PARTY.md` — 深入设计文档与边界说明；
- `evals/`、`tests/`、`.github/` — 上游评测基线、测试与 CI 配置（完整拉取一并保留，
  日常使用无需加载）。

## 版本

套件基准 v3.21.1 + 上游后续 unreleased 修正（commit `94436237`，2026-09-01），
版本明细见 `CHANGELOG.md`。本集成**完整拉取上游全树**，仅排除 `skills/` 符号链接
目录（上游插件结构的冗余映射，Windows 解包不兼容）；顶层目录采用短名 `ars`，
为 Windows MAX_PATH 预留约 27 字符余量（最长相对路径 158 / 上限 219）。
引用完整性以仓库级 `scripts/integration_check.py --refs` 复检为准。
