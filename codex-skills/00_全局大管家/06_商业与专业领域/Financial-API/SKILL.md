---
name: Financial-API
description: 同花顺官方 A股金融数据服务，提供股票实时行情、历史行情、财务报表、指数、板块、涨停等数据，支持 API、MCP、CLI 和 Python SDK。适用于 AI Agent、量化研究和应用开发。Leading Words: 同花顺A股数据, 实时行情查询, 财务报表API, MCP金融数据, 量化研究数据源
---

# 同花顺金融数据服务 (Financial-API)

同花顺官方提供和维护的 A股金融数据服务，面向 AI Agent、量化研究者和应用开发者。

## 前置阅读

> **执行任何操作前，必须先 `view_file` 阅读以下文档：**
> 1. 项目 README：`README.md`（位于本技能根目录）
> 2. 统一 Skill 入口：`skills/hithink-finance/SKILL.md`（AI Agent 路由与能力选择）
> 3. 在线文档：https://fuyao.aicubes.cn/docs/

## 核心能力

| 数据类别 | 覆盖范围 |
|---------|---------|
| A股行情 | 最新快照、历史K线、复权数据 |
| 财务报表 | 利润表、资产负债表、现金流量表、财务指标 |
| 指数与板块 | 指数目录、成分股、板块行情 |
| 特色数据 | 涨停池、连板、异动、热榜、龙虎榜 |
| 公募基金 | 基金资料、净值、持仓、ETF/LOF行情 |
| 基础研究 | 交易日历、公司行动、标的目录 |

## 接入方式

| 方式 | 适用场景 |
|-----|---------|
| Agent Skill | AI 自动判断使用 API/MCP/CLI/SDK |
| MCP | Claude/Cursor 等 AI 工具对话接入 |
| Python SDK | Notebook 研究、数据处理 |
| REST API | 网站/App/后端系统集成 |
| CLI | 终端批量查询与导出 |
| marketdb | 本地 DuckDB 数据库 |

## 依赖要求

- API Key：通过 https://fuyao.aicubes.cn/admin/ 获取
- Python 3.11+ / Node.js 22.12+（按接入方式选择）
