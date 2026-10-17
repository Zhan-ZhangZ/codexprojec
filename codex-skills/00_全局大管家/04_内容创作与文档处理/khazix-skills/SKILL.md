---
name: khazix-skills
description: "万字深度长文与重型研究报告架构师。内置复杂的写作推理流，专攻科技热点分析、万字长文拆解重构与极具深度的硬核观点输出（如微信公众号科\
  技评论）。Leading Words: 万字长文架构, 重型写作流, 科技热点深度评论, 硬核观点拆解"
metadata:
  upstream: github.com/KKKKhazix/khazix-skills
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# khazix-skills

万字深度长文与重型研究报告架构师。内置复杂的写作推理流，专攻科技热点分析、万字长文拆解重构与极具深度的硬核观点输出（如微信公众号科技评论）。

## 何时使用

适用任务：万字深度长文与重型研究报告架构师。内置复杂的写作推理流，专攻科技热点分析、万字长文拆解重构与极具深度的硬核观点输出（如微信公众号科技评论）。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `aihot/SKILL.md` — **aihot**：查询 AIHOT 的中文 AI 资讯、精选、当前热点和日报。用户询问今天或最近的 AI 新闻、AI 圈动态、大模型或产品发布、OpenAI／Anthropic／Google 最新消息、AI 论文、AI 日报、AIHOT 精选、当前最热事件，或需要同步当前全部精选时使用。必须通过 aihot.virxact.com 的匿名只读 API 获取当前数据，不凭训练记忆回答新闻；不需要 API Key 或 MCP server。
- `hv-analysis/SKILL.md` — **hv-analysis**：横纵分析法（Horizontal-Vertical Analysis）深度研究Skill。由数字生命卡兹克提出，融合了索绪尔的历时-共时分析、社会科学的纵向-横截面研究设计、商学院案例研究法与…
- `khazix-writer/SKILL.md` — **khazix-writer**：数字生命卡兹克（Khazix）的公众号长文写作skill。当用户需要撰写公众号文章、写稿子、续写文章、根据素材产出长文时使用。触发词包括但不限于：写文章、写稿子…
- `leader/SKILL.md` — **leader**：把一句话的想法拆成 AI agent 能独立跑完的目标任务书。用户说「帮我给 agent 写个目标」「帮我详细拆一下这个目标」「写个任务书/brief 给 agent」「写个 goal 提示词」…
- `neat-freak/SKILL.md` — **neat-freak**：Knowledge and governance closeout: reconcile project docs, rule files (CLAUDE.md/AGENTS.md), authorized agent memory, and workspace residue with what the code and runtime actually do, so the next session or the next per…
- `storage-analyzer/SKILL.md` — **storage-analyzer**：macOS / Windows 只读存储分析助手（自动识别系统）。扫描整机磁盘占用，找出 占空间大户，把每一项分成 🟢可自动清理 / 🟡需人工判断 / 🔴谨慎清理 三级并给出 可…

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `README.en.md`

## 上游

- https://github.com/KKKKhazix/khazix-skills
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
