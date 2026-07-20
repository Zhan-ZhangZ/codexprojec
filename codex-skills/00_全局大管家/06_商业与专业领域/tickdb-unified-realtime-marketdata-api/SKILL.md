---
name: tickdb-unified-realtime-marketdata-api
description: TickDB AI 原生实时行情数据统一 API，覆盖外汇、贵金属、指数、美股、港股、A 股、加密货币。支持 Skill、CLI、MCP、REST API 和 WebSocket 接入，提供实时行情、K线、订单簿、资金流向等数据。Leading Words: TickDB实时行情API, 全球多市场数据, AI原生金融接口, WebSocket行情流, MCP行情服务
---

# TickDB — 统一实时行情数据 API

AI 原生实时行情数据 API，通过一次接入覆盖外汇、贵金属、指数、美股、港股、A 股、加密货币等多个金融市场。

## 前置阅读

> **执行任何操作前，必须先 `view_file` 阅读以下文档：**
> 1. 项目 README：`README.md`（位于本技能根目录）
> 2. 内置 Skill 配置：`SKILL/SKILL.md`（AI Agent 详细行为规范与 API 契约）
> 3. 在线文档：https://docs.tickdb.ai

## 核心特性

- **统一接入**：一套 API 覆盖外汇、贵金属、指数、美股、港股、A 股、加密货币
- **实时数据**：WebSocket 流式推送，端到端延迟约 10-50ms
- **AI 原生**：官方提供 Skill / MCP / CLI 三档 AI 接入
- **全球覆盖**：37,527+ 品种，6 大市场

## 接入方式

| 方式 | 适用场景 |
|-----|---------|
| Skill | AI 对话即用，零配置，npx 一键安装 |
| MCP | AI 编码客户端 / 自部署开源 |
| CLI | 终端/脚本/AI Agent |
| REST API | HTTP 应用集成，6 个端点 |
| WebSocket | 实时流式行情数据订阅 |

## 典型场景

- 量化交易策略的实时行情数据源
- AI Agent 通过 Skill/MCP 自然语言驱动查询
- 行情看板与投资组合监控
- 历史行情分析与策略回测
- 金融服务平台集成

## 依赖要求

- API Key：通过 https://tickdb.ai 获取（免费开始，无需信用卡）
- MCP 自部署需要 Python 3.x + Docker（可选）
