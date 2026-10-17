---
name: superclaude-framework
description: "SuperClaude 框架：为底层大语言模型注入 CLI 式速成指令拦截菜单。将冗长的自然语言交互降维为极简命令别名
  (Aliases)，快速触发高频任务，如项目分析重构、断点排错调试、或者文档逆向生成。Leading Words: 智能体CLI指令菜单注入,
  极简命令Aliases映射, 项目高频重构分析, 断点排错与文档逆向"
metadata:
  upstream: github.com/SuperClaude-Org/SuperClaude_Framework
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# superclaude-framework

SuperClaude 框架：为底层大语言模型注入 CLI 式速成指令拦截菜单。将冗长的自然语言交互降维为极简命令别名 (Aliases)，快速触发高频任务，如项目分析重构、断点排错调试、或者文档逆向生成。

## 何时使用

适用任务：SuperClaude 框架：为底层大语言模型注入 CLI 式速成指令拦截菜单。将冗长的自然语言交互降维为极简命令别名 (Aliases)，快速触发高频任务，如项目分析重构、断点排错调试、或者文档逆向生成。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `skills/confidence-check/SKILL.md` — **Confidence Check**：Pre-implementation confidence assessment (≥90% required). Use before starting any implementation to verify readiness with duplicate check, architecture compliance, official docs verification, OSS references, and root …
- `plugins/superclaude/skills/brainstorm/SKILL.md` — **brainstorm**：Activate brainstorming mode for collaborative discovery and creative problem-solving. Use when users have vague requests, want to explore ideas, or need requirements discovery.
- `plugins/superclaude/skills/deep-research/SKILL.md` — **deep-research**：Activate deep research mode for systematic investigation. Use when the user asks to research, investigate, explore, or needs current information with citations.
- `plugins/superclaude/skills/pm/SKILL.md` — **pm**：Project management with PDCA cycles, confidence checks, and context persistence. Auto-activates at session start to restore context. Use for task planning, progress tracking, and structured development.
- `plugins/superclaude/skills/token-efficiency/SKILL.md` — **token-efficiency**：Activate ultra-compressed output mode for maximum token efficiency. Use when context is running low, user requests brevity, or dealing with large-scale operations.
- `plugins/superclaude/skills/troubleshoot/SKILL.md` — **troubleshoot**：Systematic troubleshooting with root cause analysis. Use when users report errors, bugs, or unexpected behavior. Never retry without understanding why.

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `README-ja.md`
- `README-kr.md`
- `README-zh.md`
- `package.json`
- `pyproject.toml`
- `docs/`

## 上游

- https://github.com/SuperClaude-Org/SuperClaude_Framework
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
