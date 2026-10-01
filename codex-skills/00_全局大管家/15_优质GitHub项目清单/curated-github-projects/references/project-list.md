# 优质 GitHub 项目清单（人工筛选 · 无分类平铺）

> 本清单由人工逐项筛选收录，不按领域分类，按收录顺序平铺。
> 条目只做 Agent 选型引导；下载、配置、使用一律以项目自身文档为准。
> 收录与修订规范见本技能 `SKILL.md` 的「清单编写结构」。

---

### 1. AIHOT · KKKKhazix/AIHOT

- 仓库：<https://github.com/KKKKhazix/AIHOT>
- 一句话定位：一个自己找热点、自己写日报的网站框架，换成你的信源与精选标准就是你的行业热点站。
- 作者/背景：数字生命卡兹克（著名 AI 博主），设计师出身、与 AI 协作开发；aihot.news 为其线上实跑站点，本仓库即该站完整框架的开源快照。
- 收录理由：
  1. 工程闭环完整：采集 → 预筛 → 两次独立评分 → 中文写作 → 跨源聚簇 → 热度排序 → 日报成刊，六步全链路开源，且全部提示词原文与入选门槛公开、可审计、可替换；
  2. 为 Agent 改造而生：仓库自带面向 Agent 的入口约定（仓库根 AGENTS 文档）与行业定制指南（docs 下 customize 分册），官方推荐用法就是把仓库直接交给 Claude Code / Codex 改成目标行业站；
  3. 关注点分离好：行业 KnowHow（站名、信源、精选标准、门槛）集中在 `industry/` 一个目录（提示词、信源清单、门槛与站名配置等），改行业基本不动代码；
  4. 文档质量高：信源配置、精选与校准、部署、架构分册齐全，线上性能数据公开（页面中位 10ms）；
  5. MIT 许可，真实线上业务完整开源，工程可信度高。
- 适用场景：
  1. 为某行业（法律 / HR / 金融 / 贵金属等）搭资讯热点站、舆情监控或自动日报系统；
  2. 需要"多信源采集 + LLM 精选评分 + 聚簇去重 + 事件级热度排序"内容流水线的参考实现；
  3. 研究提示词工程落地（评分、写作、聚簇判断的提示词全公开）与按独立来源数计算热度的算法设计；
  4. 需要 Agent 友好内容分发的参考形态（同一内容以 RSS / API / MCP / llms.txt 同源输出）。
- 不适用/边界：不是通用 CMS 或爬虫框架；强依赖 Docker 与一个 OpenAI 兼容模型 API Key；作者自述非专业开发者，代码规范度一般，发现问题走 Issue；快照式仓库，与线上版本不保证逐次同步；AIHOT 名称与 Logo 不在 MIT 授权内，二开必须换名换标。
- 技术栈与硬性依赖：Node.js 24 · TypeScript · React Router（SSR）· Fastify · PostgreSQL · pg-boss · Tailwind CSS · Docker Compose（环境细节以项目部署文档为准）。
- Agent 介入方式：clone 后先读仓库根的 Agent 入口约定文档与 docs 下的行业定制指南（官方即为此场景设计）；定制集中在 `industry/` 目录——站名文案、信源清单、精选提示词、入选门槛、AI 专属模块开关各对应其中一份文件，打开仓库即可对号入座；精选校准用 scripts 目录下的 eval-selection 校准脚本配合人工标注样本验证选得准不准。
- 许可：MIT（代码）；AIHOT 名称与 Logo 及第三方标志除外，见仓库 NOTICE。
- 收录信息：本仓库维护者人工收录，2026-10-01，依据仓库 README 全文与仓库页面逐项核验。

---

### 2. text-to-cad · earthtojake/text-to-cad

