---
name: ecommerce-customer-service
description: >
  电商客服工单管理与多语言售后处理工作流。覆盖售前咨询、订单处理、退换货管理、
  差评处理、纠纷仲裁、客户关系维护等全流程。适用于Amazon/Shopee/Temu/独立站
  等跨境平台（英语/德语/日语/法语/西班牙语等多语言）以及淘宝/京东/抖音/拼多多
  等国内平台。当用户提及"客服"、"售后"、"退换货"、"差评处理"、"纠纷"、
  "客户维护"、"工单处理"、"客诉"、"多语言客服"等关键词时触发。
---

# E-commerce Customer Service & After-sales

客服与售后直接影响店铺评分、复购率和品牌口碑。本技能提供覆盖跨境+国内双场景的客服工作流。

## 工作流总览

客服管理包含以下模块：

1. 售前咨询处理
2. 订单状态管理
3. 物流问题处理
4. 退换货管理
5. 差评与纠纷处理
6. 客户关系维护
7. 多语言客服规范（跨境）
8. 客服数据复盘

## 第一步：售前咨询处理

### 响应时效标准

| 平台 | 首次响应要求 | 平均响应目标 | 备注 |
|------|------------|------------|------|
| Amazon | < 24h | < 4h | 影响账户健康分 |
| Shopee | < 24h（工作日） | < 2h | 不同站点有差异 |
| Temu | 按平台要求 | < 4h | 平台管控严格 |
| 淘宝/天猫 | < 3分钟（旺旺） | < 30秒 | 影响店铺动态分 |
| 京东 | < 1分钟（咚咚） | < 30秒 | 自营要求更高 |
| 抖音 | < 3分钟（飞书） | < 1分钟 | 影响体验分 |
| 独立站 | 自定 | < 2h | 建议设自动回复 |

### 售前咨询分类与话术框架

#### 类型1：产品咨询
**回复框架：** 直接回答 + 补充卖点 + 引导下单

**跨境示例（英语）：**
```
Hi! Thanks for your interest. Yes, this model comes in 3 colors:
black, white, and navy. The black one is our bestseller with over
2,000 five-star reviews. It's currently on sale — would you like
me to reserve one for you?
```

**国内示例：**
```
亲，这款目前有星空黑、珍珠白、深海蓝3个颜色可选~
其中黑色是爆款色，销量已经超过2000件啦！
现在下单还有限时优惠，我给您备注优先发货哦~
```

#### 类型2：价格咨询
**跨境示例：**
```
I understand you're looking for the best value! This is already
at our promotional price, which ends this Friday. I can offer
an additional 10% off with code SAVE10 — that brings it to $XX.
Plus free shipping is included!
```

**国内示例：**
```
亲，理解您想买到最划算的价格~ 目前这款已经是活动价了，
比原价便宜了50元。我这边给您一张10元店铺券，
再送个小礼物，到手价只要XX元，您看可以吗？
```

#### 类型3：物流时效咨询
**跨境示例：**
```
Great question! Here's the breakdown:
- Processing: 1-2 business days
- Shipping to [Country]: 7-12 business days via standard shipping
- Express option (3-5 days) available at checkout for $X extra
- Tracking number provided within 24 hours of shipment
```

**国内示例：**
```
亲，发货和时效给您说明一下：
- 16:00前付款，当天发货；之后次日发
- 默认发中通/韵达，预计2-4天到
- 如需顺丰可以补差，预计1-2天
- 发货后您会收到短信通知，可实时查物流~
```

## 第二步：订单状态管理

### 订单全生命周期跟踪

```
待付款 → 已付款 → 待发货 → 已发货 → 运输中 → 派送中 → 已签收 → 完成
   |         |         |         |         |         |         |
 催付      确认      打单      出揽收    异常处理   催签收    邀评
```

### 各节点自动消息模板

**催付提醒（拍下未付30分钟后）：**
```
亲，看到您拍下了[商品名]还没付款呢~
库存不多了，付款后我们第一时间给您打包发货哦！
如有问题随时联系客服~ [淘宝]
```

**发货通知：**
```
Hi [Name], great news! Your order #[XXX] has been shipped via [Carrier].
Tracking: [LINK]. Estimated delivery: [Date].
Thanks for shopping with us! [跨境]
```

