---
name: claude-hud
description: "Claude Code 实时状态栏 HUD（Agent Skills Hub 场景实测首选）。TypeScript 编写，在终端 statusline 常驻显示会话/成本/token/git 上下文等信息，npm 一键安装，支持自定义组件与主题。Leading Words: Claude Code状态栏, statusline HUD, 会话成本监控, 终端仪表盘, claude hud"
metadata:
  upstream: "github.com/jarrodwatts/claude-hud"
---

# claude-hud

**上游仓库**：<https://github.com/jarrodwatts/claude-hud>

Claude Code 的实时状态栏 HUD。安装与详细配置见 [README.md](README.md)（[中文](README.zh.md)）。

```sh
claude install -b jarrodwatts/claude-hud@latest   # 或 npm 全局安装后接入 statusline
```

## 集成说明（本库维护）

- 集成日期：2026-10-10；来源：Agent Skills Hub 热门场景榜单（07_智能体框架与协同 场景实测首选）。
- 瘦身剔除：dist/ 构建产物、tests/、scripts/、package-lock.json、治理与开发文件（COC/CONTRIBUTING/RELEASING/CLAUDE.md）；保留 src/ commands/ 与双语 README。
