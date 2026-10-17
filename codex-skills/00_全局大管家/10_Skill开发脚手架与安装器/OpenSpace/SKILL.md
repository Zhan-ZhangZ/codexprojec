---
name: OpenSpace
description: "OpenSpace 技能管理与评估层。用于跨 Agent 检索技能、记录任务证据、评估质量并受控地改进技能。"
metadata:
  upstream: github.com/HKUDS/OpenSpace
  entrypoint: managed-v2
  entrypoint_kind: application
---

<!-- codex-skills-managed-entrypoint:v2 -->
# OpenSpace

OpenSpace 是一个本地优先的技能管理与评估系统。它把技能检索、任务执行、质量证据和受控进化串在同一个运行时里，也可以通过 MCP 接入其他 Agent。

## 何时使用

- 需要让多个 Agent 共享同一套本地技能库。
- 需要根据真实任务结果检索、评估或改进技能。
- 需要把 OpenSpace 作为 MCP 服务接入 Codex、Claude Code 等宿主。
- 需要审查或整理项目记忆。

## 安装与接入

先读取 `README.md` 的 Quick Start、Path A 和 `openspace/host_skills/README.md`。本地源码版的常见起点是：

```bash
python -m pip install -e .
openspace-mcp --help
```

接入宿主时，按 README 配置 `openspace` MCP 服务，并设置 `OPENSPACE_WORKSPACE` 与 `OPENSPACE_HOST_SKILL_DIRS`。需要云端功能时才配置云端凭据；不要将密码写入技能文件。

## 用户技能

`examples/` 是示例项目，不是可直接调用的技能入口。需要作者提供的宿主工作流时，读取：

- `openspace/host_skills/delegate-task/SKILL.md`：把适合的任务交给 OpenSpace 执行。
- `openspace/host_skills/skill-discovery/SKILL.md`：在本地或云端检索技能。
- `openspace/skills/remember/SKILL.md`：审阅项目记忆并提出晋升或清理建议。

## 本地入口

- `README.md`
- `README_zh.md`
- `pyproject.toml`
- `requirements.txt`
- `openspace/host_skills/`

## 上游

- https://github.com/HKUDS/OpenSpace

## 完成标准

完成安装、MCP 接入、技能检索、评估或记忆审查，并报告实际配置路径、使用的传输方式、验证结果和缺失的凭据。
