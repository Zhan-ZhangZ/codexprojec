---
name: hyperframes
description: 高阶线框图（Wireframe）与极简视觉框架生成引擎。专为产品早起脑暴与交互探讨而生，以极具克制力的高反差黑白灰和工业感线条，极速出图，直击核心需求逻辑。Leading Words: 工业级高反差线框图, 产品早期交互脑暴, 极简克制风视觉推演
metadata:
    upstream: github.com/heygen-com/hyperframes
    version: v0.8.25
---

# hyperframes

- **项目主页**: https://github.com/heygen-com/hyperframes
- **上游版本**: v0.8.25（2026-09-02 覆盖集成）

## 功能说明

写 HTML、渲染视频、面向 Agent 的开源视频引擎（Apache-2.0）。用 HTML + CSS + GSAP 时间轴编写合成（composition），由 CLI 渲染为 MP4，可制作产品宣传、动态海报、解说视频、PPT 风格幻灯、音乐卡点视频、字幕与口播包装等。工具本体经 npm 分发（`npx hyperframes`），注册表块/组件在运行时经网络安装；本仓库保留**技能层与文档层**。

## 技能集（skills/，20 个子技能）

**入口（必读）**
- `hyperframes` — 任何视频/动画/动效请求的强制入口：设计系统、合成方法、生产工作流
- `hyperframes-core` — 合成契约：`data-*` 时间属性、`class=` 动画挂钩、可渲染项目结构
- `hyperframes-cli` — CLI 开发环：init / add / catalog / capture / lint / check / snapshot / compare / preview / render / publish / cloud 等

**专项工作流**
- `general-video` — 无专用工作流时的通用合成编写与编辑
- `product-launch-video` — 产品 URL / 脚本 / 需求 → 产品发布宣传视频
- `faceless-explainer` — 文章 / 笔记 / 主题 → 无真人出镜解说视频
- `music-to-video` — 音乐曲目 → 卡点视频（歌词视频、节拍同步画面）
- `motion-graphics` — 动效即信息的设计短片（动态字体、数据可视化、logo sting、社交字幕条）
- `slideshow` — 演示文稿 / 路演幻灯：分页、碎片揭示、分支导航、演讲者模式
- `talking-head-recut` — 口播 / 访谈 / 播客视频的图形包装（动态标题、下三分之一、数据卡）
- `embedded-captions` — 单人口播视频加字幕（逐字轨道 / 嵌入式电影字幕 / VFX 字幕）
- `pr-to-video` — GitHub PR → 代码变更解说视频
- `remotion-to-hyperframes` — 将 Remotion（React）合成源码移植为 HyperFrames HTML
- `figma` — Figma 渲染资产 / 品牌 token / 组件导入合成

**横切能力**
- `hyperframes-animation` — 全部动画知识：原子运动规则、多阶段场景蓝图、场景转场
- `hyperframes-keyframes` — punch-in、zoom、Ken Burns、镜头移动等 seek 安全关键帧（GSAP / CSS / Anime.js / WAAPI）
- `hyperframes-audio` — 合成内混音：淡入淡出、交叉淡化、音量自动化、配音闪避
- `hyperframes-creative` — 非动画创意方向：设计规格（frame.md / design.md）、配色、字体、叙事
- `hyperframes-registry` — 注册表块 / 组件的发现、安装与接线（`hyperframes add` / `hyperframes catalog`）
- `media-use` — 项目媒体总入口：BGM / SFX / 图片 / 图标 / 品牌资产 / 配音 / 配色解析

## 详细指南

- 使用文档：[docs/](./docs/)（快速开始 [quickstart.mdx](./docs/quickstart.mdx)、提示词指南 [prompting/](./docs/prompting/)、CLI 与包参考 [packages/](./docs/packages/)、部署 [deploy/](./docs/deploy/)、SDK [sdk/](./docs/sdk/)、更新日志 [changelog.mdx](./docs/changelog.mdx)）
- 项目说明：[README.md](./README.md)；部署模板：[examples/](./examples/)；品牌图标：[assets/](./assets/)

## 本仓库集成形态

本技能为**文档 + 技能层**集成：上游源码包（`packages/`，经 npm 分发）、注册表（`registry/`，运行时自 `raw.githubusercontent.com` 拉取）、开发基建（`scripts/` `releases/` `plans/` `themes/` 与 CI 配置）及官网展示资产（`docs/public/` `docs/catalog/`）不随库分发，需要时查阅上游 v0.8.25 tag。
