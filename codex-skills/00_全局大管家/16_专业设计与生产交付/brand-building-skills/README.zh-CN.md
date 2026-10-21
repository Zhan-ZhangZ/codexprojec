# 面向 AI Agent 的品牌建设技能

[English README](README.md) | 简体中文

这是一组面向 AI Agent 的品牌建设技能，适合品牌策略师、代理机构负责人和创业者使用，让 AI 编码代理协助完成品牌策略、命名、视觉识别、品牌声音、定位、信息架构与发布。技能可与 Claude Code、Cursor、Windsurf，以及任何支持 [Agent Skills 规范](https://agentskills.io) 的 Agent 配合使用。

> 本文档根据上游 `v1.2.0`（`4a0a8b5`）的英文 README 翻译，并结合本地集成方式做了必要调整。对照英文原文请阅读 [README.md](README.md)。

## 安装

```bash
npx skills add arnabbagxd/brand-building-skills
```

欢迎向上游贡献技能或改进现有技能，详见[上游贡献指南](https://github.com/arnabbagxd/Brand-building-skills/blob/main/CONTRIBUTING.md)。

## 什么是技能？

技能是由 Markdown 编写的指令文件，为 AI Agent 提供特定任务所需的专业知识和执行流程。将它们加入项目后，Agent 可以识别当前正在进行的品牌任务，并采用合适的框架与最佳实践。

## 技能如何协同工作

这些技能会互相引用，并建立在同一份共享上下文之上。`brand-context` 是整个技能库的基础：其他技能都会先检查这份上下文，以理解品牌、受众和定位，再开始执行任务。

| 能力层 | 主要子技能 |
|---|---|
| 策略 | `brand-strategy`、`brand-naming`、`brand-architecture` |
| 视觉识别 | `brand-identity`、`brand-story`、`brand-packaging` |
| 品牌声音与信息 | `brand-voice`、`brand-messaging` |
| 受众与定位 | `target-audience`、`brand-positioning`、`competitor-branding` |
| 发布与转型 | `brand-launch`、`rebranding` |
| 审计与规范 | `brand-audit`、`brand-guidelines`、`brand-measurement` |
| 个人品牌与主张 | `personal-brand`、`brand-manifesto`、`brand-partnerships` |
| 营销渠道 | `d2c-marketing`、`b2b-brand-marketing`、`ugc-strategy`、`aso`、`whatsapp-marketing`、`email-marketing`、`influencer-marketing`、`meta-ads`、`google-ads` |

技能之间的主要关系如下：

- `brand-strategy` ↔ `brand-positioning` ↔ `brand-messaging`
- `brand-identity` ↔ `brand-voice` ↔ `brand-guidelines`
- `brand-audit` → `rebranding` → `brand-launch`
- `target-audience` → `brand-messaging`、`brand-voice`、`brand-positioning`
- `competitor-branding` → `brand-positioning`、`brand-strategy`
- `personal-brand` ↔ `b2b-brand-marketing` ↔ `brand-manifesto`
- `brand-architecture` ↔ `brand-naming` ↔ `brand-strategy`
- `brand-measurement` ↔ `brand-audit` ↔ `brand-strategy`
- `d2c-marketing` ↔ `meta-ads` ↔ `google-ads` ↔ `email-marketing`
- `ugc-strategy` ↔ `influencer-marketing` ↔ `d2c-marketing`
- `whatsapp-marketing` ↔ `email-marketing` ↔ `d2c-marketing`
- `brand-partnerships` ↔ `b2b-brand-marketing` ↔ `brand-strategy`
- `aso` ↔ `d2c-marketing` ↔ `brand-messaging`

## 可用技能

| 技能 | 说明 |
|---|---|
| [brand-context](skills/brand-context/) | 基础技能。采集并保存品牌身份、受众、定位、价值观和品牌声音等核心品牌 DNA，供其他所有技能优先读取。 |
| [brand-strategy](skills/brand-strategy/) | 面向代理机构和品牌顾问的完整品牌策略工作流。通过问卷采集客户信息，再生成完整的品牌策略报告。 |
| [brand-naming](skills/brand-naming/) | 完整的品牌命名工作流。可基于策略生成品牌名称及命名理由，也可评估已有候选名称，并自动判断使用哪种模式。 |
| [brand-identity](skills/brand-identity/) | 创建视觉识别 brief，包括 Logo 方向、色彩体系、字体、影像风格和设计原则，供设计师或设计机构执行。 |
| [brand-voice](skills/brand-voice/) | 定义品牌的语言身份，包括语气、声音特质、词汇、写作规则和各渠道适配方式。 |
| [brand-story](skills/brand-story/) | 创作品牌起源故事和创始人叙事，提供三个版本：长版（About Us）、短版（首页）和一句话版本。 |
| [brand-positioning](skills/brand-positioning/) | 定义品牌的市场位置，包括竞争格局梳理、定位领地、定位陈述和证明点。 |
| [brand-messaging](skills/brand-messaging/) | 搭建完整的信息体系，包括标语、价值主张、核心信息、证明点和面向不同受众的表达。 |
| [brand-audit](skills/brand-audit/) | 从定位清晰度、视觉识别、信息一致性、品牌声音、受众匹配度和差异化六个维度评估品牌健康度。 |
| [brand-guidelines](skills/brand-guidelines/) | 创建完整的品牌规范文档，覆盖 Logo 使用、色彩、字体、品牌声音、信息体系和应用规则。 |
| [target-audience](skills/target-audience/) | 通过深入画像、心理特征、行为模式和受众语言分析，定义品牌的 ICP。 |
| [competitor-branding](skills/competitor-branding/) | 梳理竞品的品牌表达方式，发现品牌格局中的空白、规律和差异化机会。 |
| [brand-launch](skills/brand-launch/) | 规划品牌的公开发布，包括发布策略、预热资产、发布日流程、内容计划和发布后的持续势能。 |
| [rebranding](skills/rebranding/) | 指导品牌进行战略性转型，包括诊断、品牌资产审计、范围定义、过渡叙事和落地计划。 |
| [personal-brand](skills/personal-brand/) | 为创始人、高管、创作者或顾问建立个人品牌策略，包括定位、观点、平台策略、内容支柱和 90 天发布计划。 |
| [brand-manifesto](skills/brand-manifesto/) | 撰写有立场、由信念驱动的品牌宣言，明确品牌支持什么、反对什么，以及希望改变什么。 |
| [brand-architecture](skills/brand-architecture/) | 定义多个品牌、子品牌和产品线之间的关系，可采用统一母品牌（branded house）、多品牌组合（house of brands）、背书品牌（endorsed）或混合结构，并配套命名体系。 |
| [brand-measurement](skills/brand-measurement/) | 定义 KPI、指标和跟踪系统，持续衡量品牌健康度、认知度、感知、品牌资产和长期价值。 |
| [brand-packaging](skills/brand-packaging/) | 创建包装设计 brief，包括包装结构、视觉方向、信息层级、材料选择和开箱体验。 |
| [d2c-marketing](skills/d2c-marketing/) | 完整的 DTC 营销系统，包括单位经济模型、获客渠道、邮件/短信流程、留存机制、社会证明和发布检查清单。 |
| [b2b-brand-marketing](skills/b2b-brand-marketing/) | B2B 品牌策略，包括采购委员会信息、思想领导力、LinkedIn 表现、信任信号、ABM 品牌层和内容体系。 |
| [brand-partnerships](skills/brand-partnerships/) | 建立品牌合作关系，包括联名、合作类型、伙伴筛选、外联模板、协议和品牌保护。 |
| [ugc-strategy](skills/ugc-strategy/) | 用户生成内容体系，包括自然 UGC 获取、评价活动、UGC 创作者 brief、广告复用和 FTC 合规。 |
| [aso](skills/aso/) | 面向 iOS 和 Android 的应用商店优化，包括关键词策略、标题与副标题优化、截图设计、评分管理、A/B 测试和本地化。 |
| [whatsapp-marketing](skills/whatsapp-marketing/) | WhatsApp 营销策略，包括 Business 设置、广播活动、自动化流程、会话式电商，以及面向印度和新兴市场的平台建议。 |
| [email-marketing](skills/email-marketing/) | 完整的邮件营销渠道，包括名单建设、平台选择、活动类型、用户分层、送达率、A/B 测试和基准指标。 |
| [influencer-marketing](skills/influencer-marketing/) | 网红营销策略，包括层级选择、筛选、外联、brief 模板、合同、履约跟踪、种草计划和 FTC 合规。 |
| [meta-ads](skills/meta-ads/) | Facebook 与 Instagram 广告，包括活动结构、受众定向、创意策略、再营销、预算扩展和 ROAS 优化。 |
| [google-ads](skills/google-ads/) | Google Ads 的 Search、Shopping、Performance Max 和 Display 广告，包括关键词策略、质量得分、出价、广告文案、转化跟踪和优化。 |

## 快速开始

### 在 Claude Code 中安装

在 Claude Code 项目的设置中指向本仓库，或将 `skills` 目录复制到项目中。

### 在支持 Agent Skills 的工具中使用

技能遵循 [Agent Skills 规范](https://agentskills.io)，可安装到 `.agents/skills/`。

### 从 brand-context 开始

运行其他品牌技能前，先使用 `brand-context` 建立品牌基础：

```text
为[品牌名称]设置品牌上下文——它提供[什么价值]，面向[目标受众]
```

这会创建 `.agents/brand-context.md`，其他技能会自动读取其中的信息。

### 示例工作流

**从零创建一个新品牌：**

1. `brand-context`——记录品牌基础信息
2. `target-audience`——定义 ICP
3. `competitor-branding`——梳理竞争格局
4. `brand-positioning`——寻找市场位置
5. `brand-strategy`——生成完整策略报告
6. `brand-naming`——确定品牌名称
7. `brand-identity`——制作视觉识别 brief
8. `brand-voice`——定义语言身份
9. `brand-messaging`——搭建信息体系
10. `brand-guidelines`——沉淀完整规范
11. `brand-launch`——规划品牌发布

**审计一个已有品牌：**

1. `brand-context`——记录品牌现状
2. `brand-audit`——诊断哪些方面有效、哪些需要改进
3. `rebranding`——需要较大调整时规划品牌重塑

**代理机构的客户项目：**

1. `brand-strategy`——展示问卷并生成完整报告
2. `brand-naming`——评估或生成名称候选
3. `brand-identity`——向设计团队下达视觉 brief
4. `brand-guidelines`——形成最终客户交付物

## 贡献

本地技能包保留了完整的子技能和执行文档，但不包含上游的贡献、评测和发布工具链。如需改进技能或新增技能，请直接在[上游仓库](https://github.com/arnabbagxd/Brand-building-skills)提交 PR，并遵循上游的[贡献指南](https://github.com/arnabbagxd/Brand-building-skills/blob/main/CONTRIBUTING.md)、[版本记录](https://github.com/arnabbagxd/Brand-building-skills/blob/main/VERSIONS.md)和[校验脚本](https://github.com/arnabbagxd/Brand-building-skills/blob/main/validate-skills.sh)。

## 许可证

MIT，详见 [LICENSE](LICENSE)。
