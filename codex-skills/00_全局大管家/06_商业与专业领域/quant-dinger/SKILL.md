---
name: quantdinger
description: 量化金融宽客 (Quant) 策略全生命周期研发工作台。覆盖因子脑暴、算法代码生成、回测 (Backtest) 调优与模拟盘全栈流程。助力进阶投研人员将投资逻辑直接落地为高容错的实盘交易信号监控。Leading Words: AI宽客量化投研, 交易策略代码生成, Backtest行情回测, 实盘交易信号监控
metadata:
  version: 5.0.25
  upstream: github.com/OpenByteInc/QuantDinger
---

# QuantDinger (AI Trading OS v5)

- **上游仓库**: https://github.com/OpenByteInc/QuantDinger （原 brokermr810/QuantDinger，已迁移至 OpenByteInc 组织，旧地址自动重定向）
- **当前版本**: v5.0.25（2026-09-02 release，Apache-2.0）
- **官网 / 在线应用**: https://quantdinger.com · https://ai.quantdinger.com
- **本技能定位**: QuantDinger 是完整自托管交易系统（后端源码 + 多进程运行时 + MCP 服务器，上游约 65MB）。本技能**只收录其文档层**——README、部署/配置/策略开发指南、Agent 接入文档、API 契约、策略示例与 Compose/安装配置；源码与开发基建不随包分发，需要时按下文 GitHub 定 tag 链接查阅。

## 功能说明

开源 AI Trading OS + 多租户 SaaS 化交易平台：市场研究（多提供商 AI 分析）→ Python 策略编写（Strategy API V2 + 指标库）→ 服务端回测与实验工作流 → 模拟盘/实盘执行（加密货币交易所、Alpaca、IBKR）→ 监控告警。内置用户管理、计费、支付与结算，可对外运营自己的交易服务。仅做纸面交易与信号研究也可独立使用。

## 快速上手（Agent 操作视角）

1. 通读 [docs/README.md](./docs/README.md)（文档总索引，按目标选路）或 [README.md](./README.md)（项目主页文档，含 v5 架构与仓库地图）。
2. 安装运行：`docker compose -f docker-compose.ghcr.yml up -d`（预构建镜像，推荐），或 `docker compose up -d`（源码栈，需先克隆上游）；环境变量模板见 [.env.example](./.env.example)。
3. 让 AI Agent 接入：按 [docs/agent/MCP_SETUP.md](./docs/agent/MCP_SETUP.md) 配置 MCP，或按 [docs/agent/AGENT_QUICKSTART.md](./docs/agent/AGENT_QUICKSTART.md) 直连 Agent Gateway（`/api/agent/v1`，机器可读契约见 [docs/agent/agent-openapi.json](./docs/agent/agent-openapi.json)）。
4. 写策略：按 [docs/trading/STRATEGY_DEV_GUIDE.md](./docs/trading/STRATEGY_DEV_GUIDE.md)（Strategy API V2 全解）开发，示例代码在 [docs/examples/](./docs/examples/)（双均线做多、图内指标、多指标复合），指标开发见 [docs/trading/INDICATOR_DEV_GUIDE.md](./docs/trading/INDICATOR_DEV_GUIDE.md)。
5. 提交实盘前先读 [README.md](./README.md) 的 Security model 与合规提示：默认纸面交易起步、交易所 API key 最小权限。

## 核心模块（v5 运行时）

- **进程拆分**：HTTP API 不再持有长循环——`migration`（库表迁移）、`backend`（HTTP 认证/查询/指令提交）、`trading-worker`（策略运行时/券商会话/订单/对账）、`scheduler-worker`（组合/部署/支付/通知调度）、`celery-worker` + `celery-beat`（有限可重试任务：AI 作业、回测、报告）各自独立进程。
- **存储**：PostgreSQL 为唯一事实源；`redis` 为可驱逐缓存；`redis-jobs` 为持久 Celery broker/result 层（v5 起双实例分离）。
- **AI 接入面**：Agent Gateway（`/api/agent/v1`，scope 鉴权、异步作业 `/jobs/{id}` 与 SSE 流、审计日志）+ 独立 MCP 服务器（上游 `mcp_server/` 包，源码见 GitHub）；人类 OpenAPI 契约见 [docs/api/openapi.yaml](./docs/api/openapi.yaml)。
- **可观测性**：JSON 日志、request ID、Prometheus 指标、Grafana 面板与告警规则（overlay 配置在 [ops/](./ops/)）。

## 安装与部署

