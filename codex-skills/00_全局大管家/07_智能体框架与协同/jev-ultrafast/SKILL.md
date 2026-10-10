---
name: jev-ultrafast
description: "超快浏览器智能体技能（browser-use × TypeSafe Jev，Agent Skills Hub typesafe-jev 场景实测首选）。动态索引动作空间：给定一个目标，Jev 选题选元素，小模型仅在 TYPE_TEXT 时生成文本；实测苏黎世→伦敦机票全程 7.1 秒。Leading Words: 浏览器智能体, 超快自动化, 动作空间索引, Jev, browser agent, typesafe"
metadata:
  upstream: "github.com/browser-use/jev-ultrafast"
---

# jev-ultrafast

**上游仓库**：<https://github.com/browser-use/jev-ultrafast>

超快浏览器智能体（browser-use 出品）。用法与示例见 [README.md](README.md) 与 [docs/](docs/)、[examples/](examples/)；核心包在 [jev_ultrafast/](jev_ultrafast/)。

## 集成说明（本库维护）

- 集成日期：2026-10-10；来源：Agent Skills Hub 热门场景榜单（对应场景实测首选）。
- 瘦身剔除：tests/、uv.lock、AGENTS.md；保留核心包/文档/示例。
