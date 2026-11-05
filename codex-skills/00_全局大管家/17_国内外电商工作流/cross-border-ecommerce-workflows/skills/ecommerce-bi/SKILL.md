---
name: ecommerce-bi
description: >
  电商商业智能与数据看板工作流。覆盖多平台数据整合（ETL）、实时看板搭建、
  销售预测、库存优化模型、自动化报表等。适用于国内电商（淘宝/京东/抖音/拼多多）
  与跨境电商（Amazon/Shopee/独立站）全场景。当用户提及"BI"、"数据看板"、
  "报表"、"ETL"、"预测"、"自动化"、"dashboard"、"数据整合"等关键词时触发。
---

# E-commerce Business Intelligence & Data Visualization

商业智能是电商数据驱动决策的基础设施。本技能提供系统化的数据整合、看板搭建与预测分析框架。

## 工作流总览

BI体系包含以下模块：

1. 数据源识别与接入
2. ETL流程设计
3. 核心指标体系
4. 实时看板搭建
5. 销售预测模型
6. 自动化报表
7. 数据治理

## 第一步：数据源识别与接入

### 电商数据源矩阵

| 数据源 | 数据类型 | 接入方式 | 更新频率 |
|--------|---------|---------|---------|
| 淘宝/天猫 | 订单、流量、广告 | 生意参谋API | 实时/日 |
| 京东 | 订单、流量、广告 | 京准通API | 实时/日 |
| 拼多多 | 订单、流量、推广 | 多多情报通 | 日 |
| 抖音电商 | 订单、内容、直播 | 抖店API | 实时/日 |
| Amazon | 订单、广告、库存 | SP-API | 实时/小时 |
| 独立站 | 订单、行为、广告 | 平台API/GA | 实时 |
| ERP系统 | 库存、采购、财务 | 数据库/API | 实时 |
| CRM系统 | 客户、会员、营销 | 数据库/API | 实时 |

### 数据接入方案

```markdown
## 数据接入架构

### 方案A：API直连
- 适用：平台官方API完善
- 优点：数据实时、结构化
- 缺点：开发成本高、接口限制多

### 方案B：ERP中转
- 适用：已部署ERP系统
- 优点：统一数据出口、减少开发
- 缺点：依赖ERP数据质量

### 方案C：RPA采集
- 适用：无API的老系统
- 优点：无需接口开发
- 缺点：稳定性差、维护成本高

### 方案D：第三方数据服务
- 适用：快速启动
- 优点：即开即用、专业维护
- 缺点：费用高、定制化受限
```

## 第二步：ETL流程设计

### 数据标准化映射

| 标准字段 | 淘宝 | 京东 | Amazon | 抖音 |
|---------|------|------|--------|------|
| 订单ID | tid | order_id | AmazonOrderId | order_id |
| 订单金额 | payment | order_amount | OrderTotal | total_amount |
| 下单时间 | created | order_start_time | PurchaseDate | create_time |
| 商品SKU | sku_id | sku | SellerSKU | sku_id |
| 物流状态 | status | order_state | OrderStatus | logistics_status |

### ETL流程模板

```python
# 标准化ETL流程

def extract(platform, date_range):
    """数据抽取"""
    if platform == 'taobao':
        return call_taobao_api(date_range)
    elif platform == 'amazon':
        return call_sp_api(date_range)
    # ...

def transform(raw_data, platform):
    """数据转换"""
    standard = {}
    mapping = get_field_mapping(platform)
    for std_field, src_field in mapping.items():
        standard[std_field] = raw_data.get(src_field)
    # 数据清洗
    standard['order_amount'] = float(standard['order_amount'])
    standard['order_date'] = parse_datetime(standard['order_date'])
    return standard

def load(transformed_data, target='data_warehouse'):
    """数据加载"""
    if target == 'data_warehouse':
        insert_to_warehouse(transformed_data)
    elif target == 'bi_tool':
        push_to_bi_api(transformed_data)
```

## 第三步：核心指标体系

### 电商指标金字塔

```markdown
## 核心指标体系

### 第一层：业绩指标（结果）
- GMV = UV × 转化率 × 客单价
- 订单量
- 实收金额
- 退款率

### 第二层：流量指标（入口）
- 曝光量、点击量、UV/PV
- CTR = 点击/曝光
- CPC = 花费/点击
- 流量来源占比

### 第三层：转化指标（效率）
- 加购率、收藏率
- 支付转化率
- 客单价(AOV)
- 连带率

### 第四层：盈利指标（质量）
- 毛利率、净利率
- ROAS、ACOS
- CPA、LTV

### 第五层：运营效率（健康）
- 库存周转天数
- 缺货率、滞销率
- 退货率、差评率
- 客服响应时效
```

