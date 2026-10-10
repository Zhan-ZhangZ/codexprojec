---
name: open-code-review
description: "阿里巴巴开源混合架构代码评审工具（Agent Skills Hub 场景实测首选，★45.5k）。确定性流水线 + LLM Agent 双层：精确规则先行、低噪声，SWR-Bench 实测领先；Go 单二进制 + GitHub Action + VSCode/IDEA 扩展，另含 open-code-review/open-code-review-delegate 两个 Agent 技能。Leading Words: 代码评审, PR review, AI审阅, 混合架构, SWR-Bench, 低噪声评审, open code review"
metadata:
  upstream: "github.com/alibaba/open-code-review"
---

# open-code-review

**上游仓库**：<https://github.com/alibaba/open-code-review>

阿里巴巴混合架构代码评审：确定性流水线 + LLM Agent。快速开始见 [README.md](README.md)；Agent 技能在 [skills/](skills/)，VSCode/IDEA 扩展在 [extensions/](extensions/)，GitHub Action 用法见 [action.yml](action.yml)。

## 集成说明（本库维护）

- 集成日期：2026-10-10；来源：Agent Skills Hub 热门场景榜单（01_代码工程与架构 场景实测首选）。
- 瘦身剔除：pages/ 官网、imgs/ 2.5M 配图（README 引用已改上游绝对 URL）、治理与开发配置；保留 Go 源码/skills/扩展/action。
