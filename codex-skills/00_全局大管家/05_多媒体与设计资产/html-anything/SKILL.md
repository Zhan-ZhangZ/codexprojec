---
name: html-anything
description: Markdown 至高保真 HTML 渲染及截图生成器。通过纯代码将枯燥的纯文本降维打击，直接转换为带高阶 CSS 样式的单页面杂志、知识分享长图和小红书卡片 PNG。Leading Words: Markdown转HTML卡片, 高阶CSS排版, 知识分享长图生成, 纯代码海报渲染
---

# html-anything

- **项目主页**: https://github.com/nexu-io/html-anything

## 功能说明
Agent 时代的本地 HTML 编辑器：把 Markdown、文案、文章变成好看的 HTML 页面、海报、卡片和 PNG。本地优先、零 API Key，自动识别 PATH 上的 9 个 coding-agent CLI（Claude Code、Cursor Agent、Codex、Gemini CLI、GitHub Copilot CLI、OpenCode、Qwen Coder、Aider、IBM Bob/CodeWhale），内置 75 套技能模板与 9 类可交付场景（杂志文章、Keynote PPT、简历、海报、小红书卡片、推特卡、Web 原型、数据报告、Hyperframes 视频），一键导出到公众号 / 推特 / 知乎，或下载 `.html` / `.png`。

## 本次更新要点（2026-09-03 覆盖集成）
- 修复 `formatMeta` 对非数字 `cost_usd`（字符串/null）未做类型守卫导致 `toFixed` 崩溃的问题（上游 #121，2026-08-18）。
- 修复 Hyperframes 零时长帧被错误丢弃的问题（上游 #110/#120）。
- 新增 `cli/` 命令行包 `@html-anything/cli`：不开网页界面，命令行直接把 Markdown/纯文本/CSV/JSON 转为排版 HTML。
- 新增 3 套社区模板（ljg-present、info-funnel、article-sketchnote-editorial）与业务决策类技能，模板总数达 75。
- 新增 GitHub 技能市场与按任务版本历史；导出新增 Notion、Bilibili、Mastodon、Bluesky、Markdown 往返目标。
- 安全修复：`/api/*` 校验 Host 头阻断 DNS rebinding（上游 #61）；Windows 下带空格 PATH 的 agent 二进制路径加引号。
- 新增轻量 PDF 文本提取；DeepSeek TUI agent 更名为 CodeWhale。

## 详细指南
关于该技能的详细配置、触发提示词和执行命令，请参考本地代码库中的 [README.md](./README.md)。