## 第四步：实时看板搭建

### 看板设计原则

| 原则 | 说明 | 示例 |
|------|------|------|
| 3秒原则 | 关键信息3秒内获取 | 核心KPI大数字展示 |
| 分层展示 | 总览→明细→明细 | 公司级→部门级→个人级 |
| 异常突出 | 超标/不达标醒目提示 | 红色预警、趋势箭头 |
| 可操作 | 从数据到行动的闭环 | 点击下钻→定位问题→触发工单 |

### 标准看板模板

```markdown
## 电商运营驾驶舱

### 顶部：核心KPI
| 指标 | 今日 | 昨日 | 环比 | 目标 | 状态 |
|------|------|------|------|------|------|
| GMV | ¥__ | ¥__ | __% | ¥__ | 🟢/🟡/🔴 |
| 订单量 | __ | __ | __% | __ | 🟢/🟡/🔴 |
| 客单价 | ¥__ | ¥__ | __% | ¥__ | 🟢/🟡/🔴 |
| 转化率 | __% | __% | __% | __% | 🟢/🟡/🔴 |

### 中部：趋势分析
- 销售额7日趋势图
- 流量来源占比饼图
- 转化漏斗图

### 底部：异常预警
| 预警类型 | 涉及SKU/渠道 | 影响 | 建议动作 |
|---------|-------------|------|---------|
| 缺货预警 | SKU001 | 日销损失¥__ | 立即补货 |
| 转化异常 | 抖音直播 | CTR下降__% | 检查素材 |
| 差评激增 | 商品A | 评分降至__ | 排查质量 |
```

## 第五步：销售预测模型

### 预测方法选择

| 方法 | 适用场景 | 精度 | 复杂度 |
|------|---------|------|--------|
| 移动平均 | 稳定品类 | 中 | 低 |
| 指数平滑 | 有趋势的品类 | 中高 | 中 |
| ARIMA | 季节性明显的品类 | 高 | 高 |
| 机器学习 | 数据量大、特征多 | 很高 | 很高 |

### 预测模型模板

```python
# 简单指数平滑预测

def exponential_smoothing(data, alpha=0.3, forecast_periods=7):
    """
    指数平滑预测
    
    Parameters:
        data: list, 历史销售数据
        alpha: float, 平滑系数(0-1)
        forecast_periods: int, 预测天数
    
    Returns:
        list, 预测值
    """
    # 初始化
    smoothed = [data[0]]
    
    # 平滑计算
    for i in range(1, len(data)):
        smoothed.append(alpha * data[i] + (1 - alpha) * smoothed[i-1])
    
    # 预测
    forecast = [smoothed[-1]] * forecast_periods
    
    return forecast
```

## 第六步：自动化报表

### 报表体系设计

| 报表类型 | 频率 | 受众 | 核心内容 |
|---------|------|------|---------|
| 运营日报 | 每日 | 运营团队 | 销售、流量、转化、异常 |
| 运营周报 | 每周 | 管理层 | 周趋势、问题分析、下周计划 |
| 财务月报 | 每月 | 财务/老板 | 利润、成本、ROI |
| 库存周报 | 每周 | 供应链 | 周转、滞销、补货建议 |
| 竞品月报 | 每月 | 产品/运营 | 竞品动态、市场机会 |

### 自动化推送配置

```markdown
## 自动化推送规则

### 日报推送
- 时间：每日9:00
- 渠道：企业微信/钉钉/飞书
- 内容：昨日核心数据+今日关注

### 异常预警
- 触发条件：
  - 销售额环比下降>20%
  - 转化率低于目标50%
  - 缺货SKU>5个
- 推送：即时通知运营负责人

### 周报复盘
- 时间：每周一10:00
- 内容：上周数据汇总+问题分析+本周计划
- 形式：PPT/在线文档
```

## 第七步：数据治理

### 数据质量检查

| 检查项 | 标准 | 处理方案 |
|--------|------|---------|
| 完整性 | 关键字段非空率>99% | 补录或标记缺失 |
| 准确性 | 金额字段无负数异常 | 核查源系统 |
| 一致性 | 跨系统同一指标差异<1% | 统一计算口径 |
| 及时性 | 数据延迟<2小时 | 优化ETL调度 |
| 唯一性 | 主键无重复 | 去重或合并 |

## 参考文件
- `/references/etl_template.py` — ETL流程模板
- `/references/dashboard_design_guide.md` — 看板设计指南
- `/scripts/bi_automation.py` — BI自动化脚本
