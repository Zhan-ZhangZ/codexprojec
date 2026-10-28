---
name: ozon-seller-api-mcp
description: 面向 Ozon 跨境电商的 Seller API 与 Performance API 操作技能。用于检索 466 个接口、查询商品/订单/库存/价格/财务/广告数据，并通过受控调用完成商品、价格和运营操作；内置 13 个工作流、限流、Schema 校验和写操作双重确认。
metadata:
  upstream: https://github.com/PCDCK/ozon-mcp
---

# Ozon Seller API MCP

把 Ozon Seller API 与 Performance API 的查询、诊断和受控写入接入 Agent。适配任何支持 MCP stdio 的客户端。

## 适用范围

- 查询商品、订单、库存、价格、财务、分析、评价、聊天和广告数据。
- 按自然语言检索 Ozon API 方法，并查看完整请求/响应 Schema。
- 使用内置工作流进行缺货风险、商品内容、定价和店铺健康检查。
- 在用户明确授权后执行写入或破坏性操作。

## 前置依赖

- Python 3.12 或 3.13。
- `uv`。
- Seller API 的 `OZON_CLIENT_ID` 与 `OZON_API_KEY`。
- 广告分析另需 `OZON_PERFORMANCE_CLIENT_ID` 与 `OZON_PERFORMANCE_CLIENT_SECRET`。

凭据只放在本地环境变量或 MCP 客户端配置中，不要写入本目录或发送到聊天。

## 最短可执行流程

在技能目录执行依赖安装与启动检查：

```bash
uv sync
uv run ozon-mcp --help
```

将服务器注册到 Codex。把路径替换为本技能目录的绝对路径：

```bash
codex mcp add ozon \
  --env OZON_CLIENT_ID=YOUR_CLIENT_ID \
  --env OZON_API_KEY=YOUR_API_KEY \
  -- uv --directory /absolute/path/to/ozon-seller-api-mcp run ozon-mcp
```

需要广告接口时，再追加两个 Performance API 环境变量。启动后按以下顺序使用：

1. `ozon_search_methods` 搜索业务动作。
2. `ozon_describe_method` 核对路径、参数、Schema、限流和风险等级。
3. 只读查询调用 `ozon_call_method`；多页结果使用 `ozon_fetch_all`。
4. 写入前展示目标、字段和预期影响，并取得用户明确确认。
5. 写入调用必须传 `confirm_write=True`；破坏性调用还必须传
   `i_understand_this_modifies_data=True`。

## 工作流入口

先调用 `ozon_list_workflows`，再调用 `ozon_get_workflow` 获取完整步骤。
可用工作流包括缺货风险、店铺健康、内容审计、定价分析、仓库库存、商品/订单/财务/分析/广告同步和 rFBS 退货。

## 失败处理

- `auth` / `forbidden`：检查凭据、API Key 权限或 Premium 订阅。
- `subscription_gate`：当前店铺订阅层级不足以调用该方法。
- `rate_limit`：遵守 `retry_after_seconds`，不要盲目并发重试。
- `invalid_params`：重新调用 `ozon_describe_method` 核对 Schema。
- `server_error` / `timeout`：只对可安全重复的读取重试；写入结果必须先核验再重发。
- 不在真实店铺重复测试破坏性方法，真实调用前先使用最小只读请求验证凭据与权限。

## 关键文件

- `README.md`：上游英文说明与完整客户端配置。
- `README.zh-CN.md`：完整中文说明。
- `SECURITY.md`：安全模型与威胁边界。
- `src/ozon_mcp/knowledge/`：工作流、限流、错误码、风险规则和站点特性。
- `src/ozon_mcp/data/`：随仓库固定版本的 Seller/Performance API Schema 快照。
