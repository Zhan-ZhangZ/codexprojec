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
