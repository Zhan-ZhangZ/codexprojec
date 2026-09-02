---
name: remotion-skills
description: Remotion 官方前端代码级视频编排引擎。赋予 Agent 利用 React.js 框架精细控制每一帧动画与时间轴的能力。专为生成数据排行榜赛马视频、财报周报与可编程的视频工业化生产而生。Leading Words: React编排生成视频, Remotion时间轴控制, 数据排行榜视频生产, 前端代码级视频渲染
version: 4.0.520
---

# remotion-skills

Remotion 官方 Agent Skills（**12 个子技能**）：用 React 编写视频，统一控制画面、字幕、动画与时间轴。用户要做排行榜赛马视频、数据周报、产品更新视频或批量栏目化视频生产时触发；不确定选哪个时先进 `remotion-best-practices`。

## 统一入口（优先读这个）

- **[skills/remotion-best-practices/SKILL.md](skills/remotion-best-practices/SKILL.md)** — 总纲技能，涵盖其余全部子技能的选择逻辑
- [README.md](README.md) — 上游总说明（12 技能目录与安装方式）

## 子技能地图

| 技能 | 用途 |
|---|---|
| `remotion-create` | 新建 Remotion 项目脚手架 |
| `remotion-markup` | HTML/CSS 思维写 React 组件 |
| `remotion-captions` | 字幕与时间轴 |
| `remotion-multimedia` | 音视频/图片资产接入 |
| `remotion-maps` | 地图可视化视频 |
| `remotion-interactivity` | 交互式视频 |
| `remotion-render` | 渲染与导出参数 |
| `remotion-studio` | Studio 预览调试 |
| `remotion-saas` | Rendering API / 云渲染 |
| `remotion-upgrade` | 版本升级迁移 |
| `remotion-docs` | 文档检索约定 |

## v4.0.520 要点（2026-09-01）

- 自 v4.0.457：子技能 1→12 大扩编（原先仅单一 remotion 技能）
- 安装：`npx skills add remotion-dev/skills`，或建项时 `bun create video` 顺带选择

> 上游以 `remotion-dev/skills` 独立仓分发（monorepo `packages/skills` 的镜像源）；`scripts/`（同步/校验基建）未随库分发，需要时访问 [上游仓库](https://github.com/remotion-dev/skills)。
