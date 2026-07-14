# china-law · 中国法律实务插件

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Skills](https://img.shields.io/badge/skills-45-orange)](#技能列表)
[![Local Laws](https://img.shields.io/badge/local%20laws-2,190-green)](#本地法律库)

**china-law** 是 [claude-for-legal](https://github.com/chouenchieh/claude-for-legal) 生态中的中国法律实务插件，为 Claude Code / Claude Cowork 提供完整的中国法律 AI 辅助能力。

45 项技能覆盖劳动用工、商业合同、数据合规、知识产权、公司治理、争议解决、行政程序、刑事合规等全领域，可产出法律意见书、起诉状/答辩状/上诉状、律师函、尽调报告、调查报告、案件大事记等可交付法律文书。集成北大法宝 MCP 和 2,190 部本地法律全文，三步检索（本地索引 → 本地全文 → 北大法宝），确保法律引用可核查。

> ⚠️ **本插件产出的所有内容均为供律师审阅的草稿——不构成法律意见，不能替代执业律师的专业判断。**

---

## 快速开始

### 安装

```bash
# 1. 添加市场（如尚未添加）
/plugin marketplace add /path/to/claude-for-legal

# 2. 安装插件
/plugin install china-law@claude-for-legal

# 3. 重启 Claude Code（此步骤不可跳过）

# 4. 运行冷启动面谈（2分钟快速设置）
/china-law:cold-start-interview
```

冷启动面谈将配置你的公司信息、团队规模、执业场景、风险偏好和可用集成，写入实践档案。之后每项技能执行时都会自动读取这些配置。

### 基本用法

```
/china-law:legal-research          # 法律检索
/china-law:contract-review          # 合同审查
/china-law:labor-dispute-triage     # 劳动争议分流
/china-law:labor-contract-review    # 劳动合同审查
/china-law:legal-opinion            # 出具法律意见书
/china-law:demand-letter-draft      # 起草律师函
/china-law:litigation-document-draft # 起草诉讼文书
/china-law:diligence-report         # 出具尽调报告
```

---

## 核心能力

### 法律检索系统

三步检索法，兼顾速度与权威性：

| 步骤 | 方法 | 说明 |
|------|------|------|
| 1 | 本地索引检索 | 在 `laws/law-index.json`（2,190 条元数据）中按标题关键词搜索 |
| 2 | 本地全文读取 | 命中后直接读取 `laws/` 中的 Markdown 全文，无需联网 |
| 3 | 北大法宝 MCP | 交叉验证、获取最新修订版本、检索案例和学术文章 |

引用标注体系：`[PKULaw]`（北大法宝确认）、`[本地法律库]`（本地文件）、`[本地 + PKULaw 交叉验证]`（双重确认）、`[模型知识 — 请核实]`（待验证）。

### 本地法律库

附带 2,190 部中国法律文件的完整文本（来源：[lawtext/laws](https://github.com/lawtext/laws)），按法律渊源层级分组：

| 目录 | 内容 | 数量 |
|------|------|------|
| `laws/宪法/` | 宪法及宪法修正案 | 8 |
| `laws/法律/` | 全国人大及其常委会制定的法律 | 449 |
| `laws/行政法规/` | 国务院制定的行政法规 | 746 |
| `laws/司法解释/` | 最高法、最高检发布的司法解释 | 682 |
| `laws/监察法规/` | 国家监察委员会制定的监察法规 | 3 |
| `laws/修改、废止的决定/` | 修改和废止法律的决定 | 81 |
| `laws/有关法律问题和重大问题的决定/` | 全国人大的相关决定 | 185 |
| `laws/法律解释/` | 全国人大常委会法律解释 | 25 |
| `laws/修正案/` | 法律修正案 | 12 |

每部法律为 Markdown 格式，含 YAML frontmatter（id、title、status、effective_date）。废止法律已排除。

### 实务档案系统

`/china-law:cold-start-interview` 生成 `CLAUDE.md` 实践档案，所有技能执行前自动读取：

- 公司信息与团队架构
- 默认管辖与适用法律框架
- 风险容忍度与合规立场
- 审批链条与决策权限
- 可用集成状态（北大法宝、合同管理系统、电子签章、飞书/Slack 通知）

---

## 技能列表

### 一、程序与实体法（11 项）

| 技能 | 用途 |
|------|------|
| `administrative-litigation-review` | 行政诉讼案件审查——受案范围、起诉期限、被告资格、举证责任 |
| `administrative-penalty-response` | 行政处罚应对——陈述申辩、听证申请、整改方案 |
| `antitrust-review` | 反垄断审查——经营者集中、市场支配地位滥用、垄断协议 |
| `arbitration-guide` | 商事仲裁指引——仲裁协议效力、仲裁员选定、裁决撤销与执行 |
| `civil-enforcement` | 民事强制执行——执行依据、执行异议、参与分配、失信被执行人 |
| `criminal-compliance-risk` | 刑事合规风险评估——单位犯罪、高管刑事责任、合规不起诉 |
| `environmental-compliance` | 环境合规——环评、排污许可、环境侵权责任 |
| `evidence-rules` | 证据规则——举证责任分配、证据三性审查、非法证据排除 |
| `financial-regulation` | 金融监管——金融机构合规、反洗钱、支付结算 |
| `litigation-procedure` | 民事诉讼程序——管辖、诉讼时效、保全、一审/二审/再审 |
| `mediation-guide` | 调解指引——人民调解、法院调解、调解协议司法确认 |

### 二、劳动与雇佣（11 项）

| 技能 | 用途 |
|------|------|
| `cold-start-interview` | 冷启动面谈——配置公司信息、团队规模、执业场景 |
| `contract-review` | 通用合同审查——商业合同的全要素审查 |
| `employment-policy-drafting` | 劳动制度起草——员工手册、考勤制度、薪酬制度、保密制度 |
| `labor-arbitration-guide` | 劳动仲裁指引——仲裁申请、举证、开庭、裁决撤销 |
| `labor-contract-review` | 劳动合同审查——固定期限/无固定期限/以完成一定工作任务为期限 |
| `labor-dispute-triage` | 劳动争议分流——快速评估争议类型、管辖、时效、胜诉概率 |
| `leave-tracker` | 假期追踪——年休假、病假、产假、婚假、工伤假到期预警 |
| `log-leave` | 请假记录——结构化记录请假申请与审批 |
| `social-insurance-qa` | 社保问答——养老、医疗、工伤、失业、生育保险实务问题 |
| `termination-review` | 解雇审查——单方解除、协商解除、经济性裁员的风险评估 |
| `worker-classification` | 劳动者身份分类——劳动关系 vs 劳务关系 vs 灵活用工 |

### 三、公司与商事（14 项）

| 技能 | 用途 |
|------|------|
| `consumer-protection` | 消费者权益保护——格式条款、欺诈、三包责任 |
| `corporate-resolution` | 公司决议——股东会/董事会决议的召集程序、表决方式、效力 |
| `data-cross-border-assessment` | 数据跨境评估——安全评估、标准合同、认证三条路径 |
| `foreign-investment-review` | 外商投资审查——负面清单、安全审查、外资准入 |
| `government-information-disclosure` | 政府信息公开——依申请公开、主动公开、豁免事由 |
| `ip-clearance` | 知识产权清权——商标、专利、著作权在先权利检索 |
| `nda-review` | 保密协议审查——双向/单向 NDA 的风险评级和条款分析 |
| `patent-search` | 专利检索——现有技术检索、专利有效性分析 |
| `pipl-review` | 个人信息保护审查——合法性基础、告知同意、数据主体权利 |
| `real-estate-construction` | 房地产与建设工程——商品房买卖、建设工程施工合同 |
| `tax-law-overview` | 税法概览——企业所得税、增值税、个人所得税、税收优惠 |
| `trademark-search` | 商标检索——近似商标检索、商标分类、显著性判断 |

### 四、可交付成果产出（6 项）

| 技能 | 用途 |
|------|------|
| `case-chronology` | 案件大事记——按时间线整理关键事实与证据 |
| `demand-letter-draft` | 律师函起草——含事实陈述、法律依据、权利主张和期限要求 |
| `diligence-report` | 尽职调查报告——目标公司的全要素尽调 |
| `investigation-report` | 内部调查报告——合规调查的事实认定和处理建议 |
| `legal-opinion` | 法律意见书——正式法律分析和结论 |
| `litigation-document-draft` | 诉讼文书起草——起诉状、答辩状、上诉状、再审申请书等 |

### 五、插件基础设施（5 项）

| 技能 | 用途 |
|------|------|
| `customize` | 自定义配置——修改技能行为、添加自有效检查项 |
| `gap-surfacer` | 监管缺口扫描——对照最新法规检查合规差距 |
| `legal-research` | 法律检索——三步检索法的统一入口 |
| `matter-workspace` | 事务工作区——多客户执业时的事务隔离 |
| `regulatory-feed-watcher` | 法规动态监控——法律法规更新提醒 |

---

## 与原始 claude-for-legal 的区别

| | 原始 claude-for-legal | china-law |
|---|---|---|
| 法律体系 | 美国联邦及各州法律 | 中华人民共和国法律 |
| 管辖 | 美国 | 中国大陆 |
| 技能数 | 12 插件 × 各自技能 | 45 技能（单一插件） |
| 法律检索 | CourtListener / Lexis | 北大法宝 MCP + 2,190 部本地法律 |
| 法律渊源 | 判例法 + 成文法 | 成文法（宪法→法律→行政法规→地方性法规→规章→司法解释） |
| 工作成果保护 | Attorney work product doctrine | 律师保密义务（《律师法》第38条） |
| 程序法 | FRCP / FRE / 各州程序法 | 《民事诉讼法》《行政诉讼法》《刑事诉讼法》 |
| 合同基础 | UCC / Restatement / 各州普通法 | 《民法典》合同编 |
| 劳动法 | FLSA / FMLA / NLRA / 各州法 | 《劳动法》《劳动合同法》《社会保险法》 |
| 数据保护 | GDPR / CCPA / 各州隐私法 | 《个人信息保护法》《数据安全法》《网络安全法》 |
| 语言 | 英文 | 中文 |

---

## 适用场景

| 用户类型 | 典型场景 |
|---------|---------|
| **企业法务** | 合同审查、劳动用工合规、数据合规评估、内部调查、法律意见书 |
| **律所律师** | 诉讼文书起草、法律检索、尽调报告、律师函、案件大事记 |
| **公司治理** | 股东会/董事会决议、外商投资审查、公司变更登记 |
| **知识产权** | 商标/专利检索、知识产权清权、侵权分析 |
| **合规部门** | 行政处罚应对、刑事合规风险、环境合规、金融监管合规 |
| **法学生/法律诊所** | 法律研究、实务训练、案例检索 |

---

## 法律渊源层级

依据《中华人民共和国立法法》第87-92条：

1. 宪法
2. 法律（全国人大及其常委会制定）
3. 行政法规（国务院制定）
4. 地方性法规（省级/设区的市人大及其常委会制定）
5. 部门规章（国务院各部委制定）
6. 司法解释（最高人民法院/最高人民检察院制定）

---

## 核心规则摘要

插件守则适用于所有 45 项技能，要点如下：

- **不得沉默补充** — 未检索到的法条须标注来源，不为"看起来正确"的引用提供更高可信度标签
- **引用标注体系** — `[PKULaw]` / `[本地法律库]` / `[模型知识 — 请核实]` / `[用户提供]`
- **管辖识别** — 默认中国法律框架，涉及境外管辖时明确标注差距
- **审查者说明** — 每份交付物顶部附审查者说明块，集中标注检索来源、阅读范围和法律判断标记
- **严重度四级标准** — 🔴阻断性 / 🟠高 / 🟡中 / 🟢低，跨技能传递时上游严重度为下游底限
- **保密标记** — 非美国法上的 attorney work product doctrine，中国法下的保密依据为《律师法》第38条
- **决策树收尾** — 每次分析以"下一步选项"收尾，列明选项，不替代律师决定

---

## 技术架构

```
china-law/
├── .claude-plugin/plugin.json    # 插件元数据
├── .mcp.json                     # MCP 服务配置（北大法宝）
├── CLAUDE.md                     # 实践档案模板（79KB）
├── README.md                     # 本文件
├── skills/                       # 45 个技能目录
│   ├── legal-research/SKILL.md
│   ├── labor-contract-review/SKILL.md
│   ├── legal-opinion/SKILL.md
│   └── ...（共 45 个）
├── agents/                       # 子代理定义
│   └── leave-tracker.md
├── hooks/hooks.json              # 钩子配置
├── laws/                         # 2,190 部本地法律文件
│   ├── law-index.json            # 法律索引（JSON 数组）
│   ├── 宪法/
│   ├── 法律/
│   ├── 行政法规/
│   ├── 司法解释/
│   └── ...
└── logs/                         # 核实日志
```

---

## 许可

MIT License

## 作者

基于 [claude-for-legal](https://github.com/anthropics/claude-for-legal) 框架构建，针对中华人民共和国法律体系进行适配。
