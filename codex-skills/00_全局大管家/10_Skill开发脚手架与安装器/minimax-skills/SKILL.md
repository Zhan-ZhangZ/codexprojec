---
name: minimax-skills
description: "MiniMax 零基础全栈开发指令流模板合集 (Cookbook)。开箱即用的傻瓜式工作流封装，覆盖前端
  UI、移动端开发、全栈架构及文档撰写。通过预置结构化 Prompt，大幅降低新手驾驭代码大模型的门槛。Leading Words:
  MiniMax指令流模板Cookbook, 零基础前端全栈工作流, 开箱即用Prompt封装, 傻瓜式代码大模型驾驭"
metadata:
  upstream: github.com/MiniMax-AI/skills
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# minimax-skills

MiniMax 零基础全栈开发指令流模板合集 (Cookbook)。开箱即用的傻瓜式工作流封装，覆盖前端 UI、移动端开发、全栈架构及文档撰写。通过预置结构化 Prompt，大幅降低新手驾驭代码大模型的门槛。

## 何时使用

适用任务：MiniMax 零基础全栈开发指令流模板合集 (Cookbook)。开箱即用的傻瓜式工作流封装，覆盖前端 UI、移动端开发、全栈架构及文档撰写。通过预置结构化 Prompt，大幅降低新手驾驭代码大模型的门槛。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `plugins/pptx-plugin/skills/color-font-skill/SKILL.md` — **color-font-skill**：Choose presentation-ready color palettes and font pairings for PPT/design tasks. Use when users ask for visual theme choices, brand-safe palettes, or font recommendations. Triggers include: 配色, 色板, 字体, color…
- `plugins/pptx-plugin/skills/design-style-skill/SKILL.md` — **design-style-skill**：Select a consistent visual design system for PPT slides using radius/spacing style recipes. Use when users ask for overall style direction or component styling consistency. Includes Sharp/Soft/Rounded/Pill recipes, comp…
- `plugins/pptx-plugin/skills/ppt-editing-skill/SKILL.md` — **ppt-editing-skill**：Edit existing PowerPoint files or templates with XML-safe workflows. Use for template-based deck updates: analyze layouts, map content to slides, duplicate/reorder/delete slides safely, edit slide XML in parallel, clean…
- `plugins/pptx-plugin/skills/ppt-orchestra-skill/SKILL.md` — **ppt-orchestra-skill**：Plan and orchestrate multi-slide PowerPoint creation from scratch. Use before generating a full deck with subagents: classify each slide type, enforce visual variety, set typography/spacing rules, and run text-based QA …
- `plugins/pptx-plugin/skills/slide-making-skill/SKILL.md` — **slide-making-skill**：Implement single-slide PowerPoint pages with PptxGenJS. Use when writing or fixing slide JS files: dimensions, positioning, text/image/chart APIs, styling rules, and export expectations for native .pptx output.
- `skills/android-native-dev/SKILL.md` — **android-native-dev**：Android native application development and UI design guide. Covers Material Design 3, Kotlin/Compose development, project configuration, accessibility, and build troubleshooting. Read this before Android native applicat…
- `skills/buddy-sings/SKILL.md` — **buddy-sings**：Use when user wants their Claude Code pet (/buddy) to sing a song. Triggers on any request that combines the concept of their Claude Code buddy, pet, or companion with singing or music. Supports multilingual triggers …
- `skills/flutter-dev/SKILL.md` — **flutter-dev**：Flutter cross-platform development guide covering widget patterns, Riverpod/Bloc state management, GoRouter navigation, performance optimization, and platform-specific implementations. Includes const optimization, respo…
- `skills/frontend-dev/SKILL.md` — **frontend-dev**：Full-stack frontend development combining premium UI design, cinematic animations, AI-generated media assets, persuasive copywriting, and visual art. Builds complete, visually striking web pages with real media, advance…
- `skills/fullstack-dev/SKILL.md` — **fullstack-dev**：Full-stack backend architecture and frontend-backend integration guide. TRIGGER when: building a full-stack app, creating REST API with frontend, scaffolding backend service, building todo app, building CRUD app, buildi…
- `skills/gif-sticker-maker/SKILL.md` — **gif-sticker-maker**：Convert photos (people, pets, objects, logos) into 4 animated GIF stickers with captions. Use when: user wants to create cartoon stickers, GIF expressions, emoji packs, animated avatars, or convert photos to Funko Pop /…
- `skills/ios-application-dev/SKILL.md` — **ios-application-dev**：iOS application development guide covering UIKit, SnapKit, and SwiftUI. Includes touch targets, safe areas, navigation patterns, Dynamic Type, Dark Mode, accessibility, collection views, common UI components, and SwiftU…
- `skills/minimax-docx/SKILL.md` — **minimax-docx**：Professional DOCX document creation, editing, and formatting using OpenXML SDK (.NET). Three pipelines: (A) create new documents from scratch, (B) fill/edit content in existing documents, (C) apply template formatting w…
- `skills/minimax-multimodal-toolkit/SKILL.md` — **mmx-cli**：Use mmx to generate text, images, video, speech, and music via the MiniMax AI platform. Use when the user wants to create media content, chat with MiniMax models, perform web search, or manage MiniMax API resources from…
- `skills/minimax-music-gen/SKILL.md` — **minimax-music-gen**：Use when user wants to generate music, songs, or audio tracks. Triggers on any request involving music creation, song writing, lyrics generation, audio production, or covers. Also triggers when user provides lyrics and …
- `skills/minimax-music-playlist/SKILL.md` — **minimax-music-playlist**：Generate personalized music playlists by analyzing the user's music taste and generation feedback history. Triggers on any request involving playlist generation, music taste profiling, or personalized music recommendati…
- `skills/minimax-pdf/SKILL.md` — **minimax-pdf**：Use this skill when visual quality and design identity matter for a PDF. CREATE (generate from scratch): "make a PDF", "generate a report", "write a proposal", "create a resume", "beautiful PDF", "professional document"…
- `skills/minimax-xlsx/SKILL.md` — **minimax-xlsx**：Open, create, read, analyze, edit, or validate Excel/spreadsheet files (.xlsx, .xlsm, .csv, .tsv). Use when the user asks to create, build, modify, analyze, read, validate, or format any Excel spreadsheet, financial mod…
- `skills/pptx-generator/SKILL.md` — **pptx-generator**：Generate, edit, and read PowerPoint presentations. Create from scratch with PptxGenJS (cover, TOC, content, section divider, summary slides), edit existing PPTX via XML workflows, or extract text with markitdown. Trigge…
- `skills/react-native-dev/SKILL.md` — **react-native-dev**：React Native and Expo development guide covering components, styling, animations, navigation, state management, forms, networking, performance optimization, testing, native capabilities, and engineering (project structu…
- `skills/shader-dev/SKILL.md` — **shader-dev**：Comprehensive GLSL shader techniques for creating stunning visual effects — ray marching, SDF modeling, fluid simulation, particle systems, procedural generation, lighting, post-processing, and more.
- `skills/vision-analysis/SKILL.md` — **vision-analysis**：Analyze, describe, and extract information from images using the MiniMax vision MCP tool. Use when: user shares an image file path or URL (any message containing .jpg, .jpeg, .png, .gif, .webp, .bmp, or .svg file extens…

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `README_zh.md`

## 上游

- https://github.com/MiniMax-AI/skills
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
