---
name: adobe-mcp
description: Adobe 桌面应用 MCP 套件。通过独立或聚合的 npm MCP 服务驱动 InDesign、Illustrator、Photoshop、After Effects 与 Premiere Pro，覆盖文档与画板、图层、路径、文字、样式、色彩、特效、3D、动画、渲染队列和导出发布流程。适合需要从 AI 客户端直接自动化 Adobe 应用、或在多个 Adobe 应用之间交接设计资产的场景。
license: MIT
metadata:
  upstream: https://github.com/zachshallbetter/adobe-mcp
  commit: bd855b746b1ac3a64011bbc92bdf5fd9320fade3
  indesign_version: 2.5.0
  illustrator_version: 0.9.0
  photoshop_version: 0.1.0
  aftereffects_version: 0.1.0
  premiere_version: 0.1.0
  suite_version: 0.1.7
---

# Adobe MCP

这是 Adobe 桌面应用 MCP 服务的独立文档与接入技能。它们不在技能包内自带服务源码，而是通过 npm 启动；目标 Adobe 应用必须安装在当前机器上并运行。中文说明见 [README.zh-CN.md](./README.zh-CN.md)，英文原文见 [README.md](./README.md)。

## 选择服务

| 目标 | npm 服务 | 详细约定 |
|---|---|---|
| InDesign | `npx -y adobe-mcp-indesign` | [InDesign README](./packages/indesign/README.md)、[工具目录](./packages/indesign/docs/TOOLS.md) |
| Illustrator | `npx -y adobe-mcp-illustrator` | [Illustrator README](./packages/illustrator/README.md) |
| Photoshop | `npx -y adobe-mcp-photoshop` | [Photoshop README](./packages/photoshop/README.md) |
| After Effects | `npx -y adobe-mcp-aftereffects` | [After Effects README](./packages/aftereffects/README.md) |
| Premiere Pro | `npx -y adobe-mcp-premiere` | [Premiere README](./packages/premiere/README.md) |
| 跨应用或整套 Adobe | `npx -y adobe-mcp-suite` | [Suite README](./packages/suite/README.md) |

只操作一个应用时优先安装对应独立服务；确实需要跨应用工具时再使用 suite。Premiere Pro 支持尚未在真实应用中验证，应保守执行并先保存工程。

## 使用流程

1. 启动目标 Adobe 应用，并确认脚本交互所需的系统权限。macOS 首次自动化时通常需要在“隐私与安全性 → 自动化”中授权。
2. 按所选包的 README 将 npm 服务加入 MCP 客户端配置。必须使用 Node.js 18+。
3. 连接后先通过 MCP `tools/list` 获取当前版本实际暴露的工具，不要只凭工具名称猜测参数。
4. 修改前检查活动文档、页面/画布、图层和选择状态；完成关键步骤后读回状态或导出预览。
5. 涉及覆盖、批量改写、删除、关闭未保存文件或跨应用写入时，先征得用户确认，并在操作前保存可恢复版本。

## 运行时边界

- npm 服务在安装后由 MCP 客户端启动；本技能包不包含服务源码或已安装依赖。
- 所有应用操作都发生在本机 Adobe 应用的真实文档中。不要假设有沙箱、撤销或自动备份。
- 工具数量和能力随 npm 版本与应用版本变化；以运行时 `tools/list` 和对应包的 `server.json` 为准。
- Premiere Pro 服务需要其 UXP 插件；按包 README 操作，并注意该服务仍标记为未经过真实应用验证。
