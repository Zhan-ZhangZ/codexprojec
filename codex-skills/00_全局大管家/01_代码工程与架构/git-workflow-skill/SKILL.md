---
name: git-workflow-skill
description: 标准的 Git 工作流与最佳实践约束器。接管并规范所有的 Git 操作：强制执行语义化分支命名（Branching）、规范化提交信息（Conventional Commits）、冲突解决原则以及标准化的 PR（Pull Request）生命周期管理。兼容 Claude Code 环境。Leading Words: Git工作流规范, 语义化提交, 分支管理策略, 冲突解决机制, PR流程自动化
version: 1.31.1
---

# git-workflow-skill

`@netresearch/git-workflow-skill`：Git 工作流与最佳实践约束器，接管并规范全部 Git 操作——分支策略、提交规范、PR 生命周期、冲突解决。以 Claude Code 插件形态分发（commands + hooks + skills）。

## 核心入口

- **官方技能定义**：[references/skills/git-workflow/SKILL.md](references/skills/git-workflow/SKILL.md) —— 核心模式与元数据（做 Git 任务优先读这个）
- **参考手册**：[references/skills/git-workflow/references/](references/skills/git-workflow/references/) —— commit-conventions（提交规范）、pull-request-workflow（PR 流程）、ci-cd-integration（CI 观测/git 镜像）、advanced-git（高级操作）、merge-gate-watcher、code-quality-tools 等
- **斜杠命令**：[references/commands/pr-finish.md](references/commands/pr-finish.md) —— `/pr-finish` PR 收尾流程
- **架构与决策**：[references/docs/ARCHITECTURE.md](references/docs/ARCHITECTURE.md)、[references/docs/adr/](references/docs/adr/)、[references/docs/exec-plans/](references/docs/exec-plans/)

## 能力域

- **分支策略**：Git Flow / GitHub Flow / trunk-based / 发布管理模式
- **提交规范**：Conventional Commits + semver 联动、原子提交
- **协作流程**：PR 最佳实践、代码评审、merge/squash/rebase 策略、冲突解决
- **CI/CD**：GitHub Actions / GitLab CI 模式、分支保护、自动化版本
- **Git 钩子**：pre-commit lint/测试、提交信息校验（[references/hooks/](references/hooks/)）
- **高级操作**：交互式 rebase、cherry-pick、stash、reflog 恢复

## 参考文档索引

- [references/README.md](references/README.md) — 上游总说明（安装/用法/速查表）
- [references/plugin.json](references/plugin.json) — Claude Code 插件清单
- [references/LICENSE-MIT](references/LICENSE-MIT) / [references/LICENSE-CC-BY-SA-4.0](references/LICENSE-CC-BY-SA-4.0) — 双许可证

> 上游 tests/、Build/、scripts/ 构建验证链未随库分发，需要时访问 [上游仓库](https://github.com/netresearch/git-workflow-skill/tree/v1.31.1)。
