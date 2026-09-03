---
name: context-engineering-collection
description: 工业级上下文工程 (Context Engineering) 与多智能体架构脚手架集。专攻生产环境 Agent 系统的底层通讯建设。提供针对 Context 管理、循环收敛、评测调试以及复杂 Harness 注入的标准范式与工具链。Leading Words: 上下文工程Context优化, 多智能体架构脚手架, 生产级Agent通讯建设, Harness注入测试范式
---

# Agent Skills for Context Engineering（上下文工程技能集）

本合集提供构建生产级 AI Agent 系统的结构化指导：17 个平台无关的技能，覆盖上下文工程、Harness 工程、多智能体架构与自治研究/评测系统，并附带一套文件式 Researcher 操作系统（确定性门禁 + 持续循环）、平台制品契约（platform artifact contracts）与治理边界（governance boundary）。

## 何时激活（When to Activate）

满足以下任一场景时激活：
- 从零构建新的 Agent 系统
- 优化既有 Agent 的性能与 token 效率
- 排查上下文相关故障（丢失中间信息、上下文污染、注意力分散）
- 设计多智能体架构或长程自治任务的启动提示（launch prompt）
- 为 Agent 创建或评审工具（Tool Design）
- 实现记忆与持久化层
- 设计自治研究循环、评测 Harness 或自改进（self-improvement）系统
- 需要为 Agent 组织的持久记录建立跨运行时的制品契约与权限治理

## 技能地图（Skill Map）

### 基础上下文工程

**上下文基础（context-fundamentals）**
上下文不只是提示词文本，而是推理时刻模型可用的全部状态：系统指令、工具定义、检索文档、消息历史与工具输出。上下文工程的核心是判断哪些信息对当前任务真正重要，并以此最大化信噪比。

**上下文退化（context-degradation）**
随上下文增长，模型呈现可预测的退化模式：中部信息注意力衰减（lost-in-the-middle）、首尾优先的 U 形注意力曲线、错误累积的上下文污染、无关信息淹没相关内容的注意力分散。

### 架构模式

**多智能体协同（multi-agent-patterns）**
生产级多智能体系统收敛为三种主流模式：集中控制的 supervisor/orchestrator、灵活交接的点对点 swarm、面向复杂任务分解的层级结构。关键洞察：子 Agent 的首要存在意义是隔离上下文，而非模拟组织角色。

**长程提示（long-horizon-prompting）**
长时自治 Agent 与并行多智能体编排的成败系于启动提示。伪形式化任务简报（pseudo-formal task brief）要求：带退化案例的定义、精确的成功判据、枚举的不计入成果项、带方法族注册表与受阻路线簿记的编排策略、枚举失败模式的对抗审计、审计门控的返回条件、工作量下限与污染防护。

**记忆系统设计（memory-systems）**
记忆架构从简单草稿板到时序知识图谱。向量 RAG 提供语义检索但丢失关系信息；知识图谱保留结构但工程投入更大；文件系统即记忆（file-system-as-memory）支持按需加载上下文而不撑爆上下文窗口。

**文件系统上下文（filesystem-context）**
文件系统为存储、检索与更新近乎无限的上下文提供单一接口。关键模式：工具输出卸载的草稿板、长程任务的计划持久化、经共享文件的子 Agent 通讯、动态技能加载。Agent 用 `ls`、`glob`、`grep`、`read_file` 做定向上下文发现，结构性查询常优于语义搜索。

**托管 Agent 基础设施（hosted-agents）**
后台编码 Agent 运行于远程沙箱而非本地机器。关键模式：按周期刷新的预构建环境镜像、即时起会话的暖沙箱池、支撑会话持久化的文件系统快照、多人协作会话。关键优化：git 同步完成前放行读只阻塞写、用户开始输入时预测性预热、并行执行的自派生 Agent。

**工具设计原则（tool-design）**
工具是确定性系统与非确定性 Agent 之间的契约。有效工具设计遵循整合原则（宁要一个全面工具不要多个窄工具）、错误中返回上下文信息、支持响应格式选项以节约 token、使用清晰的命名空间。

### 卓越运营

**上下文压缩（context-compression）**
会话耗尽内存时压缩成为必选项。正确的优化目标是 tokens-per-task 而非 tokens-per-request。带文件/决策/下一步显式分节的结构化摘要，比激进压缩保留更多有用信息。制品链完整性（artifact trail integrity）仍是所有压缩方法中最弱的维度。

**上下文优化（context-optimization）**
技术包括：贴近上限时的压缩摘要（compaction）、以引用替换冗长工具输出的观察屏蔽（observation masking）、跨请求复用 KV 块的前缀缓存（prefix caching）、把工作拆分给隔离上下文子 Agent 的策略性分区。

