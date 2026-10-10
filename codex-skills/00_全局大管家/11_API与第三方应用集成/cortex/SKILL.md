---
name: cortex
description: "API 规范上下文服务器（Agent Skills Hub mcp-api 场景实测首选）。把 OpenAPI 等 API 规范与 Markdown 一份配置转成带类型的 SDK、交互式文档与 MCP 服务器，让编码智能体获得可执行的 API 上下文。Leading Words: API规范转SDK, OpenAPI上下文, MCP服务器生成, API文档交互, cortex"
metadata:
  upstream: "github.com/cortex-docs/cortex"
---

# cortex

**上游仓库**：<https://github.com/cortex-docs/cortex>

API 规范 → 类型化 SDK + 交互文档 + MCP 服务器。monorepo 在 [packages/](packages/)，用法见 [README.md](README.md)。

## 集成说明（本库维护）

- 集成日期：2026-10-10；来源：Agent Skills Hub 热门场景榜单（对应场景实测首选）。
- 瘦身剔除：e2e/、治理与开发配置；保留 packages/ monorepo 与文档。
