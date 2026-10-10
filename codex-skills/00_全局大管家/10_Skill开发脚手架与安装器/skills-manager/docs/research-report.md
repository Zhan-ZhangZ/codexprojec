# AI Agent Skills 管理工具——行业调研与产品决策报告

> 首次调研：2026-04-09
>
> 产品决策复核：2026-07-26
>
> 适用版本：0.11.0

## 零、0.11.0 复核结论

早期调研确认了 `SKILL.md`、`.agents/skills/` 和技能级软链接的行业基础，但今晚版本进一步验证：只围绕“平台全局目录”设计不足以覆盖真实使用场景。当前产品决策调整为：

1. **项目成为独立对象**：扫描目录只负责发现已有技能；任意已存在目录都可由用户添加为安装目标，即使不是 Git 仓库且尚无 Skills。
2. **中央技能库成为安装枢纽**：项目安装优先从中央技能库或技能集合选择；外部 URL、GitHub 仓库或本地目录先去重导入中央库，不从市场直接安装到项目。
3. **仓库与技能采用双层模型**：类似 `obra/superpowers` 的多技能仓库保留为完整技能包，用于来源、版本、更新和卸载；其中的子技能继续用于搜索、分类、筛选和选择性安装。
4. **平台范围强调可验证性**：默认展示当前验证和启用的平台，历史平台数据保留但不进入数量统计；Codex 固定第一，其他平台按本机检测结果优先。
5. **发现市场改为趋势市场**：静态热门列表不能回答“近期增长最快”。GitHub 采用本地每日快照计算 7 天/30 天 Star 增量，历史不足时明确标记估算；X 和 Hugging Face 作为可降级的独立来源。
6. **治理能力前置**：技能分类、标签、更新状态、本地修改和项目使用次数进入中央技能库的核心筛选与排序。

这些结论已经落实到 0.11.0。总体实现设计见[桌面应用总体设计](desktop-design.md)，详细领域设计见[项目技能管理与技能包重构](design/项目技能管理与技能包重构.md)。

---

## 一、Agent Skills 开放标准 (agentskills.io)

业界已形成统一的开放标准，由 Vercel Labs 推动，被 Anthropic、Google、OpenAI 等主要厂商采纳。

### 核心格式

每个 skill = 一个目录，包含 `SKILL.md`（YAML frontmatter + Markdown 指令）。

```
skill-name/
├── SKILL.md          # 必须：元数据 + 指令
├── scripts/          # 可选：可执行脚本
├── references/       # 可选：参考文档
└── assets/           # 可选：模板、资源
```

**`SKILL.md` frontmatter 规范：**

| 字段 | 是否必须 | 说明 |
|------|---------|------|
| `name` | 是 | 小写字母+连字符，最多 64 字符，须与目录名一致 |
| `description` | 是 | 最多 1024 字符，描述功能和触发时机 |
| `license` | 否 | 许可证名称 |
| `compatibility` | 否 | 环境要求（系统包、网络等） |
| `metadata` | 否 | 任意键值对扩展 |
| `allowed-tools` | 否 | 预授权工具列表（空格分隔） |

**最小示例：**

```yaml
---
name: code-reviewer
description: Review code changes and identify bugs. Use when the user asks for code review or feedback.
---

# Code Reviewer

## Workflow
1. Read the changed files
2. Identify potential issues...
```

### Progressive Disclosure（渐进式加载）

1. **元数据**（~100 tokens）：启动时加载所有 skills 的 `name` 和 `description`
2. **指令**（< 5000 tokens 推荐）：技能激活时加载完整 `SKILL.md`
3. **资源**（按需）：`scripts/`、`references/` 等文件按需加载

---

## 二、各平台 Skills 路径对照表

下表用于说明行业兼容路径，不等同于应用当前默认启用范围。路径尚未在本项目验证的平台不得仅凭目录约定显示为“已支持”。

