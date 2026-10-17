---
name: vibe-coding-prompt-template
description: "Vibe Coding 工作流提示词模板。面向 AI 结对编程的结构化提示词与工作流模板集。Leading Words: vibe
  coding, 提示词模板, 工作流模板"
metadata:
  upstream: github.com/KhazP/vibe-coding-prompt-template
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# vibe-coding-prompt-template

Vibe Coding 工作流提示词模板。面向 AI 结对编程的结构化提示词与工作流模板集。

## 何时使用

适用任务：Vibe Coding 工作流提示词模板。面向 AI 结对编程的结构化提示词与工作流模板集。
相关检索词：vibe模板。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `workflow/skills/vibe-agents/SKILL.md` — **vibe-agents**：Create project agent instructions and tool configuration from agreed product and technical decisions.
- `workflow/skills/vibe-build/SKILL.md` — **vibe-build**：Implement a new-project slice through the relevant checks and working user journey.
- `workflow/skills/vibe-change/SKILL.md` — **vibe-change**：Add one bounded feature to an existing app while preserving current behavior. Do not restart the full new-project workflow.
- `workflow/skills/vibe-debug/SKILL.md` — **vibe-debug**：Diagnose and fix a reproducible failure in an existing project. Use for crashes, broken behavior, or failing checks, not greenfield planning.
- `workflow/skills/vibe-handoff/SKILL.md` — **vibe-handoff**：Prepare compact factual project context for another session or coding tool without copying transcripts or secrets.
- `workflow/skills/vibe-prd/SKILL.md` — **vibe-prd**：Write or revise an MVP product requirements document with scope and observable acceptance criteria.
- `workflow/skills/vibe-research/SKILL.md` — **vibe-research**：Research an app idea or resolve product and technical uncertainties before committing to a design.
- `workflow/skills/vibe-review/SKILL.md` — **vibe-review**：Review a proposed change against requirements, regressions, verification evidence, and relevant security risks.
- `workflow/skills/vibe-techdesign/SKILL.md` — **vibe-techdesign**：Write an MVP technical design from agreed requirements, including architecture choices and relevant tradeoffs.
- `workflow/skills/vibe-verify/SKILL.md` — **vibe-verify**：Exercise a running product against acceptance criteria and report evidence. Build success alone does not verify behavior.
- `workflow/skills/vibe-workflow/SKILL.md` — **vibe-workflow**：Select the appropriate planning, implementation, or debugging workflow for an app project.

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `docs/`

## 上游

- https://github.com/KhazP/vibe-coding-prompt-template
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
