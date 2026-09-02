---
name: mattpocock-skills
description: Matt Pocock 纯正 Agentic Skills 元级构造套件与生态范本。专注入侵大模型思维的「软件工程心智」：强制应用 TDD 驱动、/grill 需求严苛反问与鲁棒的元技能 (Writing-great-skills) 生成规范。作为终极向导大幅抑制 Agent 鲁莽跳跃。Leading Words: Matt Pocock元技能构造规范, TDD驱动软件工程心智, /grill需求反向严苛拷问, 抑制鲁莽行为预测性护栏
version: 1.2.3
metadata:
  upstream: github.com/mattpocock/skills
---

# Matt Pocock Skills Repository

本目录包含 [mattpocock/skills](https://github.com/mattpocock/skills) 仓库（v1.2.3，上游 2026-08-24）的全量内容。

## 简介
这一套技能库专为 Agent（Claude Code、Codex 等）打造，通过设定具体的分支任务与规则来代替庞大的全局系统提示词，从而提高模型执行特定任务时的可预测性，减少幻觉和乱改代码的概率。上游以 Claude Code 插件（`.claude-plugin/`）与 skills.sh 双通道分发，每个技能目录下均带 Codex 侧 openai.yaml 界面元数据，可双平台直接调用。

## 目录结构（上游 1.2.x 新结构）
- `skills/engineering/`：18 个工程主战技能（promoted，进插件）
- `skills/productivity/`：7 个日常效率技能（promoted，进插件）
- `skills/misc/`：4 个低频留存技能
- `skills/in-progress/`：8 个公测中技能
- `skills/deprecated/`：已清空（旧技能并入继任者，见各 docs 页「Where did X go?」）
- `docs/<bucket>/<skill>.md`：promoted 技能的人读文档树，与 `skills/` 一一镜像
- `.agents/`：仓库编制规则（invocation、writing-docs、ADR、install-block）
- `.out-of-scope/`：triage 技能的「已拒绝概念」运行时知识库
- `scripts/`：link-skills.sh / list-skills.sh 安装工具与 plugin 版本同步脚本

## 核心技能推荐
- **writing-for-agents**（原 writing-great-skills，1.2.0 改名重构）：一套极其深度的元技能，覆盖 Agent 消费的任何文档（技能、AGENTS.md/CLAUDE.md、指针可达文档）如何写得可预测；术语表已并入正文，技能专属机制拆分至 `SKILL-MECHANICS.md`。
- **tdd**：强制 Agent 在写业务代码前必须先写失败的测试，并在通过后进行重构（红-绿-重构循环），附 `mocking.md`/`tests.md`。
- **grill-with-docs / grilling**：行动前强制 Agent 对用户做「需求盘问」（1.2.0 起按轮次推进：每轮一次性抛出前置已就绪的全部问题）。
- **diagnosing-bugs**：标准化、分步排查 Bug 的严谨流程（1.2.3 起内置机密脱敏步骤）。
- **ask-matt**：全技能路由器，映射每个用户可达技能与流转关系（含会话阶段边界决策树 `PHASE-BOUNDARIES.md`）。
- **wizard**（1.2.0 自 in-progress 晋级）：生成交互式 bash 脚本，引导人类完成只有人能做的步骤（开 URL、点按钮、写 `.env` 与 CI secrets）。

## 与上一集成版（1.1.0）的主要差异
- **改名**：`writing-great-skills` → `writing-for-agents`（无别名）；`wayfinder` 沿用，`to-spec`/`to-tickets` 术语对齐。
- **清退 6 技能**：`ubiquitous-language`→domain-modeling、`design-an-interface`→codebase-design、`request-refactor-plan`→to-spec/improve-codebase-architecture、`qa` 并入；`edit-article`、`obsidian-vault`（personal 目录）整体移除。
- **晋级**：`wizard`、`to-questionnaire` 进入插件；新增 `wait-what`（一字纠偏啰嗦输出）。
- **双平台**：全部技能新增 Codex 侧 openai.yaml（界面元数据与隐式调用策略），`AGENTS.md` 指向 `CLAUDE.md`。
- **in-progress 新增**：implement-spec、retro、setup-ts-deep-modules。
