---
name: semantic-scholar-mcp
description: Semantic Scholar 2亿级语料引文网络神经穿透器 (MCP)。通过智能引文图谱遍历技术追根溯源学术脉络。精准抽取文献影响度、同侪作者网络特征，是深潜科学技术史及前沿爆发预测的神级探测器。Leading Words: SemanticScholar两亿语料穿透, 神经引文图谱遍历溯源, 前沿爆发预测与影响度抽取, 同侪作者网络H-index画像
---

# Semantic Scholar MCP — 引文网络分析

- **项目主页**: https://github.com/xiuyechen/semantic-scholar-mcp

## 功能说明

基于 Semantic Scholar 官方 API 的 MCP Server，可以让 AI 代理深度接入全球最大的学术论文图谱之一（200M+ 论文）。

### 核心工具

| 工具 | 功能 |
|:---|:---|
| `search_papers` | 关键词检索论文，支持年份、领域、Open Access 等过滤 |
| `get_paper` | 通过 Paper ID / DOI / arXiv ID 获取论文完整元数据 |
| `get_citations` | 引文图谱遍历 — 查看谁引用了该论文 / 该论文引用了谁 |
| `get_author` | 作者画像 — h-index、发表数、引用数等 |
| `search_by_author` | 按作者姓名检索其所有发表论文 |

### 核心优势

- **引文追踪**：从一篇种子论文出发，沿着引用链发现上下游的相关研究
- **影响力评估**：通过引用数、h-index 等指标快速评估论文和作者的学术影响力
- **免费使用**：所有 API 调用免费（建议注册 API Key 以提升频率限制）

## 使用条件

- Python 3.10+
- 推荐申请免费 API Key：https://www.semanticscholar.org/product/api
- 无 API Key 也可使用，但有严格的频率限制

## 快速开始

### 作为 MCP Server 使用

```json
{
  "mcpServers": {
    "semantic-scholar": {
      "command": "uvx",
      "args": ["semantic-scholar-mcp"],
      "env": {
        "SEMANTIC_SCHOLAR_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## 常见任务

### 文献综述 — 引文链追踪

1. 检索关键词找到一篇核心论文
2. 使用 `get_citations` 获取引用该论文的后续研究（正向引用）
3. 使用 `get_citations` 获取该论文引用的基础研究（反向引用）
4. 递归构建完整的引文网络图

## 详细指南

关于该技能的详细配置和 API 文档，请参考本地代码库中的 [README.md](./README.md)。
