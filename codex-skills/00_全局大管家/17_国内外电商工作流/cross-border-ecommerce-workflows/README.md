# 跨境与国内电商 AI 工作流

本技能集合面向跨境电商与国内电商团队，把选品、内容、采购、库存、履约、营销、客服、客户运营、数据分析和合规拆成 11 个可直接路由的工作流。集合来源为本地私有资料，不是公开市场技能；集成后随本技能库正常提交和发布，供 Agent 与 MCP 从远端加载。

## 适用平台

- 跨境电商：Amazon、Shopee、Lazada、Temu、TikTok Shop、独立站，以及 Ozon 等区域性平台的相关工作。
- 国内电商：淘宝/天猫、京东、抖音电商、拼多多。

## 子技能

| 子技能 | 适用任务 |
|---|---|
| `ecommerce-research` | 市场调研、选品评分、竞品分析、定价和供应链初筛 |
| `ecommerce-listing` | 标题、卖点、详情页、关键词、A+ 内容与视觉素材 Brief |
| `ecommerce-advertising` | 广告策略、预算分配、素材脚本、投放监控和效果复盘 |
| `ecommerce-procurement` | 供应商开发、评估、采购成本、质检、绩效和账期谈判 |
| `ecommerce-warehouse` | 多仓、ABC 分类、安全库存、补货、预警和滞销处理 |
| `ecommerce-logistics` | 国内快递、跨境头程/尾程、海外仓、成本核算与异常处理 |
| `ecommerce-customer-service` | 售前售后、订单消息、退换货、差评、纠纷和多语言客服 |
| `ecommerce-crm` | RFM、会员体系、私域运营、复购、LTV 和流失召回 |
| `ecommerce-analytics` | 销售、流量、转化、利润、库存分析与周期报表 |
| `ecommerce-bi` | 多平台数据整合、ETL、经营看板、预测和数据治理 |
| `ecommerce-compliance` | 产品认证、税务、知识产权、海关、标签和物流合规 |

## 使用方式

1. 先读取 [SKILL.md](SKILL.md) 的路由表。
2. 打开与任务最接近的子技能 `SKILL.md`，例如 [ecommerce-research](skills/ecommerce-research/SKILL.md)。
3. 按子技能的输入要求准备平台、市场、商品、销量、成本、时效和合规资料。
4. 需要示例、平台差异和业务组合时，继续阅读 [SKILLS使用手册.md](SKILLS使用手册.md)。

## 脚本与依赖

集合内包含库存、采购、物流、CRM、BI 和报表辅助脚本。基础计算脚本以 Python 标准库为主；`skills/ecommerce-analytics/scripts/data_analysis_helpers.py` 需要 `pandas` 与 `numpy`，部分文档示例还会使用 `openpyxl`。根据实际选择的子技能安装依赖。

已验证的命令行报表入口：

```bash
python3 skills/ecommerce-analytics/scripts/auto_report.py orders.csv
python3 skills/ecommerce-analytics/scripts/auto_report.py orders.csv -o report.md
```

输入 CSV 可按脚本中的列名提供 `date, order_id, sku, amount, cost, ad_spend, status`。脚本只做离线估算，不连接店铺，也不替代财务核算。

## 数据与合规边界

- 这是分析、写作、核算和检查工作流，不是 ERP、广告后台或平台 API 的替代品。
- 没有实时数据源时，不生成冒充实时结果的销量、排名、费率或政策结论。
- 合规内容只提供排查框架，不替代律师、认证机构、税务顾问或平台客服的最新意见。
- 任何店铺写入、批量发布、价格变更、退款或其他不可逆操作，都需要用户明确授权并在执行前复核。
