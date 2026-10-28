# ozon-seller-api-mcp

> Ozon Seller API 与 Performance API 的 MCP 服务器。
> 让任何 AI Agent 在几分钟内连接到 Ozon 卖家后台。

[![CI](https://github.com/PCDCK/ozon-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/PCDCK/ozon-mcp/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/python-3.12%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![MCP](https://img.shields.io/badge/MCP-compatible-orange)

`ozon-mcp` 是一个知识密集型的 MCP 服务器，把完整的 Ozon 卖家工具集整理成 15 个高效工具。Claude、Cursor、Cline、Continue、Goose、Zed 等 AI Agent 可以用俄语或英语检索 API，查看 466 个方法的完整 JSON Schema，并在内置安全护栏下执行调用。

它支持订阅层级判断、4 种游标风格的自动分页、429 重试退避，以及 13 个可直接使用的分析工作流。

**关键数据：** 466 个已索引方法（420 个 Seller API + 46 个 Performance API）、55 个分区、5 种订阅层级、38 个自动翻页端点、43 个双重确认的破坏性方法、13 个典型卖家场景工作流。

## 快速开始

### 前置要求

- Python 3.12 或 3.13。
- `uv` 包管理器：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

- Ozon Seller API 凭据：`Client-Id` 和 `Api-Key`，可在 <https://seller.ozon.ru/app/settings/api-keys> 获取。

### 安装

```bash
git clone https://github.com/PCDCK/ozon-mcp.git
cd ozon-mcp
uv sync
```

本技能已完整收录运行源码，因此也可以在本技能目录执行同样检查。

### 验证

```bash
uv run ozon-mcp --help
```

应当看到 FastMCP 的使用说明。服务器使用 MCP stdio 协议，可接入任何兼容客户端。

## 连接 AI Agent

`ozon-mcp` 使用标准 MCP stdio 传输。以下示例都暴露相同的 15 个工具，可任选已有客户端。

### Claude Desktop

编辑：

- macOS：Claude Desktop 用户目录下的 `claude_desktop_config` 配置文件。
- Windows：`%APPDATA%` 下的 Claude Desktop 配置目录。

```json
{
  "mcpServers": {
    "ozon": {
      "command": "uv",
      "args": ["--directory", "/absolute/path/to/ozon-mcp",
                "run", "ozon-mcp"],
      "env": {
        "OZON_CLIENT_ID": "your-seller-client-id",
        "OZON_API_KEY": "your-seller-api-key",
        "OZON_PERFORMANCE_CLIENT_ID": "your-perf-client-id",
        "OZON_PERFORMANCE_CLIENT_SECRET": "your-perf-secret"
      }
    }
  }
}
```

### Claude Code（CLI）

```bash
cd /path/to/ozon-mcp
claude mcp add ozon -- uv run ozon-mcp
```

也可以在 `~/.claude/mcp.json` 中使用与上面 Claude Desktop 相同结构的配置。

### Cursor

进入 Settings → MCP → Add new MCP Server，或编辑 `~/.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "ozon": {
      "command": "uv",
      "args": ["--directory", "/absolute/path/to/ozon-mcp",
                "run", "ozon-mcp"]
    }
  }
}
```

### Windsurf

编辑 `~/.codeium/windsurf/mcp_config.json`：

```json
{
  "mcpServers": {
    "ozon": {
      "command": "uv",
      "args": ["--directory", "/absolute/path/to/ozon-mcp",
                "run", "ozon-mcp"]
    }
  }
}
```

### Cline（VS Code 扩展）

进入 Cline → Settings → MCP Servers → Add：

```json
{
  "ozon": {
    "command": "uv",
    "args": ["--directory", "/absolute/path/to/ozon-mcp",
              "run", "ozon-mcp"]
  }
}
```

### Continue.dev

编辑 `~/.continue/config.json`：

```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "transport": {
          "type": "stdio",
          "command": "uv",
          "args": ["--directory", "/absolute/path/to/ozon-mcp",
                    "run", "ozon-mcp"]
        }
      }
    ]
  }
}
```

### Goose、Zed 或其他 MCP 客户端

任何支持 MCP stdio 的客户端均可使用。通用配置：

```yaml
command: uv
args: ["--directory", "/absolute/path/to/ozon-mcp", "run", "ozon-mcp"]
transport: stdio
env:
  OZON_CLIENT_ID: ...
  OZON_API_KEY: ...
```

官方 MCP 客户端列表：<https://modelcontextprotocol.io/clients>。

## 使用示例

以下示例使用了：

- 可匿名的标识符：`99000001`、`TEST-SKU-001`。
- 与真实响应一致的数据结构。
- 上游测试夹具中的真实形态；本发布技能未包含测试目录。

### 示例 1：获取全部商品

> **用户：** 使用 `ozon_fetch_all`，以
> `operation_id="ProductAPI_GetProductList"` 获取我的全部商品。

Agent 调用：

```json
{
  "operation_id": "ProductAPI_GetProductList",
  "params": {"filter": {"visibility": "ALL"}},
  "max_items": 10000
}
```

服务器会自动沿 `last_id` 游标翻页并返回：

```json
{
  "ok": true,
  "items": [
    {"product_id": 99000001, "offer_id": "TEST-SKU-001", "archived": false},
    {"product_id": 99000002, "offer_id": "TEST-SKU-002", "archived": false},
    {"product_id": 99000003, "offer_id": "TEST-SKU-003", "archived": true}
  ],
  "total_fetched": 3,
  "truncated": false,
  "pages_fetched": 1
}
```

### 示例 2：发现缺货风险商品

> **用户：** 为我的店铺运行 `oos_risk_analysis` 工作流。

Agent 先查看工作流：

```json
ozon_get_workflow({"name": "oos_risk_analysis"})
```

工作流会提示调用 `AnalyticsAPI_StocksTurnover`，该端点限流为每分钟 1 次，服务器会自动排队；同时说明如何解释 `turnover_grade`。调用返回：

```json
{
  "items": [
    {"sku": 99000001, "current_stock": 12, "ads": 1.5,
     "idc": 8.0, "turnover_grade": "DEFICIT",
     "turnover_grade_cluster": "DEFICIT_GROWING"},
    {"sku": 99000002, "current_stock": 25, "ads": 0.8,
     "idc": 31.25, "turnover_grade": "OPTIMAL",
     "turnover_grade_cluster": "OPTIMAL_FALLING"},
    {"sku": 99000003, "current_stock": 0, "ads": 0.0,
     "idc": 0.0, "turnover_grade": "NO_SALES",
     "turnover_grade_cluster": "NO_SALES"}
  ]
}
```

工作流的 `interpret` 字段要求标记 `idc < 14` 或
`turnover_grade ∈ {DEFICIT, NO_SALES}` 的 SKU，并按 `idc` 升序展示。

### 示例 3：完整店铺健康检查

> **用户：** 使用 `cabinet_health_check` 检查我的 Ozon 店铺健康状态。

工作流要求并行读取 `RatingAPI_RatingSummaryV1`、`SellerAPI_SellerInfo`
和 `AverageDeliveryTimeSummary`。第一次调用返回：

```json
{
  "groups": [
    {
      "group_name": "Выполнение заказов",
      "items": [
        {"rating": "rating_on_time", "name": "Процент заказов вовремя",
         "current_value": 97.5, "status": "OK", "value_type": "PERCENT"},
        {"rating": "rating_review_avg_score", "name": "Средняя оценка",
         "current_value": 4.7, "status": "OK", "value_type": "RATING"}
      ]
    },
    {
      "group_name": "Качество сервиса",
      "items": [
        {"rating": "rating_price_index", "name": "Индекс цен",
         "current_value": 1.01, "status": "OK", "value_type": "INDEX"}
      ]
    }
  ],
  "premium_scores": [
    {"rating": "rating_on_time", "value": 97.5,
     "penalty_score_per_day": 0, "scope": "premium_plus"}
  ]
}
```

### 示例 4：分析商品定价

> **用户：** 哪些商品的价格指数是红色？

Agent 运行 `pricing_analysis` 工作流，并检查每个商品的
`price_indexes.color_index` 字段：

```json
{
  "product_id": 99000001, "offer_id": "TEST-SKU-001",
  "price": {"price": "399.0000", "marketing_seller_price": "399.0000",
             "min_price": "299.0000"},
  "price_indexes": {
    "color_index": "WITHOUT_INDEX",
    "ozon_index_data": {"minimal_price": "395.0000",
                          "price_index_value": 1.01}
  },
  "commissions": {"sales_percent_fbo": 0.13, "sales_percent_fbs": 0.13}
}
```

工作流的 `common_mistakes` 列表提醒 Agent 比较实际买家看到的
`marketing_seller_price`，而不是只看基础 `price`。

### 示例 5：内容质量审计

> **用户：** 找出内容评分低的商品，并告诉我需要补什么。

Agent 运行 `content_audit`，获取每个 SKU 的评分以及可提升评分的属性：

```json
{
  "products": [
    {
      "sku": 99000001, "rating": 85,
      "groups": [
        {"key": "media", "rating": 100},
        {"key": "characteristics", "rating": 75,
         "improve_attributes": [
           {"id": 4191, "name": "Цвет"},
           {"id": 8292, "name": "Материал"}
         ],
         "improve_at_least": 4}
      ]
    }
  ]
}
```

工作流说明 `rating` 提升 10 点通常可以提高搜索排名，因此补齐这两个属性约能贡献 4 点。

## 可用工具（15 个）

| 工具 | 作用 |
|---|---|
| `ozon_call_method` | 在安全与订阅校验下执行任意 Ozon API 方法 |
| `ozon_fetch_all` | 自动翻页，获取全部结果而不只是第一页 |
| `ozon_describe_method` | 查看方法的 Schema、示例、限流和特殊行为 |
| `ozon_search_methods` | 对 466 个方法进行俄语或英语 BM25 检索，支持词干化 |
| `ozon_list_sections` | 按分区浏览 API |
| `ozon_get_section` | 查看一个分区内的所有方法 |
| `ozon_list_workflows` | 列出预置分析工作流，可按类别过滤 |
| `ozon_get_workflow` | 获取一个工作流的完整步骤 |
| `ozon_get_related_methods` | 获取自动提取的关联方法 |
| `ozon_get_examples` | 获取方法的精选请求/响应示例 |
| `ozon_get_rate_limits` | 查看方法级、分区级或全部限流信息 |
| `ozon_get_subscription_status` | 读取当前店铺订阅等级 |
| `ozon_list_methods_for_subscription` | 查看特定订阅等级可解锁的方法 |
| `ozon_get_swagger_meta` | 检查内置 API Schema 是否仍新鲜 |
| `ozon_get_error_catalog` | 查询 Ozon 错误码 |

## 预置工作流（13 个）

工作流是人工整理的逐步执行配方。调用 `ozon_get_workflow("name")` 可以获取完整计划，包括 `interpret`、`when_to_use`、`common_mistakes` 以及同步型工作流推荐的数据表结构。

| 工作流 | 类别 | 解决的问题 |
|---|---|---|
| `oos_risk_analysis` | analytics | 找出即将缺货的商品 |
| `cabinet_health_check` | health | 一次性检查全部卖家评分指标 |
| `content_audit` | content | 找出内容评分低的商品及可操作属性 |
| `pricing_analysis` | pricing | 找出定价缺乏竞争力的商品 |
| `warehouse_stock_distribution` | warehouse | 查看 FBO 各仓库库存分布 |
| `sync_products_catalog` | catalog | 生成完整商品目录快照 |
| `sync_orders_fbo` | orders | 增量同步 FBO 订单 |
| `sync_orders_fbs` | orders | 增量同步 FBS / rFBS 订单 |
| `sync_finance_transactions` | finance | 获取用于单位经济分析的财务流水 |
| `sync_analytics_daily` | analytics | 同步每日收入和订单时间序列 |
| `sync_advertising_campaigns` | advertising | 同步 Performance API 广告活动 |
| `sync_warehouse_stocks` | warehouse | 同步 FBS 仓库库存 |
| `sync_returns_rfbs` | returns | 同步 rFBS 退货 |

## API 覆盖

| API | 方法数 | 分区数 |
|---|---:|---:|
| Ozon Seller API | 420 | 49 |
| Ozon Performance API | 46 | 6 |
| **合计** | **466** | **55** |

订阅等级由低到高：
`LITE → STANDARD → PREMIUM → PREMIUM_PLUS → PREMIUM_PRO`。

## 关键功能

### 订阅感知

服务器知道哪些方法需要 Premium 等级，并会在请求离开本机前拒绝不满足条件的调用，从而节省 API 配额：

```json
{
  "error": "subscription_gate",
  "error_type": "subscription_gate",
  "code": 7,
  "message": "Endpoint requires PREMIUM_PRO, cabinet has PREMIUM_PLUS",
  "operation_id": "ProductPricesDetails",
  "required_tier": "PREMIUM_PRO",
  "cabinet_tier": "PREMIUM_PLUS",
  "retryable": false,
  "http_call_skipped": true
}
```

### 限流管理

- 遇到 429 时使用指数退避自动重试。
- 遵守 `Retry-After`，既支持秒数也支持 RFC 7231 HTTP 日期。
- 为慢端点提供独立信号量。例如
  `/v1/analytics/turnover/stocks` 在 Ozon 侧硬限制为每分钟 1 次，
  服务器会自动排队并发调用。

### 自动分页

`ozon_fetch_all` 支持 Ozon 使用的四种分页方式：
`offset/limit`、`cursor`、`last_id`、`page_number`。它也能检测服务器连续两次返回相同游标的少见情况，避免无限循环。

```python
ozon_fetch_all(
  operation_id="ProductAPI_GetProductList",
  params={"filter": {"visibility": "ALL"}},
  max_items=10_000,
)
# → {"items": [...全部商品...], "total_fetched": 847,
#    "truncated": false, "pages_fetched": 1}
```

### 统一错误结构

所有可能失败的工具都返回相同结构，便于 Agent 或下游代码分支处理：

```json
{
  "error": "rate_limit_exceeded",
  "error_type": "rate_limit | subscription_gate | not_found | invalid_params | server_error | timeout | auth | forbidden | conflict | ...",
  "message": "Human-readable explanation",
  "code": 429,
  "operation_id": "AnalyticsAPI_StocksTurnover",
  "endpoint": "/v1/analytics/turnover/stocks",
  "retryable": true,
  "retry_after_seconds": 60
}
```

### 写入目录内置安全分类

每个方法都带有 `safety` 字段：
`read`、`write` 或 `destructive`。

写入需要 `confirm_write=True`；破坏性操作同时需要
`confirm_write=True` 和 `i_understand_this_modifies_data=True`。
Schema 提取器的启发式判断之外，还在 `quirks.yaml` 中维护了 43 条
`safety_warning`，确保 Agent 在变更前看到清晰提醒。

## 保持 API Schema 最新

Ozon 会周期性更新 Swagger。上游的同步流程为：

```bash
cd parser/
python parse_swagger.py
cp seller_swagger.json ../src/ozon_mcp/data/
cp perf_swagger.json   ../src/ozon_mcp/data/
cp swagger_meta.json   ../src/ozon_mcp/data/
```

调用 `ozon_get_swagger_meta` 检查内置快照。上游 CI 会在快照超过 14 天时失败。

本集成版保留固定提交时的 Schema 快照，不包含上游 parser 仓库。更新时请从 Ozon 官方
Swagger JSON 重新生成，并同步登记本技能的更新时间。

## 开发

以下命令对应上游开发仓库。本发布技能按仓库规则未包含测试与贡献指南，可查看固定提交：

[测试目录](https://github.com/PCDCK/ozon-mcp/tree/7e1bea2dd7510064311f1d357d014bb012a18847/tests/)
和 [CONTRIBUTING.md](https://github.com/PCDCK/ozon-mcp/blob/7e1bea2dd7510064311f1d357d014bb012a18847/CONTRIBUTING.md)。

```bash
git clone https://github.com/PCDCK/ozon-mcp.git
cd ozon-mcp
uv sync --extra dev

# 测试（上游记录约 25 秒）
uv run pytest tests/ --ignore=tests/live

# 代码质量
uv run ruff check src tests
uv run mypy src/ozon_mcp

# 覆盖率
uv run pytest tests/ --ignore=tests/live --cov=src/ozon_mcp \
    --cov-report=term-missing
```

## 安全

不要把真实 `Client-Id`、`Api-Key` 或 Performance API Secret 写入 README、日志、提交或聊天。
凭据只通过本机环境变量或 MCP 客户端配置传入。详细威胁模型见 [SECURITY.md](SECURITY.md)。

## 许可证

[MIT](LICENSE)