- 仓库：<https://github.com/earthtojake/text-to-cad>
- 一句话定位：面向 Agent 的 CAD/CAE/CAM 技能库——用自然语言或图片生成、检查、采购、切片并交付 CAD 零件与机器人描述文件。
- 作者/背景：earthtojake 主导、21 位贡献者；16.4k Stars / 1.7k Forks，1380 次提交、60 个 release，迭代极活跃（最新 v0.6.6，2026-09-21 发版）。
- 收录理由：
  1. 品质与热度双高且持续维护：16.4k Stars、发版节奏稳定、CI 测试常绿，文档站 www.texttocad.dev 独立成册；
  2. 设计到制造全链闭环：参数化 CAD 建模（build123d 引擎，STEP 主交换格式，可导 STL/3MF/GLB）→ 带尺寸标注的工程图纸 PDF → DfAM/DFM 可制造性检查（壁厚/悬垂/支撑/取向；钣金/CNC/注塑）→ 切片生成打印 G-code → 对接 SendCutSend 激光切割与 Bambu Lab 打印机；
  3. 机器人生态覆盖全：URDF、SRDF（MoveIt 规划组）、SDF 仿真模型等机器人描述文件技能齐备；
  4. 原生为 Agent 设计：Skills CLI 一键安装，Codex/Claude/Grok 官方插件市场分发，自带 AGENTS 约定与安全模型文档（SECURITY 分册）；
  5. MIT 许可，13 个子技能各自独立（入口清单见仓库 README 技能表）。
- 适用场景：
  1. 从自然语言或图片生成工业级参数化 CAD 零件并导出 STEP 主格式；
  2. 机器人建模：生成/编辑 URDF、SRDF、SDF 结构与仿真文件；
  3. 制造准备链任务：可制造性检查、切片出 FDM 打印 G-code、激光切割下单预检、Bambu 打印任务管理；
  4. 本库用户可配合使用：06_商业与专业领域 分类下已有其集成版技能（当前 v0.4.28 快照，上游已至 v0.6.6 并新增工程图纸与 DFM 技能）。
- 不适用/边界：面向机械 CAD 与制造，不是影视级 3D 建模/动画工具；需 Python 3.11+，内核依赖 OpenCascade（OCP）未签名原生模块，Windows 11 默认 Smart App Control 会拦截（需关闭该控制或改用 WSL）；仓库 models 目录为 LFS 测试夹具，使用技能无需拉取。
- 技术栈与硬性依赖：Python 3.11+ · build123d/OCP（OpenCascade 绑定）· 各子技能独立依赖清单锁定配套 cadgen 版本（环境细节以仓库 README 与文档站为准）。
- Agent 介入方式：优先按仓库 README 安装节用 Skills CLI 安装或经插件市场添加（具体命令以仓库为准，此处不代答）；仓库根有 AGENTS 约定与 CONTRIBUTING 指南，13 个子技能各自成目录，运行前先读对应子技能的入口说明；本库用户也可直接经大管家路由到 06 分类的集成版。
- 许可：MIT。
- 收录信息：本仓库维护者人工收录，2026-10-01，依据仓库 README 与页面实时核验（Stars/版本/技能清单），并对照本库 06 分类集成副本确认版本差。

---

### 3. ClaudeAnimationBase · JohnHeibel/ClaudeAnimationBase

- 仓库：<https://github.com/JohnHeibel/ClaudeAnimationBase>
- 一句话定位：用 Claude（或任意 coding agent）拍手绘风二维卡通动画的启动套件——p5.js + p5.brush 笔刷渲染、Clawd 角色、31 种表演情绪、写给模型看的动画法则指南。
- 作者/背景：JohnHeibel（X：@other__reality），用 Claude Opus 5.5 制作出圈手绘风音乐视频《I'm Upping My P(doom)》的创作者（该视频源码另开源于 PDoomVideo 仓库），本套件即其生产代码与经验复盘的提炼。
- 收录理由：
  1. 出身硬核：源自真实出圈作品的完整生产链路，而非玩具示例，作者对「模型做对了什么、做砸了什么」做过逐项分析；
  2. 为 Agent 工作流深度设计：官方用法就是 clone 后交给 Claude Code 说「先读动画指南，再拍一部 15 秒的片子」——模型先出分镜、逐镜头构建、渲染 contact sheet 自检、最终产出 MP4；仓库根的动画指南（ANIMATION_GUIDE）是给模型看的规则+工作流+完整 API（手作感、每景必有事件、笔刷转场、boiling linework 等动画法则与观众节奏）；
  3. 资产即生产力：Clawd 角色带 31 种表演情绪、多视角、眼口/帽子/舞蹈组件与 docs 模型表，支持换角色、造新情绪新服装、喂参考图；
  4. 工程完整：无头渲染器支持 contact sheet/帧条/裁切/静帧/MP4；studio 审片页可在 Chrome 逐帧拖看；Linux 无 GPU（软件渲染旗标）与云端 NVIDIA（GPU 角度旗标）均有明确渲染路线；
  5. 热度与许可：发布约 2 天 255 Stars、社区已开始二创（会话动画、生日祝福片等），MIT 许可。
