---
name: browser-skill
description: 让智能体静默接管本地已登录浏览器的自动化扩展 (BrowserSkill)。由腾讯开源，允许 Agent 操作本地浏览器执行复杂网页任务而不打断用户工作流程。自带人机接管 (Human-in-loop) 支持。
version: 0.2.0
---

# browser-skill

腾讯开源 BrowserSkill：让 Agent 驱动用户**真实登录态的 Chromium 浏览器**完成网页任务——访问阅读、填表、抓取、点击流转、PR UI 回归、部署页验证。扩展自动开出隔离的 **Agent Window** 承载自动化，用户正常窗口不受打扰；需借用用户标签页时会显式发起借出确认（Human-in-loop）。

## 统一入口（优先读这个）

**[references/skill/SKILL.md](references/skill/SKILL.md)** 是上游官方提供的 Agent 技能入口：`bsk` CLI 命令面、何时触发、Agent Window 语义与借页规则。做浏览器任务前先读它。

- 中文总览：[references/README.zh-CN.md](references/README.zh-CN.md)；英文版：[references/README.md](references/README.md)
- Agent 侧安装指引：[references/AGENT_INSTALL.md](references/AGENT_INSTALL.md)
- 架构（VOM 语义图/传输层/协议版本协商）：[references/docs/architecture.md](references/docs/architecture.md)

## v0.2.0 要点（2026-09-02 发布）

- **版本体系统一**：CLI / 扩展 / DSH 插件三组件共享同一 semver（0.2.0 起），协议版本不一致时自动提醒
- **文件传输**：CLI、扩展、DSH 插件全线支持上传/下载，含拖拽上传（drop-to-upload）
- **VOM 感知增强**：语义图、名称富化、hover 感知模块；`observe` 参数可选启用 hover 探测
- DSH 插件浏览器命令与 CLI 对齐；Edge Add-ons CI 自动发布
- 完整历史见 [references/CHANGELOG.md](references/CHANGELOG.md)

## 参考文档索引

- [references/README.zh-CN.md](references/README.zh-CN.md) / [references/README.md](references/README.md) — 上游双语总说明
- [references/skill/SKILL.md](references/skill/SKILL.md) — 官方 Agent 技能入口（bsk CLI 用法）
- [references/CHANGELOG.md](references/CHANGELOG.md) — 变更史
- [references/AGENT_INSTALL.md](references/AGENT_INSTALL.md) — Agent 安装指引
- [references/docs/architecture.md](references/docs/architecture.md) — 架构文档
- [references/LICENSE](references/LICENSE) — 许可证

> 上游为 Rust + pnpm monorepo（crates/packages/apps/evals），用户经发布产物安装，本库只携文档层与官方 skill 入口，需要时访问 [上游仓库](https://github.com/Tencent/BrowserSkill/tree/945bf15)。
