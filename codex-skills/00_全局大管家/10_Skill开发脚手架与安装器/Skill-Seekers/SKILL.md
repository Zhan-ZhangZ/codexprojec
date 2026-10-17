---
name: Skill-Seekers
description: "Agent Skills 发现与检索引擎。多语言智能体搜索 GitHub 技能与仓库，MCP 服务器形态接入，含 UI 与
  Docker/K8s 部署方案。Leading Words: 技能检索, GitHub技能发现, skills搜索引擎, MCP检索服务, skill
  seekers"
metadata:
  upstream: github.com/yusufkaraaslan/Skill_Seekers
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# Skill-Seekers

Agent Skills 发现与检索引擎。多语言智能体搜索 GitHub 技能与仓库，MCP 服务器形态接入，含 UI 与 Docker/K8s 部署方案。

## 何时使用

适用任务：Agent Skills 发现与检索引擎。多语言智能体搜索 GitHub 技能与仓库，MCP 服务器形态接入，含 UI 与 Docker/K8s 部署方案。
相关检索词：Skill Seekers、技能发现。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `skills/skill-seekers/SKILL.md` — **skill-builder**：Automatically detect source types and build AI skills using Skill Seekers. Use when the user wants to create skills from documentation, repos, PDFs, videos, or other knowledge sources.

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `README.ar.md`
- `README.de.md`
- `README.es.md`
- `README.fr.md`
- `README.hi.md`
- `docs/`

## 上游

- https://github.com/yusufkaraaslan/Skill_Seekers
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
