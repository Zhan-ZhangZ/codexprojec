---
name: roomsmith
description: Roomsmith 室内设计与空间生产交付工作流。根据真实房间照片、尺寸约束和客户目标，完成访谈、现场测绘、空间策略、设计方向、比例图纸、照片级效果图与可追溯 PDF 报告；通过 brief、room-model、direction-set、pilot、spend、report 六道人工审批门禁控制质量、渲染成本和隐私。适用于住宅与单房间改造、室内方案比选、平面/立面/轴测图、效果图及客户提案。
metadata:
  upstream: https://github.com/Rumeasiyan/roomsmith
  upstream_commit: 0e1c042cab0301d270e77575aa2dfbb028a5dab1
---

# Roomsmith

用于真实房间的室内设计、改造与交付，不是无尺寸的装饰灵感生成器。

## 执行位置

先读取：

- [中文使用说明](README.zh-CN.md) 或 [English README](README.md)。
- [作者提供的执行入口](.claude/skills/interior-design/SKILL.md)。
- 当前阶段对应的 `.claude/agents/` 角色：`design-intake`、`design-surveyor`、
  `design-strategist`、`design-author`、`design-critic`、`design-reporter`。
- 完整审批流程见 [WORKFLOW](docs/WORKFLOW.md)，配置字段见 [CONFIG](docs/CONFIG.md)。

依赖为 Python 3.9+、Chrome 或 Chromium，以及一个图像后端：免费的 Codex CLI，或需要
`OPENROUTER_API_KEY` 的付费 OpenRouter。引擎仅使用 Python 标准库。

## 最短工作流

```bash
./bin/design init my-room
# 将客户照片和尺寸草图放入 projects/my-room/refs/
./bin/design status --project my-room
./bin/design check --project my-room
./bin/design drawings --shell --project my-room
```

随后严格按作者入口推进七步流水线：

`intake → survey → strategy → author → pilot pack → full render → report`

客户必须分别批准 `brief`、`room-model`、`direction-set`、`pilot`、`spend`、`report`
六道门禁。不要替客户批准，也不要跳过门禁。

```bash
./bin/design approve brief --project my-room --note "客户已确认"
./bin/design pack 01 --project my-room
./bin/design render --project my-room
./bin/design render --project my-room --dry
./bin/design report --project my-room
```

正式批量渲染前先完成第一个方向的 pilot pack，并优先用 `render --dry` 检查缺图、缺照片、
相机配置和提示词。付费后端只有在 `spend` 门禁已批准且未超过 `max_spend_usd` 时才能使用。

## 按任务深入

- 安装与首次运行：[docs/SETUP.md](docs/SETUP.md)
- 命令和配方：[docs/USAGE.md](docs/USAGE.md)
- 六类 Agent 的职责与交接：[docs/AGENTS.md](docs/AGENTS.md)
- 几何、图纸与渲染为何分离：[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 完整案例与已知陷阱：[docs/EXAMPLE.md](docs/EXAMPLE.md)
- 常见故障：[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

## 不可破坏的约束

- 几何由代码从 `project.yml` 计算；不要让图像模型决定门窗、尺寸或空间结构。
- 发现缺陷时修改房间模型、共享提示词或相机配置，再重新生成；不要手工修补单张图片。
- `must_appear` 中的物品在每一个方向中都应保留，不能用“移到别处”来变相删除。
- 图纸属于方案展示图，不是施工图。照片推断尺寸必须明确标注为待现场复测。
- 客户照片和生成结果默认不提交；只提交可复现设计所需的 brief、测绘和方向规格。
