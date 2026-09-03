---
name: ppt-master
description: 企业级沉浸式商业 PPT 大师。不只做版式堆砌，而是构建以商业画布、SWOT、增长漏斗为底层骨架的重型幻灯片。强视觉冲击与深商业逻辑完美融合。Leading Words: 重型商业PPT构建, 漏斗模型排版可视化, 沉浸式宣发幻灯片
---

# ppt-master

- **项目主页**: https://github.com/chuspeeism/dashi-ppt-skill

## 功能说明

上游 v0.4 系列整体重构（技能 ID 由 ppt-master 更名 dashi-ppt）：从早期"SVG 多角色生成"架构转向**浏览器可编辑的多主题 HTML 演示生成器**。把文档或需求交给 Agent，先生成 JSON 计划，再由内置 Node 生成器输出可离线打开的 `index.html` 与 `assets/`——每页自带编辑控制台，浏览器里直接改文案，再经本机预览服务一键导出真实可编辑的 PPTX / PDF。

- **12 套视觉主题**：轻拟态 / 炫光紫绿 / 深浅代码 / 玻璃糖果 / 色谱图表 / 深色图谱 / 冷白调研 / 黑金实验 / 深蓝杂志 / 金色指数 / 高能增长 / 声波霓虹
- **1020 个版式页面 × 8576 个可调控件**：每个逻辑页 3 个模板方案（锁模板填文案，保留原视觉/结构/图表类型）+ 1 个 Agent 定制方案（主题视觉语言内自由构图）
- 媒体工作流：本地素材先 `media:stage` 入库；支持 image-gen 生图与多 subagent 并行出图
- 运行需 Node.js 20+ 与 npm；首次渲染时脚本会在内置 `project/` 目录自动安装依赖

## 详细指南

- [README.md](README.md) — 上游总说明（主题预览、快速开始、导出流程）
- [skills/dashi-ppt/SKILL.md](skills/dashi-ppt/SKILL.md) — 技能本体（生成原则、风格选择规则、媒体工作流、14 步工作流）
- 渲染入口 `skills/dashi-ppt/scripts/render_goal_deck.sh`（macOS/Linux）与 `render_goal_deck.ps1`（Windows PowerShell）

> 上游 `npm-dist/`（npm 分发安装脚本）与 `.github/`（issue 模板）未随库分发；`check_latest_version.mjs` 会静默查询 npm registry 提示新版本。当前集成版本 v0.4.11（2026-07-30）。