**签收关怀（签收后24小时）：**
```
亲，包裹收到了吗？满意的话麻烦给个五星好评呀~
有任何问题随时联系，我们一定给您解决好！
```

## 第三步：物流问题处理

### 物流问题分类处理

| 问题类型 | 判断标准 | 处理方案 | 时效 |
|---------|---------|---------|------|
| 未更新物流 | 48小时无揽收 | 催促仓库/物流商 | 4小时内 |
| 物流停滞 | 72小时无更新 | 查询物流商+安抚买家 | 12小时内 |
| 包裹丢失 | 物流确认丢失 | 补发或退款+补偿 | 24小时内 |
| 包裹破损 | 外包装/内物损坏 | 协商补发/退款/部分退款 | 24小时内 |
| 地址错误 | 发货前发现 | 修改地址 | 立即 |
| 拒收 | 买家拒签 | 退回后处理退款 | 收到退货后48h |

### 物流异常安抚话术

**跨境：**
```
I'm so sorry for the delay with your order. I've contacted the
carrier and they're investigating. While we wait, I want to make
this right — I'm applying a $X credit to your account.
Rest assured, if the package doesn't arrive by [Date], I'll
arrange a replacement or full refund, whichever you prefer.
```

**国内：**
```
亲非常抱歉给您带来不好的体验！我已经联系快递加急处理了，
预计X天内会有更新。这边先给您补偿X元红包，
如果X天后还没收到，我们直接给您补发，您看可以吗？
```

## 第四步：退换货管理

### 退换货政策框架

```markdown
## 退换货政策模板

### 退货条件
- 7天无理由退货（国内法定/跨境自定）
- 质量问题：15-30天内可退
- 非质量问题：买家承担退货运费
- 定制/生鲜/贴身用品：不支持无理由退货

### 换货条件
- 发错货：全额承担运费+补偿
- 质量问题：我方承担运费
- 买家原因换货/尺码：买家承担运费

### 退款时效
- 未发货取消：即时退款
- 退货退款：收到货后48小时内处理
- 仅退款（质量问题）：24小时内处理
```

### 退换货处理流程

```
买家申请 → 客服审核（24h）→ 通过/拒绝 → 买家退货 → 仓库收货质检 → 处理退款/换货
    |           |              |          |          |           |
  自动同意    判断责任方     提供地址   物流跟踪   拍照留档    48h内完成
```

## 第五步：差评与纠纷处理

### 差评处理流程（黄金48小时）

**Step 1：发现差评（0-4小时）**
- 监控工具提醒/每日巡查
- 记录差评内容、评分、订单信息

**Step 2：分析原因（4-8小时）**
- 查看订单详情和聊天记录
- 判断差评类型：产品质量/物流/服务/恶意

**Step 3：联系买家（8-24小时）**
- 真诚道歉，表达解决意愿
- 提出具体解决方案

**Step 4：解决问题（24-48小时）**
- 执行承诺方案
- 礼貌请求修改评价（部分平台允许）

**Step 5：复盘记录**
- 记录问题根因
- 更新FAQ/改进产品或服务

### 差评回复模板

**跨境（Amazon，公开回复）：**
```
Dear [Buyer Name],

We're truly sorry to hear about your experience. Customer satisfaction
is our top priority, and we clearly fell short this time.

We've [specific action taken] and would like to make this right.
Please reach out to us at [email] — we're here to help.

[Brand Name] Team
```

**国内（淘宝）：**
```
亲，非常抱歉没能让您满意！看到您的反馈后我们非常重视，
已经立即[采取了XX措施]。客服小姐姐已经给您发了消息，
希望能有机会为您解决问题。我们会持续改进，期待再次为您服务！
```

### 纠纷/A-to-Z/平台介入处理

| 平台 | 纠纷类型 | 举证要求 | 处理时效 |
|------|---------|---------|---------|
| Amazon | A-to-Z Claim | 物流签收证明、沟通记录 | 7天响应 |
| Amazon | Chargeback | 订单详情、发货证明 | 11天提交 |
| 淘宝 | 小二介入 | 聊天记录、物流信息、质检报告 | 3-5天 |
| Shopee | Return/Refund | 按站点要求提供 | 按站点时效 |

## 第六步：客户关系维护

### 客户分层运营

