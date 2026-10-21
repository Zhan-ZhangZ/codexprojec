---
name: after-effects-mcp
description: Adobe After Effects MCP 动效自动化技能。通过 ae-mcp 服务和 CEP 面板创建或编辑合成、文字与形状、路径、蒙版、关键帧、缓动、表达式、特效、粒子、3D、摄像机、灯光、片头、字幕条、转场、Logo Reveal 和渲染队列。适用于从自然语言生成可编辑的 After Effects 动画并交付视频或单帧预览。
license: MIT
metadata:
  upstream: https://github.com/ishu86/after-effects-mcp
  version: 1.0.0
  commit: 5223c17a8e8c1273b25c6a9d306839259ad35143
---

# After Effects MCP

这是独立的 After Effects MCP 接入技能。服务从 npm 包 `ae-mcp` 启动；本目录同时保留必需的原生技能、After Effects CEP 面板和安装脚本。

中文说明见 [README.zh-CN.md](./README.zh-CN.md)，英文原文见 [README.md](./README.md)。

## 首次配置

1. 确认安装 After Effects 2024+、Node.js 18+。
2. 在 macOS 运行 `./scripts/install-cep.sh`，Windows 运行 `scripts\\install-cep.bat`，安装 `cep-extension/`。
3. 重启 After Effects，打开 **Window > Extensions > AE-MCP**。
4. 在 MCP 客户端使用命令 `npx -y ae-mcp`，或按示例配置为 `{"command":"npx","args":["-y","ae-mcp"]}`。

如果所有调用都超时，先检查面板是否打开、是否有模态对话框，以及命令目录 `~/Documents/ae-mcp-commands/`。

## 详细执行规则

- [原生 After Effects 技能](./SKILL/SKILL.md)：工具选择、属性路径、值格式、3D、粒子、渲染和已知限制。
- [动画示例](./SKILL/examples.md)：弹跳、动态文字、Logo 揭示、Trim Paths、3D 标题、计数器、故障效果、粒子与交付。
- [CEP 扩展](./cep-extension/CSXS/manifest.xml)：After Effects 内运行的桥接面板。

必须先读原生技能再调用工具。修改或切换整个项目、保存/关闭/打开工程、导入素材、整理项目或 collect files 前，先征得用户确认。
