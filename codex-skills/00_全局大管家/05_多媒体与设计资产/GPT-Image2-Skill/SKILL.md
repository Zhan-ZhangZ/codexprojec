---
name: GPT-Image2-Skill
description: "GPT-Image2 生图技能。生图 prompt 工程与排版规范知识库（中英双语），覆盖构图、文字渲染与风格控制。Leading
  Words: GPT Image2, 生图技能, prompt工程, 图像生成规范"
metadata:
  upstream: github.com/wuyoscar/GPT-Image2-Skill
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# GPT-Image2-Skill

GPT-Image2 生图技能。生图 prompt 工程与排版规范知识库（中英双语），覆盖构图、文字渲染与风格控制。

## 何时使用

适用任务：GPT-Image2 生图技能。生图 prompt 工程与排版规范知识库（中英双语），覆盖构图、文字渲染与风格控制。
相关检索词：image2、GPT生图。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `skills/get-prompt-from-image/SKILL.md` — **get-prompt-from-image**：Analyze user-provided reference images and reverse-engineer high-fidelity AI image-generation prompts. Use when the user asks to recreate, imitate, reverse-engineer, or extract prompts from photographs, illustrations, 3…
- `skills/gpt-image/SKILL.md` — **gpt-image**：Generate or edit images with GPT Image 2 or 2.5 through the packaged CLI and Reference Gallery. Use for image requests including imprecise 'GPT 2.5' model names, posters, typography, reference edits, and inpainting; res…

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `README.zh.md`

## 上游

- https://github.com/wuyoscar/GPT-Image2-Skill
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
