---
name: stock-data-mcp
description: 基于 FastMCP 框架的多市场股票数据聚合 MCP 服务器，为 AI Agent 提供统一的股票/加密货币市场数据接口。支持 A 股、港股、美股、加密货币，采用多源数据供应商自动故障转移架构。Leading Words: 股票数据MCP服务, 多市场行情聚合, A股港股美股加密货币, FastMCP数据接口, 多源故障转移
---

# Stock Data MCP Server

基于 FastMCP 框架的股票数据聚合 MCP 服务，为 Claude Code 等 AI Agent 提供统一的股票/加密货币市场数据接口。

## 前置阅读

> **执行任何操作前，必须先 `view_file` 阅读 `README.md`**（位于本技能根目录），获取完整的安装、配置与工具列表。

## 核心能力

提供 43+ 个工具，覆盖以下市场：

### A 股
- 指数/个股 K 线、实时行情、批量行情
- 股票搜索、基本信息、财务指标
- 龙虎榜、板块资金流、融资融券
- 涨停池、北向资金、大宗交易
- 股东人数、筹码分布、资金流向
- 板块行情/成分股、PE 分位/行业 PE
- 分红历史、基金持仓、业绩日历
- 财务对比、限售解禁、质押比例、十大股东
- 回测策略

### 美股/港股/加密货币
- 美股/港股 K 线、概览、财报、业绩、内部交易
- 美股新闻、技术指标
- OKX 行情/借贷比/主动买卖量
- Binance AI 报告
- 个股/宏观新闻、全球市场概览

## 安装与使用

```bash
# 安装
pip install stock-data-mcp

# stdio 模式
stock-data-mcp

# HTTP 模式
stock-data-mcp --http --host 0.0.0.0 --port 8808

# 添加到 Claude Code
claude mcp add stock-data \
    -e TUSHARE_TOKEN=your_token \
    -e ALPHA_VANTAGE_API_KEY=your_key \
    -- uvx stock-data-mcp
```

## 依赖要求

- Python 3.x
- 可选 API Key：Tushare Token、Alpha Vantage API Key、OKX/Binance 配置

## 异常处理

- 若多源数据供应商均不可用，返回明确的错误提示与建议
- 自动故障转移：主数据源失败时自动切换至备用源
