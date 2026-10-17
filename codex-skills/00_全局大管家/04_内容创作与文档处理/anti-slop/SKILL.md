---
name: anti-slop
description: "反 AI 味多面规则系统：核心总纲常载过滤 + 6 个子技能分域把关——代码、文案、文风（含对比检查脚本）、移动端布局、UI
  设计；另配规则单文件版与 CLI 安装器，多平台插件入口（Claude/Codex/Cursor/Cline 等）。Leading Words: 反AI味,
  AI腔规则, 代码去AI味, 文案去AI味, UI设计反平庸, 移动端布局检查, 规则过滤器"
metadata:
  upstream: github.com/miqdadbadjuber/anti-slop
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# anti-slop

反 AI 味多面规则系统：核心总纲常载过滤 + 6 个子技能分域把关——代码、文案、文风（含对比检查脚本）、移动端布局、UI 设计；另配规则单文件版与 CLI 安装器，多平台插件入口（Claude/Codex/Cursor/Cline 等）。

## 何时使用

适用任务：反 AI 味多面规则系统：核心总纲常载过滤 + 6 个子技能分域把关——代码、文案、文风（含对比检查脚本）、移动端布局、UI 设计；另配规则单文件版与 CLI 安装器，多平台插件入口（Claude/Codex/Cursor/Cline 等）。
相关检索词：Anti Slop、antislop、反AI味规则系统、anti-slop、rules、code、copywriting、ui、multi-skill。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `skills/antislop/SKILL.md` — **antislop**：Anti Slop: Rules for AI Coding Agents. The core filter. Load always to stop generic AI slop.
- `skills/antislop-code/SKILL.md` — **antislop-code**：Code comment hygiene for AI coding agents: remove generic AI-slop comments, keep the valuable ones, never touch the code.
- `skills/antislop-copywriting/SKILL.md` — **antislop-copywriting**：Copy and text skill for antislop. Use when writing or editing prose: headlines, tone, CTAs, and anti-AI-writing patterns. Load with the core.
- `skills/antislop-human/SKILL.md` — **antislop-human**：Human and accessibility skill for antislop. Contrast, keyboard, focus, and states for real people. Includes the contrast checker.
- `skills/antislop-layoutmobile/SKILL.md` — **antislop-layoutmobile**：Mobile layout skill for antislop. Use for layouts that reflow across screen sizes, phone to desktop: grids, overflow, tap targets. Load with the core.
- `skills/antislop-ui/SKILL.md` — **antislop-ui**：UI and visual skill for antislop. Use when building or editing any interface: color, layout, components, motion. Load with the core.

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `package.json`

## 上游

- https://github.com/miqdadbadjuber/anti-slop
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
