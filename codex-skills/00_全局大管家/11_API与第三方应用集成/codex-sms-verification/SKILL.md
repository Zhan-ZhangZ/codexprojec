---
name: codex-sms-verification
description: VirtualSMS 全球虚拟验证码截获与穿透 MCP 插件。赋予无头浏览器 Agent 直连 145+ 国家的实体 SIM 卡网关池能力，瞬间越过 2000+ 平台的手机注册防火墙。支持 StdIO 与云端挂载，自动化填槽短信验证码。Leading Words: 全球短信验证码拦截, 实体SIM网关穿透代理, 无头浏览器免登录绕过, 验证码自动化填槽
---

# codex-sms-verification

- **项目主页**: https://github.com/virtualsms-io/claude-skill-sms-verification

## 功能说明
VirtualSMS 已从单一短信验证码工具升级为面向开发者与 AI Agent 的「账号验证平台」：把一次性短信验证、专属号码租用、同国代理与私有云端浏览器会话（beta）整合到同一 API、同一 MCP 服务器与同一预付余额之下，覆盖 2500+ 服务、145+ 国家。所有号码均为运营商发行的实体 SIM（Vodafone、O2、T-Mobile 等），能通过目标平台的运营商线路核查，不会像 VoIP 号码那样在注册时被静默拒绝。

MCP 服务器默认提供 40 个工具（实际调用名带 `virtualsms_` 前缀，例如 `virtualsms_create_order`），按能力分为四组：

- **激活与账户（18 个）**：服务/国家目录与最低价实时查询（`list_services`、`list_countries`、`get_price`、`find_cheapest`、`search_services`，其中目录类查询免鉴权）；账户余额、档案、统计与流水（`get_balance`、`get_profile`、`get_stats`、`get_transactions`）；购号下单 `create_order`；等码两条路径——`wait_for_sms` 以 WebSocket 阻塞等待、验证码落地即返回（交互式工作流首选），`get_sms` 主动轮询（批处理/定时任务适用）；订单全生命周期管理 `get_order`、`list_orders`、`order_history`、`cancel_order`、`cancel_all_orders`、`swap_number`（120 秒冷却内免费换号）。
- **号码租用（9 个）**：按天租用专属号码（1–30 天，Full Access / Platform 两档库存与定价不同），`rentals_pricing`、`rentals_available`、`rentals_services`、`rentals_price` 查实时目录，`create_rental` 起租、`list_rentals` / `get_rental` 查询、`extend_rental` 续租、`cancel_rental` 在购后 20 分钟且未收码时全额退款。
- **代理（10 个）**：购买与号码同国的住宅/移动/数据中心代理，让 IP 与号码归属一致；`list_proxy_catalog` 起步查价，`buy_proxy` 按 GB 购流量，`generate_proxy_endpoint` 生成即用连接串（可按国家/州/城市/ZIP/ASN 定向，轮换或粘滞，HTTP/SOCKS5），`rotate_proxy` 换出口 IP，`test_proxy` 验活，另有用量查询与默认地理定向设置。
- **其他（3 个）**：`retry_order` 请求同号重发；`check_number` 对任意 E.164 号码做运营商与线路类型（手机/固话/VoIP）及垃圾风险查询，免鉴权；`start_manual_registration_session` 启动同国云浏览器会话（beta、邀请制）。

另有一批**门控工具**默认关闭，需通过环境变量显式开启后才可假定存在：会话导航三件套（`VIRTUALSMS_ENABLE_SESSIONS`）与一个退款条款未定的早期租用工具（`VIRTUALSMS_ENABLE_RELEASE`）。

## 推荐流程
获取验证码的常用路径：`find_cheapest(service)` 选最便宜国家 → `create_order(service, country)` 得到号码与 `order_id` → 在目标平台触发验证 → `wait_for_sms(order_id)` 返回验证码；失败则 `swap_number` 换号或 `cancel_order` 退款。租号、代理与云浏览器同样遵循「先查目录再下单」：`rentals_available` → `create_rental`；`list_proxy_catalog` → `buy_proxy` → `generate_proxy_endpoint`。号码与代理配对使用时，先买号、再买同国代理，确保目标平台看到的号码与 IP 归属一致。

## 接入方式
- **云端挂载（推荐，零安装）**：MCP 端点 `https://mcp.virtualsms.io/mcp`，请求头携带 `x-api-key`。
- **本地 StdIO**：单条命令 `npx virtualsms-mcp`，并在 MCP 配置 `env` 中设置 `VIRTUALSMS_API_KEY`。
- API Key 可在 https://virtualsms.io 免费注册；各客户端（Claude Desktop、Claude Code、Cursor、Codex 等）配置矩阵见 https://virtualsms.io/mcp 。

## 详细指南
关于该技能的完整 40 工具参考、门控工具说明、触发条件与各客户端接入细节，请参考本地代码库中的 [README.md](./README.md)。
