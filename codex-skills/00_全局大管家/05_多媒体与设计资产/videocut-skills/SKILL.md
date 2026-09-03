---
name: videocut-skills
description: 中文语境原生短视频矩阵量产编导助手。让大模型深刻理解国内短视频（快手 / 视频号 / 抖音）制作标准，完成本地素材分拣、字幕精准踩点及批量化剪辑流水线架构设计。Leading Words: 中文短视频矩阵编导, 字幕踩点对齐, 本地剪辑素材分拣, 视频号流水线架构
---

# videocut-skills

- **项目主页**: https://github.com/Agentchengfeng/chengfeng-videocut-skills

## 功能说明

上游已重构为 **Codex Marketplace 插件**形态（Plugin `chengfeng-videocut` v0.10.8，仓库自 Ceeon/videocut-skills 迁移至 Agentchengfeng/chengfeng-videocut-skills）：四个业务 Skill 负责判断与编排，确定性动作交给 `chengfeng-videocut` Runtime（v0.4.8 portable，SHA-256 校验安装）的 CLI / API 执行。

| 入口 | 产物 |
|---|---|
| 剪口播（chengfeng-cut） | 已复核的删词账本 |
| 字幕（chengfeng-subtitle） | subtitles.json |
| 画面（chengfeng-visual） | visuals.json + HTML 动画模块（含 ian-xiaohei-svg-motion 样式） |
| 导出（chengfeng-export） | 成片.mp4 |
| 上报 Bug / 检查更新 | 脱敏确认上报 / Marketplace 快照更新检查 |

- 系统要求 macOS（Apple Silicon/Intel）或 Windows 10/11（Runtime v0.4.2 起正式支持）；桌面预览包自带 Runtime、Bun、FFmpeg/FFprobe
- 安装：`npx chengfeng-videocut-skills`（根 package.json 引导器，挂市场 + 精确快照安装）

## 详细指南

- [README.md](README.md) — 上游总说明（安装、Runtime 合同、发布顺序）
- [plugins/chengfeng-videocut/README.md](plugins/chengfeng-videocut/README.md) — 插件说明
- [plugins/chengfeng-videocut/skills/](plugins/chengfeng-videocut/skills/) — 六个子技能目录

> 上游 `.github/`、根 `test/` 与 11 个 `*.test.cjs` 测试脚本未随库分发；`.mcp.json` 运行入口为 `plugins/chengfeng-videocut/dist/server.mjs`（已保留）。当前集成 Plugin 0.10.8 / Runtime v0.4.8（2026-08-21）。