**Latent Briefing（KV 记忆共享）**
Orchestrator-worker 系统中，监督者累积长轨迹而工作者只看到窄文本切片时 token 会复利式膨胀。Latent Briefing 在栈暴露工作者 KV 状态且模型兼容的前提下，用任务引导注意力（Attention Matching 式压缩）把编排轨迹压进工作者模型的 KV 缓存，使其无需全文重放即可获得相关潜在状态。

**评测框架（evaluation）**
生产级 Agent 评测需要确定性检查与多维评分表（事实准确性、完整性、工具效率、过程质量）。仅在结构、证据与评分数学有效之后才使用模型评审；评审器设计、成对比较与偏差缓解路由到高级评测。

**Harness 工程（harness-engineering）**
可靠的自治 Agent 需要围绕模型的显式运行回路：锁定指标、可编辑面、持久日志、新颖性检查、回滚规则与人类审批边界。Harness 防止 Agent 削弱评审器、在压缩中丢失状态、或把模糊目标变成不可审查的变更。

**自改进循环（self-improvement-loops）**
当 Harness 本身成为优化目标时需要另一套纪律：递归自改进、元 Harness 搜索、失败驱动的有界自编辑、进化式脚手架搜索与上下文机制演化。控制性约束：经验性两分无回归验收门、带原始痕迹的文件系统经验档案、所有可编辑面之外的运行时强制约束、防止坍缩的多样性保持。

### 开发方法论

**项目开发（project-development）**
有效的 LLM 项目开发始于任务-模型契合度分析：先以手工原型验证任务适合 LLM 处理，再构建自动化。生产管线遵循分阶段幂等架构（acquire → prepare → process → parse → render）与文件系统状态管理（调试与缓存）。带显式格式规格的结构化输出设计保障可靠解析。从最小架构起步，仅在证明必要时增加复杂度。

### 认知架构

**BDI 心智状态（bdi-mental-states）**
信念-愿望-意图（Belief-Desire-Intention）建模提供了把结构化外部上下文翻译为 Agent 心智状态的形式化方法。适用于理性 Agency、可解释性，以及需要在信念、目标与被选行动之间建立可审计链路的系统。

## 核心概念（Core Concepts）

合集围绕四个核心主题组织：其一，上下文基础确立上下文是什么、注意力机制如何工作、为何上下文质量重于数量；其二，架构模式覆盖使能有效 Agent 系统的结构与协同机制（多智能体、长程提示、记忆、文件系统、托管设施、工具）；其三，卓越运营解决优化、评测、Harness 可靠性与自改进；其四，开发方法论与认知架构覆盖项目执行和形式化心智状态建模。

## 平台制品契约（Platform Artifact Contracts）

`researcher/schemas/` 是跨运行时的中立 interchange 边界，为 Agent 组织的持久记录提供 8-10 组规范化制品契约（Draft 2020-12 JSON Schema）：`artifact-envelope`（制品信封）、`artifact-ref`（制品引用）、`candidate-artifact`（候选制品）、`freeze-receipt`（冻结回执）、`storage-binding`（存储绑定）、`credential-ref`（凭证引用）、`capability-grant-spec`（能力授予规格）及 legacy 迁移契约（`legacy-claim`、`legacy-mechanism`、`legacy-run-state`、`legacy-queue-record`）。要点：

- **摘要钉扎**：`registry.json` 按精确文件摘要登记所有 schema；读取侧（`resolve_for_read`）接受 active 与 deprecated 契约，写入侧（`resolve_for_write`）只接受唯一活跃写版本，退役版本不可解析。
- **规范字节**：`jcs-rfc8785-integer-v1`（RFC 8785 兼容子集）定义规范化 JSON 字节——UTF-16 码元排序对象键、仅整数域、拒绝浮点/NaN/重复键，记录摘要哈希规范字节，blob 摘要哈希精确字节。
- **类型化标识**：原生 ID 为 `<registered-prefix>_<UUIDv7>`；legacy 导入用固定迁移命名空间下的 UUIDv5 并声明 `id_origin: legacy_import`。
- **双运行时一致性**：Python `SchemaRegistry` 与 TypeScript `LoadedRuntimeRegistry` 在 schema 校验前先做进程内值规范化，共享 golden（含 astral-vs-BMP 冻结清单）证明两端 UTF-16 排序一致；配合 `artifact_store.py` 的精确字节 CAS 与候选冻结回执实现跨运行时制品存证。

