---
name: code-review-graph
description: "代码评审知识图谱工具。把 PR 变更构建为可导航图结构，跨文件追踪改动影响；含 VSCode 扩展。Leading Words:
  代码评审图谱, 变更影响追踪, PR分析, vscode扩展"
metadata:
  upstream: github.com/tirth8205/code-review-graph
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# code-review-graph

代码评审知识图谱工具。把 PR 变更构建为可导航图结构，跨文件追踪改动影响；含 VSCode 扩展。

## 何时使用

适用任务：代码评审知识图谱工具。把 PR 变更构建为可导航图结构，跨文件追踪改动影响；含 VSCode 扩展。
相关检索词：评审图谱。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `skills/build-graph/SKILL.md` — **build-graph**：Build or update the code review knowledge graph. Run this first to initialize, or let hooks keep it updated automatically.
- `skills/debug-issue/SKILL.md` — **debug-issue**：Systematically debug issues using graph-powered code navigation
- `skills/explore-codebase/SKILL.md` — **explore-codebase**：Navigate and understand codebase structure using the knowledge graph
- `skills/refactor-safely/SKILL.md` — **refactor-safely**：Plan and execute safe refactoring using dependency analysis
- `skills/review-changes/SKILL.md` — **review-changes**：Perform a structured code review using change detection and impact
- `skills/review-delta/SKILL.md` — **review-delta**：Review only changes since last commit using impact analysis. Token-efficient delta review with automatic blast-radius detection.
- `skills/review-pr/SKILL.md` — **review-pr**：Review a PR or branch diff using the knowledge graph for full structural context. Outputs a structured review with blast-radius analysis.

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `README.hi-IN.md`
- `README.ja-JP.md`
- `README.ko-KR.md`
- `README.zh-CN.md`
- `pyproject.toml`
- `docs/`

## 上游

- https://github.com/tirth8205/code-review-graph
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
