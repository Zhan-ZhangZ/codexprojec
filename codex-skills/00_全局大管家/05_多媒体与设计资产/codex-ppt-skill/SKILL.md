---
name: codex-ppt-skill
description: "整页图片式 PPT 生成技能。把文章/论文/报告/笔记转为演示文稿：大纲确认 → 12
  种内置视觉风格（手绘技术解释/科研答辩/麦肯锡等）→ 样张确认 → 逐页生图 → 本地脚本组装
  PPTX；演讲稿自动写入每页备注，支持个人风格库、指定页插入原图与多 Agent 并发生成。Leading Words: PPT生成, 幻灯片制作,
  图片式PPT, 演示文稿, codex ppt"
metadata:
  upstream: github.com/ningzimu/codex-ppt-skill
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# codex-ppt-skill

整页图片式 PPT 生成技能。把文章/论文/报告/笔记转为演示文稿：大纲确认 → 12 种内置视觉风格（手绘技术解释/科研答辩/麦肯锡等）→ 样张确认 → 逐页生图 → 本地脚本组装 PPTX；演讲稿自动写入每页备注，支持个人风格库、指定页插入原图与多 Agent 并发生成。

## 何时使用

适用任务：整页图片式 PPT 生成技能。把文章/论文/报告/笔记转为演示文稿：大纲确认 → 12 种内置视觉风格（手绘技术解释/科研答辩/麦肯锡等）→ 样张确认 → 逐页生图 → 本地脚本组装 PPTX；演讲稿自动写入每页备注，支持个人风格库、指定页插入原图与多 Agent 并发生成。
相关检索词：ningzimu ppt、学术PPT。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `skills/codex-ppt/SKILL.md` — **codex-ppt**：Generate visually unified image-based PPT/PPTX decks from articles, reports, papers, notes, or outlines.

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `README_en.md`
- `README_ko.md`
- `docs/`

## 上游

- https://github.com/ningzimu/codex-ppt-skill
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
