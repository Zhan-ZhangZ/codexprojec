---
name: stitch-skills
description: Google Stitch 官方 Agent Skills 插件集合：文本/图片生成与编辑设计稿、设计系统管理、代码/设计互转、静态 HTML 提取、站点与 DESIGN.md 抽取、React/shadcn/Remotion 构建；需自行配置 Stitch MCP。
---

# Stitch Skills

本目录是 [google-labs-code/stitch-skills] 的完整插件集合。上游没有顶层 `SKILL.md`；本入口只做路由，实际执行规则以各子技能的 `SKILL.md` 为准。

## 前置条件

1. 先按上游 `README.md` 和 Google Stitch 官方文档配置 **Stitch MCP**。
2. 确认当前编码智能体已暴露 Stitch MCP 工具（项目、屏幕生成/编辑、设计系统等）。
3. 构建类子技能可能还需要 Node.js/npm 或移动端/Remotion 项目依赖；先阅读对应子技能的 `SKILL.md`，不要凭默认环境假设。

## 子技能路由

### `plugins/stitch-design/skills/`

- `generate-design/`：从文本、图片或 mockup 生成/编辑 Stitch 屏幕，并做提示词增强。
- `manage-design-system/`：创建和维护 Stitch 项目设计系统 token。
- `code-to-design/`：把现有代码转成 Stitch 设计。
- `extract-static-html/`：提取可运行的静态 HTML。
- `extract-design-md/`：从 React/Vue/Svelte/Angular/CSS 代码提取 `DESIGN.md`。
- `upload-to-stitch/`：把资产上传到 Stitch。

### `plugins/stitch-utilities/skills/`

- `design-md/`：生成结构化设计系统说明。
- `site-md/`：生成站点结构与内容说明。
- `enhance-prompt/`：优化前端/设计生成提示词。
- `taste-design/`：在设计生成前定义可解释的审美方向。
- `stitch-loop/`：在 Stitch 与代码之间持续迭代。

### `plugins/stitch-build/skills/`

- `react-components/`：把 Stitch 设计转换为 React 组件。
- `react-native/`：生成 React Native 界面。
- `react-vite-dashboard/`：生成 React + Vite 数据面板。
- `shadcn-ui/`：生成或迁移 shadcn/ui 组件。
- `remotion/`：生成 Remotion 动态视频/演示。

## 执行方式

1. 根据用户任务选择一个子技能；跨阶段任务先读取相关子技能入口，再按其步骤执行。
2. 打开对应路径下的 `SKILL.md`，并继续读取其中引用的 `references/`、`resources/`、`examples/` 和脚本。
3. 生成类任务先确认项目 ID、设计系统状态和输出格式；不要在未配置 Stitch MCP 时虚构工具调用结果。
4. 构建类任务先检查目标项目依赖与框架，再执行子技能声明的验证脚本。
5. 若工具名与宿主环境不一致，保留上游流程意图，并改用当前环境实际可用的等价工具；无法等价时向用户说明缺口。

## 关键文件

- `README.md`：上游安装方式、依赖关系和手动安装说明。
- `.agents/plugins/marketplace.json` 与 `plugins/*/.codex-plugin/plugin.json`：Codex 插件注册元数据。
- `plugins/*/skills/*/SKILL.md`：16 个可调用子技能的真实入口。
