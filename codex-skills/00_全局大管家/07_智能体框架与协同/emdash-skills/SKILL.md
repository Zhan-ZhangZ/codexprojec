---
name: emdash-skills
description: 包含 14 个分类的自主产品构建 OS：支持 Cloudflare Workers + Hono + Angular + D1 + Stripe。只需一行 Prompt 即可快速部署包含 94 篇参考文档、18 个智能体且原生支持 .agents/skills/ 的 SaaS 应用。Leading Words: SaaS全栈OS脚手架, CloudflareWorkers部署, Hono+Angular架构, 一键Prompt产品构建
---

# Emdash Skills

- **项目主页**: https://github.com/heymegabyte/claude-skills

## 功能说明
自主产品构建 OS（上游定位「14-category autonomous product-building OS」）：默认技术栈为 Cloudflare Workers + Hono + Angular + D1 + Stripe，一行 Prompt 即可走完「架构 → 并行多智能体构建 → 验证 → 部署」的完整闭环。本地整仓快照已覆盖 `01-operating-system` 至 `20-superpowers` 共 20 个类目目录（新增 17-非工程垂直领域、18-文档处理、19-MCP 编写、20-superpowers），并内置 166 篇规则、27 个智能体、53 个命令，以及 `_packs`、`_kernel`、`mcp-servers`、`reference`、`templates`、`bin` 等资产，原生支持 `.agents/skills/` 挂载到 32+ AI 编码工具。

## 本次更新要点（同步上游 2026-08-26）
- **brand-asset-pipeline 规则**（[rules/brand-asset-pipeline.md](./rules/brand-asset-pipeline.md)，Brian 指令 2026-08-26）：每次网站构建必须产出完整品牌/元图片集。优先网络调研真实 Logo 与图标（真实标志优于任何生成标志），对找到的资产做 AI 增强（放大、清理、去背景、重上色）；仅在找不到真实资产时才用 Ideogram（DALL·E 3 兜底）生成。全流程运行于并行智能体 `brand-asset-forge`，不阻塞主构建。必产清单：导航栏 Logo（明/暗双版、透明 PNG+SVG）、favicon 全套（`.ico` + 16/32/48px）、180×180 apple-touch-icon、192/512 android-chrome、1200×630 品牌卡片 og:image（≤100KB）、maskable icon、`safari-pinned-tab.svg`、mstile + `browserconfig.xml`；缺任何一项即视为构建失败。
- **text-contrast 规则强化**（[rules/text-contrast.md](./rules/text-contrast.md)，Brian 指令 2026-08-25）：主题表面（theme surface）上**永不硬编码 `text-white` / `bg-white` / `border-white` / `placeholder-white`**——在明暗双主题 token 体系（`text-text` / `text-text-muted` / `text-text-subtle` / `bg-surface` / `border-border`）下会渲染成浅色主题中的白上白不可见文本，属构建级失败（BUILD-BREAKING）；须映射为主题 token，并接入静态校验门禁 `validate-site`（挂 `postbuild`，同时对内部死链 404 一并报错）。唯一例外：同元素确为固定深色背景（如 `bg-primary`、灯箱遮罩）时可保留 `text-white` 并标注 `contrast-dark-ok`。配套的 `logo-contrast` 规则要求白色文字 Logo 必须有深色衬底。
- **其余增量**：rules 新增 75 篇、bin 校验脚本新增 53 个、commands 新增 38 个、agents 新增 9 个；新增 `docs`、`mcp-servers`、`reference`、`retrospectives` 顶层目录及 `.codex-plugin`、`.kimi-plugin`、`.opencode` 工具适配。完整变更见 [CHANGELOG.md](./CHANGELOG.md)。

## 详细指南
请参考本地代码库中的 [README.md](./README.md) 获取详细配置与部署说明；规则路由总览见 [_router.md](./_router.md)。