| 平台 | Project 路径 | Global 路径 |
|------|-------------|-------------|
| **Claude Code** | `.claude/skills/` | `~/.claude/skills/` |
| **Cursor** | `.agents/skills/` | `~/.cursor/skills/` |
| **Codex (OpenAI)** | `.agents/skills/` | `~/.agents/skills/` (+ `/etc/codex/skills/` admin) |
| **Gemini CLI** | `.agents/skills/` | `~/.gemini/skills/` |
| **Trae** | `.trae/skills/` | `~/.trae/skills/` |
| **Trae CN** | `.trae/skills/` | `~/.trae-cn/skills/` |
| **Factory Droid** | `.factory/skills/` | `~/.factory/skills/` |
| **OpenClaw** | `skills/` | `~/.openclaw/skills/` |
| **QClaw** | 待确认 | 待确认 |
| **EasyClaw** | 待确认 | 待确认 |
| **AutoClaw/WorkBuddy** | 待确认 | 待确认 |
| **Universal** | `.agents/skills/` | `~/.agents/skills/` |
| **Cline / Warp** | `.agents/skills/` | `~/.agents/skills/` |
| **GitHub Copilot** | `.agents/skills/` | `~/.copilot/skills/` |
| **Windsurf** | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` |
| **OpenCode** | `.agents/skills/` | `~/.config/opencode/skills/` |
| **Goose** | `.goose/skills/` | `~/.config/goose/skills/` |
| **Junie** | `.junie/skills/` | `~/.junie/skills/` |
| **Kilo Code** | `.kilocode/skills/` | `~/.kilocode/skills/` |
| **Roo Code** | `.roo/skills/` | `~/.roo/skills/` |
| **Augment** | `.augment/skills/` | `~/.augment/skills/` |
| **Amp** | `.agents/skills/` | `~/.config/agents/skills/` |
| **Qwen Code** | `.qwen/skills/` | `~/.qwen/skills/` |

**关键发现**：Codex、Cursor、Gemini CLI、Cline、Copilot 等多个平台都兼容 `.agents/skills/` 作为通用路径，这使得 `~/.agents/skills/` 成为天然的 canonical 真实源目录。

### 2.1 当前产品支持范围

0.11.0 默认启用并展示的内置平台为：

- 编程类：Codex、Claude Code、Cursor、GitHub Copilot、Gemini CLI、OpenCode、Windsurf、Trae、Qwen Code、Kiro。
- 龙虾类：OpenClaw、QClaw、EasyClaw、WorkBuddy。

应用通过产品目录或命令探针检测本机平台，避免共享的 `~/.agents/skills/` 目录让所有兼容平台都被误判为已安装。Codex 始终排第一，其余本机已检测平台优先。旧版本中存在但当前未启用的平台记录继续保留，以兼容历史安装数据。

---

## 三、各平台 Skills 机制详述

### Claude Code (Anthropic)

- **invocation**：用户输入 `/skill-name` 或 Claude 自动识别触发
- **frontmatter 扩展字段**：
  - `disable-model-invocation: true` — 仅用户可触发
  - `user-invocable: false` — 仅 Claude 可触发
  - `context: fork` — 在子 agent 中运行
  - `allowed-tools` — 预授权工具
  - `effort`, `model` — 控制推理强度和模型
  - `hooks` — skill 生命周期钩子
  - `paths` — glob 模式限制触发范围
- **特性**：支持 `$ARGUMENTS` 占位符、Shell 注入（`` `!command` ``）、子 Agent 集成
- **Plugin 生态**：支持 `.claude-plugin/marketplace.json` 插件市场机制

### Trae (ByteDance)

- **分类**：Global Skills（跨项目）/ Project Skills（项目级）
- **加载方式**：按需加载（扫描描述 -> 按需加载全文），节省 token
- **与 Rules 的区别**：Rules 全量注入上下文；Skills 按需加载
- **与 MCP 的关系**：MCP 提供工具，Skills 描述如何使用这些工具
- **支持格式**：上传 SKILL.md 或 .zip 文件导入
- **管理**：Settings > Rules & Skills 可视化管理

### Codex (OpenAI)

- **Scopes**：REPO / USER (`~/.agents/skills/`) / ADMIN (`/etc/codex/skills/`) / SYSTEM
- **支持 symlink**：文档明确说明支持软链接目录
- **可选元数据**：`agents/openai.yaml` — 控制 UI 展示、调用策略、工具依赖
- **Plugin 机制**：可将 skills 打包为 plugin 分发
- **禁用配置**：`~/.codex/config.toml` 中通过 `[[skills.config]]` 条目禁用

### Gemini CLI (Google)

- **路径别名**：`.agents/skills/` 是 `.gemini/skills/` 的别名（PR #18151）
- **内置创建器**：`skill-creator` 内置 skill 可通过对话创建新 skill
- **配置文件**：`settings.json` + `GEMINI.md` 控制行为

### Factory Droid

- **兼容路径**：`.agent/skills/`（注意单数 agent）和 `.factory/skills/` 均支持
- **Droids 概念**：自定义子 Agent，可预加载 skills
- **命令迁移**：`.factory/commands/` 与 skills 统一，旧命令仍兼容
- **Enterprise**：支持 managed settings 企业级分发

### OpenClaw (开源 AI Agent 平台)

- **配置文件**：`~/.openclaw/openclaw.json` 下的 `skills` 节点
- **配置字段**：`allowBundled`、`load.extraDirs`、`load.watch`、`entries.<skillKey>`
- **QClaw**：腾讯基于 OpenClaw 的一键桌面版（Lobster 平台）
- **EasyClaw**：Easylab 开发的 OpenClaw 前端，2.0 引入多 Agent 系统
- **AutoClaw/WorkBuddy**：Zhipu AI 的浏览器自动化 Agent，走 OpenClaw 标准

---

## 四、现有管理工具对比分析

### 4.1 npx skills (vercel-labs/skills)

- **Stars**：13,300+（行业最大）
- **支持平台**：44+
- **安装源**：GitHub shorthand / 完整 URL / GitLab / git URL / 本地路径
- **核心命令**：`add`, `remove`, `list`, `find`, `check`, `update`, `init`
- **安装方法**：Symlink（推荐）/ Copy
- **Global 路径**：`~/.agents/skills/` 作为 canonical 源
- **Lock 文件**：`~/.agents/.skill-lock.json`

**已知问题（来自 GitHub Issues）**：
- [#851] 全局安装 `--agent claude-code` 时不创建 `~/.claude/skills/` 软链接
- [#694] Global install 未为非 universal agent 创建 agent-specific symlinks
- [#423] `skills update` 在意料之外的 agent 目录创建软链接
- [#304] 缺乏目录级软链支持（`~/.cursor/skills` -> `~/.agents/skills`）

### 4.2 SkillsGate（参考项目）

**形态**：CLI + TUI（Ink/Bun）+ Desktop（Electron）+ Web（CF Workers）+ MCP Server

**架构**（monorepo）：
```
apps/
  desktop/    # Electron + React
  web/        # React Router v7 on CF Workers