```markdown
## 客户分层方案

### VIP客户（累计消费>XX 或 复购>3次）
- 专属客服通道
- 新品优先体验
- 生日/节日专属折扣
- 年度回馈礼

### 活跃客户（近90天有购买）
- 定期新品推荐
- 复购优惠券
- 会员积分活动

### 沉睡客户（180天未购买）
- 唤醒优惠券（大额）
- 问卷了解流失原因
- 限时召回活动

### 问题客户（高退货/恶意差评）
- 标记预警
- 发货前额外质检
- 限制购买（极端情况）
```

### 客户回访话术

**跨境（邮件）：**
```
Subject: How's your [Product]? We'd love to hear from you!

Hi [Name],

It's been 2 weeks since you received your [Product].
Hope you're enjoying it!

If you have a moment, we'd really appreciate a quick review.
It helps other customers and means the world to us.

As a thank you, here's a 15% off code for your next order: THANKS15

Best,
[Brand] Team
```

**国内（短信/旺旺）：**
```
亲，您购买的[商品]使用了一段时间了吧？
感觉怎么样呢？满意的话麻烦给个小星星评价呀~
截图给客服可以领5元复购券哦！有问题随时联系~ [店铺名]
```

## 第七步：多语言客服规范（跨境）

### 多语言客服标准

| 语言 | 平台 | 语气风格 | 特殊注意 |
|------|------|---------|---------|
| 英语 | Amazon/独立站 | 专业友好 | 注意时区，标注PST/EST |
| 德语 | Amazon.de | 正式(Sie) | 严谨细致，法规意识强 |
| 日语 | Amazon.jp | 敬语(です/ます) | 极度注重细节和包装 |
| 法语 | Amazon.fr | 礼貌正式 | 欧盟合规敏感 |
| 西班牙语 | Amazon.es/mx | 热情友好 | 拉美与西葡用词差异 |
| 意大利语 | Amazon.it | 友好正式 | 物流时效要求高 |

### 多语言通用话术模板

**英语致歉模板：**
```
We sincerely apologize for [issue]. We take full responsibility
and have already [action taken]. To make this right,
we're [compensation]. Your satisfaction is our priority.
```

**德语致歉模板：**
```
Wir entschuldigen uns aufrichtig fuer [Problem]. Wir uebernehmen
die volle Verantwortung und haben bereits [Massnahme] ergriffen.
Als Entschaedigung bieten wir [Kompensation] an.
```

**日语致歉模板：**
```
大変申し訳ございません。[問題]について、責任を痛感しております。
現在[対応]をさせていただいております。お詫びとして[補償]を
ご用意させていただきました。今後ともよろしくお願いいたします。
```

**西班牙语致歉模板：**
```
Le pedimos disculpas sinceras por [problema]. Asumimos toda la
responsabilidad y ya hemos [accion tomada]. Para compensarle,
le ofrecemos [compensacion]. Su satisfaccion es nuestra prioridad.
```

## 第八步：客服数据复盘

### 客服核心指标

| 指标 | 目标 | 监控频率 |
|------|------|---------|
| 首次响应时间 | < 2分钟(国内) / < 4小时(跨境) | 日报 |
| 平均响应时间 | < 1分钟(国内) / < 2小时(跨境) | 日报 |
| 问题解决率 | > 90% | 周报 |
| 客户满意度(CSAT) | > 4.5/5 | 月报 |
| 差评率 | < 2% | 周报 |
| 退货率 | < 5%(跨境) / < 8%(国内) | 周报 |
| 咨询转化率 | > 30% | 月报 |

### 客服周报模板

```markdown
## 客服周报 — [周次]

### 数据概览
| 指标 | 本周 | 上周 | 环比 |
|------|------|------|------|
| 咨询量 | | | |
| 响应时效 | | | |
| 问题解决率 | | | |
| 客户评分 | | | |
| 差评数 | | | |

### 主要问题分类
| 问题类型 | 数量 | 占比 | 处理方案 |
|---------|------|------|---------|
| 产品质量 | | | |
| 物流问题 | | | |
| 使用咨询 | | | |
| 退换货 | | | |

### 典型案例
- [案例1：问题描述 + 处理过程 + 结果]
- [案例2]

### 改进建议
- [建议1]
- [建议2]
```

## 参考文件
- `/references/multilingual_templates.md` — 多语言完整话术模板
- `/references/platform_cs_rules.md` — 各平台客服规则速查
- `/references/return_policy_templates.md` — 退换货政策模板
