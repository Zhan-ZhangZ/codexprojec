---
name: buywhere-mcp
description: 东南亚本土电商生态 (Shopee/Lazada) 跨平台竞品与定价侦察兵 (MCP)。自动化爬取并横向对比同款 SKU 在全网的阶梯定价、实时库存及买家负面评价，精准辅助爆款选品及卡位定价策略。Leading Words: 东南亚跨境电商选品, Shopee/Lazada竞品监控, SKU全网比价侦察, 爆款卡位定价策略
version: 0.4.0
---

# buywhere-mcp — 商品搜索与全网比价 MCP 服务

- **项目主页**: https://github.com/BuyWhere/buywhere-mcp
- **npm**: [@buywhere/mcp-server](https://www.npmjs.com/package/@buywhere/mcp-server)（v0.4.0，需 Node.js ≥ 18）
- **MCP Registry**: `io.github.BuyWhere/buywhere-mcp`

## 功能说明

面向 AI Agent 的实时商品搜索与跨市场比价 MCP：聚合 367M+ 商品、932K+ 商家，覆盖美国与新加坡市场（UK/EU/东南亚/澳洲扩展中），支持 Shopee、Lazada、Amazon 及本地零售商的同款商品价格横向对比、最优价检索、折扣发现与联盟链接生成。服务端共 **11 个工具（6 个 v1 + 5 个 v2）**，stdio 与 streamable-http 双传输。

## 安装与快速开始

1. **获取 API Key**（Agent 可自助注册，无需邮箱）：

```bash
curl -X POST https://api.buywhere.ai/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"agent_name":"your-agent"}'
# → {"api_key":"bw_...","tier":"unverified","rate_limit":{"rpm":20,"daily":1000}}
```

2. **挂载 MCP 客户端**（Claude Desktop / Cursor / VS Code / Cline / Windsurf / OpenCode / Codex / Continue.dev 通用写法）：

```json
{
  "mcpServers": {
    "buywhere": {
      "command": "npx",
      "args": ["-y", "@buywhere/mcp-server"],
      "env": { "BUYWHERE_API_KEY": "bw_live_xxxx" }
    }
  }
}
```

3. **远程直连**（免本地进程，streamable-http）：

```text
URL:     https://api.buywhere.ai/mcp
Header:  Authorization: Bearer <BUYWHERE_API_KEY>
```

## 核心工具速览

| 工具 | 必填参数 | 用途 |
|------|---------|------|
| `search_products_v2` | `query`, `deliver_to` | 按终端用户市场搜索可配送商品 |
| `get_product_v2` | `product_id` | 商品详情（含市场内各商家实时上架/价格） |
| `compare_products_v2` | `ids[]`, `deliver_to` | 2–10 个商品同市场并排比价 |
| `find_best_price_v2` | `query`, `deliver_to` | 返回单个最低价可配送 listing |
| `get_deals_v2` | `deliver_to` | ≥20% 降价的在售折扣商品 |
| `search_products` / `get_product` / `compare_prices` / `get_price` / `get_affiliate_link` / `get_catalog` | — | v1 遗留工具，仍然可用 |

> **v2 工具强制 `deliver_to`**：每次搜索/比价/折扣调用必须传 ISO 3166-1 alpha-2 国家码（`SG`、`US`、`MY`…），缺失返回错误 `-32602 INVALID_PARAMETER`。

## 配置

| 环境变量 | 默认 | 说明 |
|----------|------|------|
| `BUYWHERE_API_KEY` | （必填） | API Key；自助注册见上，或 https://buywhere.ai/api-keys |
| `BUYWHERE_API_URL` | `https://api.buywhere.ai/mcp` | 自定义 API 基址 |

## 参考文档

- 完整安装、各框架（Mastra/LangChain/LlamaIndex/CrewAI）接入示例与架构说明：[references/README.md](references/README.md)
- LLM 可读的精简项目摘要与工具清单：[references/llms.txt](references/llms.txt)
- MCP Registry 描述符（传输方式、环境变量、远程端点）：[references/server.json](references/server.json)
- API Key 安全策略：[references/SECURITY.md](references/SECURITY.md)
- 历史版本说明：[references/RELEASE_NOTES.md](references/RELEASE_NOTES.md)
