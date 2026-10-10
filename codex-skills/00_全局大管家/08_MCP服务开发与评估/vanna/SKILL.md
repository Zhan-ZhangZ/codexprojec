---
name: vanna
description: "文本生成 SQL 框架（Agent Skills Hub mcp-database 场景实测首选）。RAG+SQL 训练：自然语言→SQL，向量库任选 + LLM 任选，含 MCP 接入。Leading Words: Text2SQL, 自然语言查库, SQL生成, 数据库MCP, vanna"
metadata:
  upstream: "github.com/vanna-ai/vanna"
---

# vanna

**上游仓库**：<https://github.com/vanna-ai/vanna>

Text-to-SQL 框架：[src/vanna/](src/vanna/) 核心包，MCP 接入与 frontends 见 [README.md](README.md)。

## 集成说明（本库维护）

- 集成日期：2026-10-10；来源：Agent Skills Hub 热门场景榜单（对应场景实测首选）。
- 剔 tests/notebooks/papers/img/tox；保留 src 核心包与 frontends。