配套的 `validate_platform_compat.py` 用上游 `agentskills` CLI 校验已发布技能，检查 Open Plugins 与 Claude marketplace 的发现一致性，并模拟 `.cursor/skills`、`.claude/skills`、`.codex/skills`、`.agents/skills` 四种目录式安装布局；v2.3.1 起全部技能的 frontmatter description 采用 YAML 安全引号，兼容 Cursor、Claude Code、Codex 等严格解析器。

## 治理边界（Governance Boundary）

`governance/` 定义研究组织的机器可读权威模型与公共导出边界：

- **程序宪章（constitution.yaml）**：刻意保守——未列出的操作一律拒绝（default-deny）、显式拒绝优先于允许、只有经认证的人类维护者可以合并或激活生产。可执行语义在 `researcher/scripts/governance_policy.py`，JSON Schema 描述公共 interchange 形状，授权行为永不依赖 schema 实现细节；`effective_commit: "$SELF"` 把策略钉扎在不可变 Git 历史，运行时钉扎校验器返回的 SHA-256 摘要而非可变路径。`validate_governance.py --check` 与 `--decision` 提供确定性裁决。
- **公共导出边界（export-policy.yaml）**：只允许把私有/受限记录经白名单投影到可评审的公共 staging 树，且不发布私有源定位符或摘要；由 `validate_export.py` 执行，导出示例见 `researcher/exports/`。
- **语料清点（researcher/corpus/inventory.json）**：确定性的全语料文件清点与对账报告，作为计数权威（`build_inventory.py --check` 门禁），替代手工计数。

## 实用指引（Practical Guidance）

各技能可独立使用也可组合。先读 fundamentals 建立上下文管理心智模型；按系统需求分支到架构模式技能；优化生产系统时参考运营技能。当前语料计数与兼容状态以生成的[实时语料清点](researcher/generated/corpus-summary.md)为准；带日期的基准与发布报告保留其原始快照计数。

技能平台无关，适用于 Claude Code、Cursor、Codex/OpenAI Agent Skills、GitHub Copilot 及任何支持自定义指令或技能式结构的 Agent 框架。长程提示技能配有交互式示例站点工程 `examples/long-horizon-prompt-lab/`。

## 集成（Integration）

合集内部自集成——技能互相引用并共享概念。fundamentals 为其余技能提供背景；架构类技能（multi-agent、long-horizon-prompting、memory、tools、filesystem、hosted-agents）可组合构建复杂系统；运营类技能（optimization、evaluation、harness-engineering、self-improvement-loops）适用于以基础与架构技能构建的任何系统。边界路由：`multi-agent-patterns` 拥有拓扑与协同机制，`harness-engineering` 拥有运行时强制约束，`evaluation`/`advanced-evaluation` 拥有评审器与 judge 构建，`long-horizon-prompting` 拥有启动提示本身。

## 参考（References）

合集内 17 个技能：
- [context-fundamentals](skills/context-fundamentals/SKILL.md)
- [context-degradation](skills/context-degradation/SKILL.md)
- [context-compression](skills/context-compression/SKILL.md)
- [multi-agent-patterns](skills/multi-agent-patterns/SKILL.md)
- [long-horizon-prompting](skills/long-horizon-prompting/SKILL.md)
- [memory-systems](skills/memory-systems/SKILL.md)
- [tool-design](skills/tool-design/SKILL.md)
- [filesystem-context](skills/filesystem-context/SKILL.md)
- [hosted-agents](skills/hosted-agents/SKILL.md)
- [context-optimization](skills/context-optimization/SKILL.md)
- [latent-briefing](skills/latent-briefing/SKILL.md)
- [evaluation](skills/evaluation/SKILL.md)
- [advanced-evaluation](skills/advanced-evaluation/SKILL.md)
- [harness-engineering](skills/harness-engineering/SKILL.md)
- [self-improvement-loops](skills/self-improvement-loops/SKILL.md)
- [project-development](skills/project-development/SKILL.md)
- [bdi-mental-states](skills/bdi-mental-states/SKILL.md)

治理与契约文档：
- [治理策略（governance/README.md）](governance/README.md)
- [Schema 注册表与规范化制品（researcher/schemas/README.md）](researcher/schemas/README.md)
- [公共导出边界示例（researcher/exports/README.md）](researcher/exports/README.md)

外部资源：
- 注意力机制与上下文窗口限制研究（lost-in-middle、RULER、context rot）
- 一线 AI 实验室关于 Agent 系统设计的生产经验（托管 Agent、多智能体研究系统）
- LangGraph、AutoGen、CrewAI 等框架文档

---

## Skill Metadata

**Created**: 2025-12-20
**Last Updated**: 2026-07-11（治理与平台契约扩展合入于 2026-08-10）
**Author**: Agent Skills for Context Engineering Contributors
**Version**: 2.5.0