- 适用场景：
  1. 让 Agent 生成分镜驱动的手绘风短视频（生日祝福、产品 Demo 片、社媒内容）；
  2. 学习「给模型的创作法则」写法——如何用一份指南约束模型产出风格一致的手绘动画；
  3. 需要程序化笔刷渲染管线（p5.brush 水彩填充、笔触媒介、笔刷转场）作参考实现；
  4. p5.js 创意编码项目的角色表情系统与镜头/时间轴架构参考。
- 不适用/边界：限定 2D 手绘卡通风格，不是 3D 动画/影视特效工具，更非 diffusion 文生视频替代品；需 Node.js + Chrome + ffmpeg；无独显时水彩填充渲染慢（约秒级/帧，核显机器建议让模型换用其他填充）；仓库很新（2026-09 末创建、2 位贡献者），API 稳定性待观察；效果以 Claude Opus 5.5 高推理档实测为准，换模型可能打折。
- 技术栈与硬性依赖：JavaScript · p5.js + p5.brush · Node.js · Google Chrome（无头渲染）· ffmpeg（渲染旗标与环境细节以仓库 README 为准）。
- Agent 介入方式：clone 后在 Claude Code（或任意 coding agent）里先读仓库根的动画指南再下需求（官方示例即此句式）；分镜 → 逐镜头 → contact sheet 自检 → 出片的工作流已内建；场景写在 scenes 目录，角色与渲染帮助在 src 下分层清晰；出片前用 studio 审片页人工过一遍。
- 许可：MIT。
- 收录信息：本仓库维护者人工收录，2026-10-01，依据仓库 README 两轮抓取与 Trendshift 元数据（许可/Stars/创建时间）及社区讨论核验。

---

### 4. logo-design-skill · kaankiziltug/logo-design-skill

- 仓库：<https://github.com/kaankiziltug/logo-design-skill>
- 一句话定位：把 Claude/Codex/Gemini 等任意支持 Agent Skills 的模型变成有纪律的品牌标识设计师，从需求简报到生产级 SVG 与品牌规范全流程。
- 作者/背景：kaankiziltug；登上 The Agent Leaderboard「The New 100」第 14 位；18 个端到端虚构品牌案例（咖啡烘焙到电信医疗）全公开可复盘。
- 收录理由：
  1. 方法论完整且符合专业设计流程：发现与简报 → 词汇映射 → 选择标记类型 → 出 8~12 个一句话概念 → 建 3 个 SVG → 测试精炼 → **检查点强制停下**（以总览图展示概念并给出推荐，用户选定方向前不产出其余）→ 色彩/组合/提案板/图标/规范成套交付，另覆盖改版与标识系统；
  2. 零依赖纯 Python 工具链：SVG 审计（生产就绪评分、锚点复杂度、近似角、微小细节、居中检查）、测试表（16 像素缩小、单色、反白、眯眼、镜像、使用场景、竞品货架对比）、行业专属样机提案板、PNG 渲染与 favicon/应用图标/网页图标全家桶导出；
  3. 1400+ 真实商标 SVG 参考库，按标记类型/技法/几何/主题/字体/情绪/行业七维分类，命令行可检索、本地画廊页可浏览——用于研究构造与规避撞款，明令禁止抄袭；
  4. 光学校正等真功夫进流程（过冲、骨骼效应、辐照），CI 测试徽章常绿。
