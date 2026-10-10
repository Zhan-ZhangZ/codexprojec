---
name: codegraph
description: "代码知识图谱引擎（ASH knowledge-base 榜 #2，colbymchenry）。tree-sitter WASM 解析器全集（66M）+ 文法内核（55M）把代码库构建为可查询图谱，MCP 接入供智能体检索调用关系。Leading Words: 代码图谱, 调用关系检索, tree-sitter, 代码知识库, codegraph"
metadata:
  upstream: "github.com/colbymchenry/codegraph"
---

# codegraph

**上游仓库**：<https://github.com/colbymchenry/codegraph>

代码知识图谱：[src/extraction/](src/extraction/) WASM 解析器、[codegraph-kernel/](codegraph-kernel/) 文法内核、MCP 接入。

## 集成说明（本库维护）

- 集成日期：2026-10-10；来源：Agent Skills Hub 热门场景 Top3 榜单。
- 剔 __tests__/治理；729 文件 134M（WASM 解析器与文法内核为运行核心，全保留）。
