---
name: brand-building-skills
description: 集合型品牌建设与品牌交付技能库。用于从零建立或重塑品牌，覆盖品牌上下文、定位、受众、竞品、命名、视觉识别、品牌声音、叙事、信息架构、包装、品牌规范、审计、发布与测量，以及 DTC、B2B、个人品牌、品牌合作、UGC、ASO、WhatsApp、邮件、网红与 Meta/Google 广告等增长渠道。
metadata:
  upstream: https://github.com/arnabbagxd/Brand-building-skills
  version: 1.2.0
---

# Brand Building Skills

这是一份集合型品牌建设技能入口，包含 29 个彼此关联的子技能。按当前任务选择一个基础技能和 1 至 3 个直接相关的专项技能，只读取命中的子技能，不要一次加载全部内容。

先阅读项目根目录的 `README.zh-CN.md` 了解完整中文工作流和技能关系图；需要核对上游原文时再阅读 `README.md`。本入口只负责路由，子技能的方法与输出格式以其各自的 `SKILL.md` 为准。

## 最短执行路径

1. 检查项目根或工作目录下是否已有 `.agents/brand-context.md`。有则先读取；没有时先使用 `brand-context` 收集品牌基础信息，或在用户明确要求直接产出时记录缺失假设。
2. 按下表找到 1 至 3 个最相关的子技能，读取对应 `SKILL.md` 后执行。
3. 多步骤项目按“上下文 → 受众/竞品 → 定位/策略 → 命名/识别/表达 → 规范/包装 → 发布/测量”的顺序推进，避免在定位尚未清晰时直接制作执行层文案或视觉 brief。
4. 交付时说明使用了哪些子技能、输入中的事实与推定分别是什么，以及哪些内容仍需用户、设计师、法律或平台数据复核。

## 子技能路由

### 基础上下文

| 子技能 | 适用任务 |
|---|---|
| [brand-context](./skills/brand-context/SKILL.md) | 记录或更新品牌身份、受众、定位、价值观与声音，生成 `.agents/brand-context.md` |

### 策略、定位与品牌组合

| 子技能 | 适用任务 |
|---|---|
| [brand-strategy](./skills/brand-strategy/SKILL.md) | 完整品牌策略问卷与策略报告 |
| [brand-positioning](./skills/brand-positioning/SKILL.md) | 品类定义、竞争格局、定位领地、定位陈述与证明点 |
| [target-audience](./skills/target-audience/SKILL.md) | ICP、画像、心理特征、行为模式与受众语言 |
| [competitor-branding](./skills/competitor-branding/SKILL.md) | 竞品品牌表达、定位、声音与视觉风格分析 |
| [brand-architecture](./skills/brand-architecture/SKILL.md) | 多品牌、子品牌、产品线之间的关系与命名体系 |
| [brand-naming](./skills/brand-naming/SKILL.md) | 品牌命名、策略化名称生成或现有候选评估 |
| [brand-manifesto](./skills/brand-manifesto/SKILL.md) | 品牌信念宣言、主张与长/短版本表达 |

### 识别、声音与信息表达

| 子技能 | 适用任务 |
|---|---|
| [brand-identity](./skills/brand-identity/SKILL.md) | Logo 方向、色彩、字体、影像风格与视觉识别 brief |
| [brand-voice](./skills/brand-voice/SKILL.md) | 品牌声音、语气维度、词汇与渠道写作规则 |
| [brand-story](./skills/brand-story/SKILL.md) | 品牌起源、创始人叙事与 About Us 文本 |
| [brand-messaging](./skills/brand-messaging/SKILL.md) | Slogan、价值主张、核心信息、证明点与分众信息 |
| [brand-guidelines](./skills/brand-guidelines/SKILL.md) | 品牌规范、Brand Book 与应用规则 |
| [brand-packaging](./skills/brand-packaging/SKILL.md) | 包装结构、视觉层级、材料与开箱体验 brief |

### 审计、转型、发布与测量

| 子技能 | 适用任务 |
|---|---|
| [brand-audit](./skills/brand-audit/SKILL.md) | 六维品牌健康度与一致性审查 |
| [rebranding](./skills/rebranding/SKILL.md) | 品牌刷新或重塑的诊断、资产审计、范围与迁移计划 |
| [brand-launch](./skills/brand-launch/SKILL.md) | 新品牌发布策略、预热、发布日和后续势能计划 |
| [brand-measurement](./skills/brand-measurement/SKILL.md) | 品牌认知、感知、资产与业务指标的测量体系 |

### 个人品牌、B2B 与合作

| 子技能 | 适用任务 |
|---|---|
| [personal-brand](./skills/personal-brand/SKILL.md) | 创始人、高管、创作者或顾问的个人品牌策略 |
| [b2b-brand-marketing](./skills/b2b-brand-marketing/SKILL.md) | 采购委员会信息、思想领导力、LinkedIn 与 ABM 品牌层 |
| [brand-partnerships](./skills/brand-partnerships/SKILL.md) | 联名、合作品牌、伙伴筛选、外联与品牌保护 |

### 增长与渠道

| 子技能 | 适用任务 |
|---|---|
| [d2c-marketing](./skills/d2c-marketing/SKILL.md) | DTC 单位经济、获客、留存、邮件/短信与复购机制 |
| [ugc-strategy](./skills/ugc-strategy/SKILL.md) | 用户内容、评价生成、创作者 brief 与广告复用 |
| [influencer-marketing](./skills/influencer-marketing/SKILL.md) | 网红分层、筛选、外联、合同、履约与合规 |
| [aso](./skills/aso/SKILL.md) | App Store/Google Play 关键词、标题、截图与本地化 |
| [email-marketing](./skills/email-marketing/SKILL.md) | 名单、平台、分层、自动化、送达率与 A/B 测试 |
| [whatsapp-marketing](./skills/whatsapp-marketing/SKILL.md) | WhatsApp Business、广播、自动流与会话式转化 |
| [meta-ads](./skills/meta-ads/SKILL.md) | Facebook/Instagram 广告结构、受众、创意、Pixel 与扩量 |
| [google-ads](./skills/google-ads/SKILL.md) | Search、Shopping、Performance Max、关键词、出价与转化追踪 |

## 执行约束

- 所有子技能都依赖共享品牌上下文；缺少 `.agents/brand-context.md` 时，不要假装已经掌握品牌事实。
- 竞品、广告、商店页面和平台政策可能变化。涉及外部现状时先核验公开资料来源，并把结论限制在已核实证据范围内。
- 子技能产出的是策略、信息架构、brief 或计划，不会自动登录广告平台、发布内容或修改品牌资产。
- 涉及商标、合同、广告合规、隐私或平台条款时，将法律与账号层面的最终确认交给相应专业人员。