- 适用场景：品牌标识/字标/组合标/吉祥物设计，现有标识的评审与改版，favicon 与应用图标成套导出，一页品牌规范生成；也是研究「检查点式人机协作」技能设计范式的优秀样本。
- 不适用/边界：需能看图的模型才能发挥全部能力（技能自渲染草稿并自检）；PNG 导出依赖本机存在任一渲染器；参考库内商标版权归原权利人，仅供研习、严禁商用抄袭（见仓库商标说明分册）。
- 技术栈与硬性依赖：Python 3.8+ 纯标准库（零第三方依赖）；渲染可走 cairosvg / rsvg / Inkscape / Chromium 系浏览器 / macOS Quick Look 任一（细节以仓库 README 为准）。
- Agent 介入方式：开放 Agent Skills 格式（技能目录 + SKILL 入口），任意支持技能的 agent 拷入即用；Claude Code 可经官方插件市场安装（命令见仓库 README 安装节）；触发词覆盖 logo、字标、组合标、品牌标、应用图标、favicon、改版与评审。
- 许可：MIT（技能文本、脚本、模板与目录数据）；库内 SVG 商标文件为各权利人商标，不在 MIT 授权内。
- 收录信息：本仓库维护者人工收录，2026-10-01，依据仓库 README 全文（流程、工具、案例、许可条款）核验。

---

### 5. superpowers · obra/superpowers

- 仓库：<https://github.com/obra/superpowers>
- 一句话定位：给 coding agent 的一整套软件开发方法论——可组合技能 + 初始引导指令，让 agent 从「抢着写代码」变成按纪律走完全流程。
- 作者/背景：Jesse Vincent 与 Prime Radiant 团队；本库 README「黄金必装推荐」首位常客；已集成于本库 01_代码工程与架构 分类（v6.3.0 中文超集版）。
- 收录理由：
  1. 方法论闭环完整：头脑风暴（苏格拉底式设计澄清）→ git worktree 隔离开发 → 写计划（2~5 分钟粒度任务、精确到文件路径与验证步骤）→ 子代理驱动开发或内联执行 → 真·红绿重构 TDD → 两阶段代码评审（规范符合性 + 代码质量）→ 分支收尾，可连续自主工作数小时不跑偏；
  2. 技能是强制工作流而非建议，任务前自动匹配触发；自带诊断技能，可对会话转录逐行取证复盘「这次哪里不对」；
  3. 跨 17+ 宿主官方分发：Claude Code/Codex/Cursor/Gemini CLI/Copilot CLI/Grok/Kimi/OpenCode/Pi/Qwen/Devin/Factory Droid/Antigravity/Hermes/Muse 等各装各的；
  4. 哲学清晰可迁移：测试先行、系统化优于临场发挥、复杂度削减、证据优于宣称；MIT 许可。
- 适用场景：让 coding agent 长期自律（先设计后动手、先测试后代码）；复杂任务的子代理编排与计划驱动开发；作为「写计划/评审/TDD」流程范本设计自己的工作流技能；本库用户可直接经大管家路由到 01 分类集成版。
- 不适用/边界：会显著改变 agent 行为节奏（多处人工确认检查点），追求「一句话直出代码」的场景不合适；上游一般不接受新技能贡献，改动以 fork 为宜；可视化伴侣功能默认带匿名版本遥测（可用环境变量整体关闭）；本库集成版为中文超集版，版本同步走独立的更新流程处理。
- 技术栈与硬性依赖：技能为纯 Markdown + 少量脚本；按各宿主插件机制安装（细节以仓库 README 安装节为准）。
- Agent 介入方式：各宿主插件市场或从仓库直装；本库用户经大管家路由 01_代码工程与架构 的 superpowers 集成版即可，无需重复安装。
- 许可：MIT。
- 收录信息：本仓库维护者人工收录，2026-10-01，依据上游 README 全文核验，并与本库索引表 01 分类登记交叉确认。

---

### 6. science-skills · google-deepmind/science-skills

- 仓库：<https://github.com/google-deepmind/science-skills>
- 一句话定位：Google DeepMind 官方科研技能集——为科研 agent 提供更扎实的 grounding 与更高的 token 效率，接入 AlphaGenome、AFDB、UniProt 等 30+ 数据库与工具。
- 作者/背景：Google DeepMind（GDM）官方组织出品，附独立技术报告；Google Antigravity 的内置「Science」插件即此集合。
- 收录理由：
  1. 官方背书 + 领域纵深：覆盖基因组学、结构生物学、化学信息学、文献检索等科研任务，每个技能独立成目录（SKILL 入口 + 脚本 + 参考资料），结构规范可直接当模板学；
  2. 许可架构清晰：软件 Apache 2.0、其余材料 CC-BY 4.0，第三方数据源许可单独成册逐项列明，合规意识到位；
  3. 工程细节讲究：uv 依赖管理首次触发自动引导安装；API key 需求逐技能标注（AlphaGenome/OpenAlex 必需，ClinVar 可选仅提速），agent 会主动带用户配置。
