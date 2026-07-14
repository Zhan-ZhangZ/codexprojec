---
name: paper-search-mcp
description: 7+ 巨头学术数据库并发洪流搜索与自动降噪收敛引擎 (MCP)。横跨生医 (PubMed/medRxiv)、计算机与数理领域。毫秒级并发查询、智能去重及 LLM 强格式化对齐，输出高度聚合的纯净学术搜索摘要。Leading Words: 7+核心学术库并发搜索, bioRxiv/IACR跨学科收敛, 洪流检索自动去重降噪, LLM强格式化学术摘要
---

# Paper Search MCP — 多源并发检索与去重

- **项目主页**: https://github.com/openags/paper-search-mcp

## 功能说明

`paper-search-mcp` 是一个面向科研工作者的 MCP Server，专为 AI 代理设计的学术论文检索引擎。

### 核心特性

| 特性 | 说明 |
|:---|:---|
| **多源并发** | 同时检索 arXiv、PubMed、bioRxiv、medRxiv、Google Scholar、IACR、Semantic Scholar |
| **智能去重** | 基于标题相似度自动合并跨库重复结果 |
| **Free-First** | 优先使用免费开放数据源，降低使用门槛 |
| **LLM 友好** | 标准化 JSON 输出，适合 Agent 后续摘要和分析 |
| **PDF 获取** | `download_with_fallback` 按序尝试多个下载源 |

### 两层架构

- **Layer 1 (统一工具层)**：高层函数如 `search_papers`（并发多源检索）和 `download_with_fallback`（多源 PDF 下载）
- **Layer 2 (平台连接器层)**：模块化、可扩展的学术平台连接器

## 使用条件

- Python 3.10+
- `pip install paper-search-mcp`
- 全部免费，无需 API Key

## 快速开始

### 通过 Smithery 安装

```bash
npx -y @smithery/cli install @openags/paper-search-mcp --client claude
```

### 手动配置 MCP Server

```json
{
  "mcpServers": {
    "paper-search": {
      "command": "uvx",
      "args": ["paper-search-mcp"]
    }
  }
}
```

## 与现有 paper-search 的区别

| 对比维度 | paper-search (现有) | paper-search-mcp (本项目) |
|:---|:---|:---|
| 数据源 | arXiv + PubMed | 7+ 数据源 |
| 去重 | 基础标题去重 | 智能去重算法 |
| 运行方式 | Python 脚本 | MCP Server + CLI |
| PDF 下载 | 不支持 | 多源 fallback 下载 |

## 详细指南

关于该技能的详细配置和扩展平台的方法，请参考本地代码库中的 [README.md](./README.md)。
