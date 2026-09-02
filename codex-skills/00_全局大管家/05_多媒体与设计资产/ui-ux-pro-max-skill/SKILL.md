---
name: ui-ux-pro-max-skill
description: Pro Max 级现代 UI/UX 工业设计系统与美学法则宪章。内含数百条原子化 (Atomic Design) 交互审查原则，强制规范大模型产出 Tailwind/CSS 时的间距、色彩与排版，并植入用户心智模型与无障碍 (a11y) 规范。Leading Words: UI/UX工业设计系统审查, AtomicDesign美学法则, a11y无障碍交互排版, Tailwind/CSS间距色彩强制规范
version: 2.13.0
---

# ui-ux-pro-max-skill

`ui-ux-pro-max`：Agent 设计智能数据库——**84 种 UI 风格、192 组配色、74 组字体搭配、98 条 UX 准则、25 类图表、22 个技术栈专属规范**。用户要设计界面、配色选型、排版审查、a11y 检查或产出 Tailwind/CSS 时触发。

## 统一入口（优先读这个）

- **[src/ui-ux-pro-max/](src/ui-ux-pro-max/)** — 官方技能包本体：`data/`（styles/colors/typography/ux-guidelines/motion/icons 等 18 项 CSV+JSON 数据集与 stacks 分栈规范）、`scripts/`（Python 检索/校验）、`templates/`
- [README.md](README.md) — 上游总说明（[中文版](README.zh.md)，另有韩/印尼/越南语）
- [docs/三个 data-scripts-templates 的区别.md](docs/三个\ data-scripts-templates\ 的区别.md) — 三层结构说明

## 数据面（src/ui-ux-pro-max/data/）

`styles.csv`（84 风格全分类与来源元数据）、`colors.csv`（192 配色）、`typography.csv`（74 字体搭配）、`ux-guidelines.csv`（98 准则）、`charts.csv`（25 图表型）、`google-fonts.csv` + `icons.csv`、`ui-reasoning.csv`、`landing.csv`、`motion.csv`、`app-interface.csv`、`react-performance.csv`、`stacks/`（22 框架专属规范：React/Vue/Tailwind/iOS/Android 等）

## 安装形态（用户侧）

- 技能直接可用（本库已携完整数据）；上游亦提供 npm CLI：`npm install -g ui-ux-pro-max-cli`（`uipro init --ai claude|cursor|codex` 等 9 端初始化），CLI 另捆绑 6 个伴生技能（design/brand/slides/banner-design/ui-styling/design-system）

## v2.13.0 要点（2026-09-02）

- 自 v2.6.2 增量：UX 准则扩充至 98 条（a11y 阶段性刷新）、检索数据质量整修（search-data overhaul）、设计系统树新增 project-slug 层级文档、Web 栈新鲜度第 7 阶段
- 版本口径：skill.json（技能内容）2.13.0；tag 序列（v2.15.0）跟踪 CLI 发布，两者独立
- 完整历史见 [README.md](README.md)「What's New」与 [docs/journals/](docs/journals/)

## 参考文档索引

- [CLAUDE.md](CLAUDE.md) — 上游开发约定（模块图/数据同步链路）
- [scripts/](scripts/) — 数据维护脚本（CSV 校验、目录汇总、字体/图标刷新）
- [screenshots/](screenshots/) — 效果截图；[skill.json](skill.json)、[LICENSE](LICENSE)、[SECURITY.md](SECURITY.md)、[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)、[CONTRIBUTING.md](CONTRIBUTING.md)

> 上游为 npm `ui-ux-pro-max-cli` + 技能包双形态分发；`cli/`（npm 源码，assets 与 src/ 逐字节重复）、`stack/`（Claude Website Design Stack 独立子项目）、`gallery/`（Next.js 演示站）、`projects/`、`preview/` 未随库分发，需要时访问 [上游仓库](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/tree/58c220f)。
