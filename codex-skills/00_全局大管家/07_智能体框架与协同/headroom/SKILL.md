---
name: headroom
description: "上下文窗口管理引擎（Agent Skills Hub prompt-engineering 场景实测首选，Rust 实现）。分层记忆压缩与注意力调度，为长会话智能体动态管理上下文配额。Leading Words: 上下文管理, 上下文压缩, 长会话记忆, context engine, headroom"
metadata:
  upstream: "github.com/headroomlabs-ai/headroom"
---

# headroom

**上游仓库**：<https://github.com/headroomlabs-ai/headroom>

上下文窗口管理引擎（Rust）。工作区 [crates/](crates/) 与 [headroom/](headroom/)，用法见 [README.md](README.md)。

## 集成说明（本库维护）

- 集成日期：2026-10-10；来源：Agent Skills Hub 热门场景榜单（对应场景实测首选）。
- 剔 tests 15M/sbom 8.4M/target；保留 Rust 工作区源码与文档。