packages/
  cli/        # 核心 CLI (skillsgate)
  tui/        # Terminal UI (Bun + Ink)
  local-db/   # SQLite (WAL 模式)
  ui/         # 共享 React 组件
```

**核心模块**：
- `core/agents.ts` — Agent 注册表（20个平台），每项包含 `skillsDir`、`globalSkillsDir`、`detectInstalled()`
- `core/installer.ts` — 安装/软链/卸载，`CANONICAL_SKILLS_DIR = ~/.agents/skills`
- `core/skill-discovery.ts` — 29+ 优先目录扫描 + 递归 fallback
- `core/skill-lock.ts` — lock 文件读写
- `core/scanners.ts` — AI 安全扫描（调用 claude/codex/opencode/goose/aider）
- `mcp/server.ts` — MCP Server 模式（stdio transport）

**软链接机制**：
```
安装时：
1. clone repo 到 tmp 目录
2. 发现 SKILL.md，解析 frontmatter
3. 写入 canonical: ~/.agents/skills/<name>/
4. 为每个 agent 创建相对路径软链:
   ~/.claude/skills/<name> -> ../../.agents/skills/<name>
5. 更新 ~/.agents/.skill-lock.json
```

**安全扫描功能**：
- 检测类别：prompt injection、data exfiltration、malicious shell commands、credential harvesting、social engineering、suspicious network access、file system abuse、obfuscation
- 输出：JSON 格式 `{ risk, findings[], summary }`
- 支持的扫描器：claude-code、codex-cli、opencode、goose、aider

**与 npx skills 的关系**：代码注释 "Portions adapted from vercel-labs/skills"，属于增强版实现。

### 4.3 localskills.sh

- 团队协作 + 版本控制 + skills 发布
- 支持 CLI / API 发布
- 闭源 SaaS，目前 Beta 阶段

### 4.4 其他工具

| 工具 | 特点 |
|------|------|
| `skill-rule` (@ngxtm) | 跨平台规则同步，TypeScript |
| `code-ai-installer` | 多平台安装，VSCode Copilot/GPT/Claude/Qwen |
| `ai-agent-skills` | npm 包封装 |
| `aialchemylabs/ai-agentic-rules` | 模块化规则系统 |
| `ruler` (intellectronica) | 跨 agent 规则同步 |
| `skillsio` | 安全扫描前置 |
| `samibs/skillfoundry` | 质量门控框架 |

---

## 五、市场与趋势发现

| 平台 | 领域 | 特点 |
|------|------|------|
| **skills.sh** | 通用（偏编程） | Vercel 官方市场，91k+ skills |
| **ClawHub** | OpenClaw 生态 | 龙虾平台专属，电商/自动化类 |
| **agentwiki.org** | 知识库 | AI Agent 知识文档 |
| **aiagenttools.ai** | 工具目录 | 平台无关 skills 评测 |

### 5.1 从“热门”到“近期增长”

仓库当前 Star 总数只能反映长期积累，不能直接代表近一周或近一月的增长速度。GitHub API 也不直接提供任意历史时点的 Star 总数，因此产品采用本地快照：

1. 每日记录候选仓库的 Star 总数和采集时间。
2. 7 天/30 天趋势使用当前快照减去相应历史快照。
3. 没有足够历史数据时可以根据当前可用信号排序，但必须展示“趋势估算”，不能伪装成真实增量。
4. 快照按来源、候选对象和日期去重，保证重复刷新不会重复计数。

### 5.2 多来源准入与降级

| 来源 | 准入规则 | 失败处理 |
| --- | --- | --- |
| GitHub | 仓库中可发现一个或多个有效 `SKILL.md` | 保留最近快照并显示刷新错误 |
| X | 与 Skills 仓库或明确技能内容相关；使用可选 Bearer Token | 只停用 X 来源，不阻塞其他来源 |
| Hugging Face | 能解析 `SKILL.md`，或元数据明确指向技能仓库 | 排除无法验证为 Skills 的普通模型/数据集 |
| 可信推荐/订阅 | 来源可追溯且能进入统一导入预览 | 单条来源错误独立展示 |

趋势市场只负责发现。任何外部候选都必须先进入中央技能库，完成来源规范化、内容校验、冲突处理和去重后，才能安装到项目。

### 5.3 趋势数据的可信度边界

- GitHub 的真实增量依赖本地历史快照，安装后的最初 7/30 天可能只有估算。
- X 热度受 API 权限、速率限制和搜索覆盖影响，不应与 GitHub Star 增量混为同一指标。
- Hugging Face 的点赞、下载等信号与 GitHub Star 含义不同，只能在来源内部排序。
- 跨来源聚合时必须保留来源和原始指标，不生成缺乏统一口径的虚假“总热度分”。

---

## 六、软链接策略深度分析

### Skill 级软链（npx skills / SkillsGate 采用）

```
~/.agents/skills/
  frontend-design/    ← 真实文件
  code-reviewer/      ← 真实文件