- 适用场景：生物/化学/医学等领域的科研 agent 任务；需要权威数据库 grounding 的专业问答；构建科研工作流技能时的结构与许可范式参考。
- 不适用/边界：仓库自声明「非官方 Google 产品」；部分技能必须 API key 才能工作；第三方数据源各有许可条款，使用前需按仓库条款分册自查；非理科任务无关。
- 技术栈与硬性依赖：技能 Markdown + 脚本；uv 管理依赖（环境与安装细节以仓库 README 为准）。
- Agent 介入方式：按仓库 README 用 Skills CLI 安装，或经 Google Antigravity 内置 Science 插件启用；每技能目录自带入口文档与脚本，按需加载。
- 许可：Apache 2.0（软件）+ CC-BY 4.0（其他材料），第三方数据源另行约定。
- 收录信息：本仓库维护者人工收录，2026-10-01，依据仓库 README 与许可条款全文核验。

---

### 7. Vibe-Trading · HKUDS/Vibe-Trading

- 仓库：<https://github.com/HKUDS/Vibe-Trading>
- 一句话定位：个人交易智能体框架——自然语言驱动「数据 → 研究 → 回测 → 证据审计」全链路的量化投研助手。
- 作者/背景：HKUDS（香港大学数据智能实验室，LightRAG / AI-Researcher 同门）；33.8k Stars / 5.5k Forks / 2497 次提交，六语 README，独立文档站 vibetrading.wiki。
- 收录理由：
  1. 热度与工程量顶级：33.8k Stars 的高活跃迭代，产品化结构完整（agent 工具层、前端、Electron 桌面端、MCP 服务、Docker 部署）；
  2. 数据与市场覆盖极广：A股/港股/美股/加密/外汇多源行情（tushare/akshare/yfinance/okx/ccxt/baostock/tencent/mt5 等），另类数据含 FRED 宏观、SEC EDGAR 与 13F 持仓、券商研报、龙虎榜、北向资金、限售解禁、融资融券；
  3. 量化工具链纵深：向量化回测引擎 + 金融数学库（期权定价与 Greeks、VaR/CVaR/EVT 及回检验、事件研究、风格因子模型、Deflated Sharpe/PBO、purged 交叉验证、DCF/可比估值）+ 因子 IC/IR 分层分析 + 多智能体投研编排（投资委员会/量化桌面等预设）；
  4. 可审计的研究协议是亮点：研究目标 + 证据留痕 + 完成审计的闭环设计，结论必须挂可追溯证据，把「AI 研究可信度」做成了产品能力；
  5. 行为侧有真创新：交易日志行为诊断（处置效应/过度交易等）与「影子账户」——从用户真实成交提炼规则再回测归因；
  6. MIT 许可，NOTICE/安全策略/行为准则/Agent 贡献指南齐备。
- 适用场景：自然语言驱动的量化研究与策略回测（A股/美股/加密等）；多市场金融数据与另类数据检索；多智能体投研协作（多空分析师+风险官+组合经理式互搏）；个人交易日志的行为诊断与策略画像；学术因子思路（arXiv/OpenAlex）到落地验证的完整流水线。
- 不适用/边界：定位研究优先，不是自动下单机器人；历史回测不代表未来收益，实盘需自配券商与数据密钥并自担风险；部分数据源需要各自 API key；金融业务注意当地合规要求。
- 技术栈与硬性依赖：Python（锁定依赖）· 前端与 Electron 桌面端 · Docker Compose · MCP 服务（环境细节以仓库 README 与文档站为准）。
- Agent 介入方式：Docker Compose 一键起全套或分层使用；对 Agent 最友好的入口是其 MCP 服务与仓库根的 Agent 贡献指南；文档站有分册导览（安装配置细节交还仓库文档）。
- 许可：MIT（附 NOTICE 第三方声明）。
- 收录信息：本仓库维护者人工收录，2026-10-01，依据仓库页面元数据核验，并经本会话挂载的 vibe-trading MCP 工具面实测交叉确认。