- **一键安装**：根目录 [install.sh](./install.sh)（Linux/macOS）/ [install.ps1](./install.ps1)（Windows PowerShell），安装器生成管理员账号与密钥并拉起 GHCR 预构建栈；上游亦提供 `curl ... | bash` 在线方式（见 [docs/README.md](./docs/README.md)）。
- **Compose 栈**：[docker-compose.yml](./docker-compose.yml)（核心本地/源码栈）、[docker-compose.ghcr.yml](./docker-compose.ghcr.yml)（预构建镜像，`IMAGE_TAG` 定版）、[docker-compose.production.yml](./docker-compose.production.yml)（生产加固 overlay：非 root、只读根文件系、资源限额）、[docker-compose.observability.yml](./docker-compose.observability.yml)（监控 overlay，依赖 [ops/](./ops/) 的 Prometheus/Grafana/Alertmanager 配置）。
- **部署排障**：[docs/deployment/INSTALL_TROUBLESHOOTING.md](./docs/deployment/INSTALL_TROUBLESHOOTING.md)、[docs/deployment/ADMIN_AND_SETTINGS_TROUBLESHOOTING_EN.md](./docs/deployment/ADMIN_AND_SETTINGS_TROUBLESHOOTING_EN.md)。
- **源码级部署**（需克隆上游完整仓库后执行，本技能不带源码）：见 [docs/deployment/CLOUD_DEPLOYMENT_EN.md](./docs/deployment/CLOUD_DEPLOYMENT_EN.md)，密钥生成脚本 [scripts/generate-secret-key.sh](./scripts/generate-secret-key.sh)（Windows 用 [scripts/generate-secret-key.ps1](./scripts/generate-secret-key.ps1)）。

## 配置说明（docs/deployment/）

- 通知渠道：[Telegram](./docs/deployment/NOTIFICATION_TELEGRAM_CONFIG_EN.md) · [Email](./docs/deployment/NOTIFICATION_EMAIL_CONFIG_EN.md) · [SMS](./docs/deployment/NOTIFICATION_SMS_CONFIG_EN.md)（均有 _CN 中文版）
- 登录与账号：[OAuth](./docs/deployment/OAUTH_CONFIG_EN.md) · [多用户](./docs/deployment/MULTI_USER_SETUP.md)
- 支付结算：[USDT 支付](./docs/deployment/USDT_PAYMENT_GUIDE.md)
- 生产运维：[加固](./docs/deployment/PRODUCTION_HARDENING.md) · [可观测性](./docs/deployment/OBSERVABILITY.md)

## 架构与扩展（docs/architecture/）

[总体架构](./docs/architecture/ARCHITECTURE.md) · [模块边界](./docs/architecture/MODULE_BOUNDARIES.md) · [进程与任务归属](./docs/architecture/PROCESS_ROLES_AND_TASKS.md) · [并发模型](./docs/architecture/CONCURRENCY_MODEL.md) · [API 约定](./docs/architecture/API_CONVENTIONS.md) · [扩展指南](./docs/architecture/EXTENSION_GUIDE.md)

## 券商与交易（docs/trading/）

[IBKR 交易指南](./docs/trading/IBKR_TRADING_GUIDE_EN.md) · [公开股票池与基本面数据](./docs/trading/PUBLIC_UNIVERSE_AND_FUNDAMENTALS_CN.md) · 策略安全边界与信号执行约定内嵌于 STRATEGY_DEV_GUIDE。v5 实盘券商面：Binance/OKX/Bybit/Bitget/Gate.io 等加密交易所 + Alpaca + IBKR（v3 的 MT5 指引已在 v5 上游文档中移除）。

## 引用索引

| 需求 | 入口 |
| --- | --- |
| 文档总索引（按目标选路） | [docs/README.md](./docs/README.md) / [docs/README_CN.md](./docs/README_CN.md) |
| 项目主页文档（v5 架构图、仓库地图、安全模型） | [README.md](./README.md) |
| Agent/MCP 接入文档索引 | [docs/agent/README.md](./docs/agent/README.md) |
| Agent 环境三层契约设计 | [docs/agent/AGENT_ENVIRONMENT_DESIGN.md](./docs/agent/AGENT_ENVIRONMENT_DESIGN.md) · [docs/agent/AI_INTEGRATION_DESIGN.md](./docs/agent/AI_INTEGRATION_DESIGN.md) |
| MCP 客户端配置示例 | [docs/agent/cursor-mcp.example.json](./docs/agent/cursor-mcp.example.json) |
| 策略/指标开发 | [docs/trading/](./docs/trading/)（中英双版） |
| 策略示例代码 | [docs/examples/](./docs/examples/) |

> **本地不带源码**：后端（`backend_api_python/`）、MCP 服务器（`mcp_server/`）、CI 与开发脚本未随包分发。查阅或二次开发请克隆上游并以 tag 定位：`https://github.com/OpenByteInc/QuantDinger/blob/v5.0.25/<路径>`。
