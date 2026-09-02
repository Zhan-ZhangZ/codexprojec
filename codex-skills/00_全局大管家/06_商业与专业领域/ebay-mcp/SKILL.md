---
name: ebay-mcp
description: eBay 官方店群自动化运营中枢 (MCP)。深度封装 300+ 个底层 Sell API 端点。能够完全托管 SKU 在线刊登、海外仓发货面单流转、自动打折促销活动 (Promotions) 及全景销量盘点。Leading Words: eBay自动化店群运营, Sell API深度封装, SKU在线刊登流转, 面单打印与促销折扣
version: 1.15.0
---

# ebay-mcp — 跨境电商与店铺管理 MCP 服务

`ebay-mcp`：本地 eBay Sell API MCP 服务器（**299 个工具，100% Sell API 覆盖**），一条命令完成 OAuth 凭据配置。用户要刊登商品、处理订单/面单、设置促销、盘点销量或查询店铺经营数据时触发。

## 安装形态（用户侧）

- **npm 全局安装（推荐）**：`npm install -g ebay-mcp`，再跑 `npm run setup` 向导——浏览器自动打开 OAuth 流程，配好凭据与 MCP 客户端
- **Docker**：仓库提供 [Dockerfile](Dockerfile) 与 [docker-compose.yml](docker-compose.yml)（容器友好默认值：`PORT`、`0.0.0.0`、`MCP_AUTH_TOKEN`）
- 传输：stdio 与 HTTP 双模；只读模式 `EBAY_READ_ONLY` 可过滤全部写操作工具

## 工具面（299 个，按 18 类组织）

account / analytics / browse / communication / connector / developer / fulfillment / inventory / listing / marketing / metadata / negotiation / taxonomy / tokenManagement / trading / recommendation / compliance / feedback 等。完整目录与源码对照见 [README.md](README.md)（工具总表）与 [docs/sell-apps/](docs/sell-apps/)（eBay 官方 OAS3 规范镜像，4.8M）。

## v1.15.0 要点（2026-08-15）

- v1.15.0 为 npm 恢复发布（recovery），CHANGELOG 记至 1.14.3
- 自 1.12.0 增量：**1.14.0** 容器化 HTTP 默认值、`Accept-Language` 本地化、只读模式、比价 comps 与卖家客服助手；**1.14.2** Trading API 站点 ID 按市场推导（非美站刊登货币修复）；**1.14.3** 空响应体修复、刷新令牌持久化串行化、npm 全局安装 `ebay-mcp diagnose`
- 完整历史见 [CHANGELOG.md](CHANGELOG.md)

## 参考文档索引

- [README.md](README.md) — 安装向导（含截图步骤）/ 299 工具总表 / 客户端对照（[中文版](README.zh-CN.md)，另有日韩德西法葡俄 8 语）
- [ARCHITECTURE.md](ARCHITECTURE.md)、[CONTEXT.md](CONTEXT.md)、[PROJECT.md](PROJECT.md) — 架构与项目导航
- [EBAY_COMPLIANCE.md](EBAY_COMPLIANCE.md) — 合规要点；[SECURITY.md](SECURITY.md)、[LICENSE](LICENSE)
- [docs/](docs/) — API 状态、ADR、认证、应用设置、故障排查、sell-apps OAS3 规范全集
- [llms.txt](llms.txt) — Agent 友好摘要

> 上游以 npm `ebay-mcp` 分发；`src/`、`tests/`、`ui/`、构建配置与演示媒体（hero 图/教学视频/图标集，皆装饰性或无引用）未随库分发，走 GitHub tag 链接；安装向导截图 `public/screenshot-guides/` 因属操作指引而保留。需要源码时访问 [上游仓库](https://github.com/YosefHayim/ebay-mcp/tree/v1.15.0)。
