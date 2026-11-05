---
name: cross-border-ecommerce-workflows
description: "面向跨境电商与国内电商全链路的专业工作流集合。覆盖选品调研、Listing、广告、采购、仓储、物流、客服、CRM、经营分析、BI 与合规，按任务路由到 11 个子技能；适用于 Amazon、Shopee、Temu、TikTok Shop、独立站及淘宝、京东、抖音、拼多多。"
metadata:
  source: local-import
  source_access: local-private
  version: "1.1"
---

# 跨境与国内电商 AI 工作流

这是来源为非公开市场本地资料的电商运营技能集合。集成后由本技能库正常发布和路由。先判断用户当前要推进的业务环节，再只读取对应子技能，不需要一次加载全部资料。

## 路由表

| 用户任务 | 子技能入口 |
|---|---|
| 市场调研、选品、竞品分析、定价与供应链初筛 | [ecommerce-research](skills/ecommerce-research/SKILL.md) |
| Listing、标题、五点描述、详情页、关键词与视觉 Brief | [ecommerce-listing](skills/ecommerce-listing/SKILL.md) |
| Amazon PPC、Meta/Google/TikTok/千川/直通车广告与素材 | [ecommerce-advertising](skills/ecommerce-advertising/SKILL.md) |
| 供应商开发、评估、采购成本、质检与账期 | [ecommerce-procurement](skills/ecommerce-procurement/SKILL.md) |
| 仓储、库存预警、补货、ABC 分类与滞销处理 | [ecommerce-warehouse](skills/ecommerce-warehouse/SKILL.md) |
| 国内快递、跨境头程/尾程、海外仓与成本核算 | [ecommerce-logistics](skills/ecommerce-logistics/SKILL.md) |
| 售前售后、退换货、差评、纠纷与多语言客服 | [ecommerce-customer-service](skills/ecommerce-customer-service/SKILL.md) |
| RFM、会员体系、私域、复购、LTV 与流失召回 | [ecommerce-crm](skills/ecommerce-crm/SKILL.md) |
| 销售、流量、转化、利润、库存分析与日报周报 | [ecommerce-analytics](skills/ecommerce-analytics/SKILL.md) |
| 多平台数据整合、ETL、经营看板与销量预测 | [ecommerce-bi](skills/ecommerce-bi/SKILL.md) |
| 认证、税务、知识产权、海关与产品合规 | [ecommerce-compliance](skills/ecommerce-compliance/SKILL.md) |

## 执行步骤

1. 从目标平台、业务环节、期望产物和已有数据识别最窄的子技能。
2. 读取该子技能的 `SKILL.md`。只有执行到相应步骤时，再打开它的 `references/` 或 `scripts/`。
3. 缺少会改变结论的关键数据时，先列出缺口；可以继续时把假设、数据口径和日期写进交付物，不编造平台实时数据。
4. 按子技能规定的输出结构交付。涉及金额、税率、认证、平台规则或最新政策时，标明基准日期，并要求用平台或主管机构的最新官方资料复核。
5. 跨环节任务按“调研 → Listing/采购 → 仓储/物流 → 广告/客服 → 分析/BI”的顺序组合；合规检查贯穿全流程。

## 组合关系

- 需要更广的 Amazon、Shopify、TikTok Shop、Etsy、eBay、Walmart 专项内容时，继续按清单加载 `eCommerce-Skills`。
- 俄罗斯市场可组合 `ozon-university`、`ru-listing-writer` 与 `ozon-seller-api-mcp`。
- 主图、详情页、场景图等视觉素材可组合 `ecom-details-image`。

## 失败处理

- 输入不足：指出缺少的平台、市场、SKU、销量、成本、时效或合规信息，不用通用经验补齐关键事实。
- 脚本依赖缺失：先报告缺少的 Python 包或输入文件；不要修改子技能代码绕过错误。
- 平台规则冲突：以目标站点最新官方规则为准，并披露冲突和核验日期。

完整的功能说明、示例和全链路组合方式见 [README.md](README.md) 与 [SKILLS使用手册.md](SKILLS使用手册.md)。
