---
name: Financial-API
description: 同花顺官方 A股金融数据服务，提供股票实时行情、历史行情、财务报表、指数、板块、涨停等数据，支持 API、MCP、CLI 和 Python SDK。适用于 AI Agent、量化研究和应用开发。Leading Words: 同花顺A股数据, 实时行情查询, 财务报表API, MCP金融数据, 量化研究数据源
version: 0.1.7
---

# 同花顺金融数据服务 (Financial-API)

同花顺（HiThink）官方维护的 A 股金融数据服务，面向 AI Agent、量化研究者和应用开发者，提供 REST API、MCP、CLI 与 Python SDK 四种接入方式。

## 统一入口（优先读这个）

**[references/hithink-finance/SKILL.md](references/hithink-finance/SKILL.md)** 是上游官方提供的统一 Agent 入口与主路由：自动探测当前环境（REST / MCP / CLI / Python SDK 可用性），处理配置边界并路由到对应接入方式的详细契约。做数据任务前先读它，再按路由只读对应的一级入口：

| 接入方式 | 详细文档 |
| --- | --- |
| REST API | [references/hithink-finance/references/api.md](references/hithink-finance/references/api.md)（能力地图 + 按域的端点明细） |
| MCP | [references/hithink-finance/references/mcp.md](references/hithink-finance/references/mcp.md)（4 个 MCP 服务器的工具契约） |
| CLI（`hithink-finance`） | [references/hithink-finance/references/cli.md](references/hithink-finance/references/cli.md)（安装、远端取数、本地 DuckDB、诊断） |
| Python SDK / marketdb | [references/hithink-finance/references/python-sdk.md](references/hithink-finance/references/python-sdk.md)（远端 toolkit + 本地 DuckDB 库） |

## 能力速览

- **行情**：实时/历史行情、指数、板块、涨停池/跌停池/炸板池、集合竞价（实时与终态快照、短期基准）
- **财报**：财务报表与财务指标
- **估值**：批量 A 股估值快照（PE TTM/MRQ、PB MRQ、PS TTM、PCF TTM）
- **公募基金**：基金资料、持仓、净值、区间收益、持有人结构、ETF/LOF 行情与历史日线（21 项基金公司/经理/业绩/资讯能力）
- **特色数据**：A 股特色数据集
- **本地库**：marketdb（Python + DuckDB），Parquet 全量 dumps + REST/MCP 增量更新

## 近期能力演进（v0.1.x）

- **2026-08-17**：集合竞价快照/短期基准、跌停池与炸板池、21 项基金能力扩展；CLI 0.1.5 发布
- **2026-07-24**：A 股估值快照能力（PE/PB/PS/PCF）
- **2026-07-17**：公募基金能力（资料/持仓/净值/收益/持有人、ETF/LOF）
- 完整历史见 [references/CHANGELOG.md](references/CHANGELOG.md)；monorepo 路径与版本升级说明见 [references/docs/monorepo-migration.md](references/docs/monorepo-migration.md)

## 参考文档索引

- [references/README.md](references/README.md) — 上游总说明（monorepo 结构与各子项目入口）
- [references/docs/](references/docs/) — API 与 MCP 的原始文档（api/、mcp/）
- [references/CHANGELOG.md](references/CHANGELOG.md) — 版本与能力演进历史
- [references/LICENSE](references/LICENSE) — 许可证