~/.claude/skills/
  frontend-design -> ../../.agents/skills/frontend-design   ← 软链
  code-reviewer   -> ../../.agents/skills/code-reviewer     ← 软链

~/.cursor/skills/
  frontend-design -> ../../.agents/skills/frontend-design   ← 软链
```

**优点**：可选择性地为不同 agent 安装不同 skills
**缺点**：管理大量软链时较繁琐，容易出现孤立软链

### 目录级软链（社区提案 #304）

```
~/.agents/skills/
  frontend-design/    ← 真实文件

~/.cursor/skills -> ~/.agents/skills    ← 整个目录软链
~/.claude/skills -> ~/.agents/skills    ← 整个目录软链
```

**优点**：极简，任何新 skill 自动对所有 agent 生效
**缺点**：无法精细控制哪个 agent 用哪些 skills

**skills-manager 选择**：Skill 级软链（更灵活），但提供 `doctor` 命令诊断孤立软链。

### 项目级安装的补充结论

项目安装的统一目标为 `<项目>/.agents/skills/`。平台若能原生读取该路径，可直接使用；需要专有目录的平台由已验证适配器创建受管理链接。

Windows 下仍优先创建目录软链接。若系统权限或文件系统能力导致失败，应用返回“需要复制确认”，只有用户明确同意后才创建受管理副本，禁止静默降级。卸载时只处理应用安装清单中拥有的路径，扫描发现的原生目录不属于可自动删除对象。

## 七、技能包与单技能的双层管理

仅把仓库拆成多个独立技能会丢失仓库级版本、许可证、脚本、Hooks、插件清单和共同更新边界；仅把仓库视为一个技能又会失去精细搜索和选择能力。因此采用双层模型：

- **技能包**：完整来源仓库，是导入快照、版本、更新和卸载边界。
- **包内技能**：由仓库内各个 `SKILL.md` 表示，是搜索、分类、筛选和项目选择边界。
- **默认行为**：展示完整包并默认整体安装，允许取消非必选子技能。
- **安全行为**：导入阶段不执行仓库脚本；含 Hooks 或未验证原生清单的包只开放安全的通用技能安装。
- **去重行为**：子技能内容可以与中央库记录复用，但必须保留包归属和来源关系。

---

## 八、行业趋势与洞察

1. **标准化加速**：agentskills.io 已成为实际标准，主要厂商均采纳
2. **`.agents/skills/` 成为通用路径**：多个平台同时兼容此路径
3. **安全意识提升**：vercel-labs/skills 对 OpenClaw 发出警告（大量重复和恶意 skills）
4. **MCP 与 Skills 协同**：Skills 描述工作流，MCP 提供工具，两者互补
5. **Plugin 生态**：Claude Code 和 Codex 均有 Plugin/Marketplace 概念，将 skills 打包分发
6. **龙虾平台（Lobster）崛起**：QClaw、EasyClaw、AutoClaw 等基于 OpenClaw 的中文平台快速增长
7. **行业垂直化需求**：电商、自媒体、视频创作等非编程领域 skills 需求旺盛
8. **项目级部署成为必要能力**：仅扫描已安装技能无法支持从零为任意项目配置工作流
9. **仓库级治理与技能级发现需要并存**：多技能仓库不能简单扁平化后丢失来源边界
10. **趋势指标必须可解释**：累计热度、近期增量和跨平台互动指标不能混用

## 九、对产品设计的最终映射

| 调研发现 | 0.11.0 产品响应 |
| --- | --- |
| `.agents/skills/` 被多个平台兼容 | 作为中央技能库和项目通用安装目录 |
| 不同平台仍存在专有目录 | 引入平台适配与验证状态 |
| 外部来源格式多样 | 统一先导入中央库并按来源/内容哈希去重 |
| 多技能仓库包含共同版本与脚本 | 使用技能包 + 包内技能双层模型 |
| 静态市场不能表达近期增长 | 保存快照并计算 7 天/30 天趋势 |
| Skills 存在脚本与提示注入风险 | 导入不执行脚本，Hooks 和原生清单进入安全门禁 |
| 用户需要为新项目直接配置 Skills | 独立项目页支持任意空目录注册和批量安装 |
| 技能数量增长后难以查找和维护 | 分类标签、更新筛选和项目使用次数排序 |
