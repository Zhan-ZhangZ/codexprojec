---
name: planning-with-files
description: "长线任务记忆与文件级进度规划技能。通过本地 Markdown
  文件记录开发计划、执行进度和上下文状态，帮助复杂项目在长对话或多会话中保持连续。Leading Words:
  文件级进度规划, 长期项目跟踪, Markdown任务记忆, 状态上下文留存, 长线任务执行"
metadata:
  upstream: github.com/OthmanAdi/planning-with-files
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# planning-with-files

通过本地 Markdown 文件记录开发计划、执行进度和上下文状态，帮助复杂项目在长对话或多会话中保持连续。

## 何时使用

适用任务：多步骤开发、长期研究、跨会话续作，以及需要把计划与发现落盘的任务。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

这些目录是同一工作流的语言变体，只读取与用户语言相符的一份：

- 简体中文：`skills/planning-with-files-zh/SKILL.md`
- 繁体中文：`skills/planning-with-files-zht/SKILL.md`
- 英文：`skills/planning-with-files/SKILL.md`
- 德语：`skills/planning-with-files-de/SKILL.md`
- 西班牙语：`skills/planning-with-files-es/SKILL.md`
- 阿拉伯语：`skills/planning-with-files-ar/SKILL.md`

## 执行

以选中的语言版本为执行契约，并创建 `task_plan.md`、`findings.md` 和 `progress.md`。从本包根目录解析它引用的脚本、模板和参考资料；会话恢复前先读取已有进度文件，不要用新计划覆盖历史记录。

## 本地入口

- `README.md`
- `docs/`

## 上游

- https://github.com/OthmanAdi/planning-with-files
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
