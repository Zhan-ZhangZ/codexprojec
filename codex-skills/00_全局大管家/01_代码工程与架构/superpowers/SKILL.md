---
name: superpowers
description: 严格模式工程素养约束器。强制 Agent 遵循测试驱动开发（TDD）理念：在改动代码前必须先写测试用例，并在编写完后主动触发边界条件检测和代码自省（Linter），根绝“看起来能跑但有暗坑”的随性修改。Leading Words: 测试驱动开发 TDD, 严格代码质量约束, 边界用例覆盖, 主动Linter检查, 零隐患开发
metadata:
  version: "6.3.0"
  upstream: github.com/obra/superpowers
---

# superpowers

- **项目主页**: https://github.com/obra/superpowers
- **上游版本**: v6.3.0（2026-08-12 发布）

## 功能说明

一套完整的 Agentic Skills 工程方法论框架（agentic skills framework & software development methodology）：以「先想清楚 → 写计划 → TDD 实现 → 系统化调试 → 代码审查 → 干净收尾」的研发闭环约束 Agent 的工作方式。核心纪律是测试驱动开发——先写测试、再写实现，配合验证前置、边界检测与代码自省（Linter），杜绝“看起来能跑、实际有暗坑”的随性修改。所有子技能通过 `using-superpowers` 引导技能在会话开始时自动触发，无需人工指定。

## 子技能清单（skills/，共 14 个）

| 子技能 | 用途 |
|---|---|
| `using-superpowers` | 框架入口/引导：会话开始即建立“先查技能再动作”的强制规则，含各运行时适配参考 |
| `brainstorming` | 任何创造性工作之前必须先用：挖需求、出设计文档；v6.3.0 起按 spike/有界/架构三档分级控制流程繁简 |
| `writing-plans` | 有了规格后、动代码前：写出“热情但缺乏判断力的初级工程师也能执行”的实现计划 |
| `executing-plans` | 在独立会话中执行已写好的计划，带审查检查点 |
| `subagent-driven-development` | 当前会话内用子代理逐任务执行计划（控制器/实现者/审查者分离），配套 prompt 与 workspace 脚本 |
| `dispatching-parallel-agents` | 2 个以上互不依赖的独立任务并行分派 |
| `test-driven-development` | TDD 核心纪律：实现任何功能/修复前先写测试（含 good-tests 写法指南） |
| `systematic-debugging` | 遇到任何 bug、测试失败、意外行为时：先系统化定位根因，禁止瞎猜乱改 |
| `verification-before-completion` | 声称“完成/修好/通过”之前：必须实际跑验证命令并出示证据 |
| `requesting-code-review` | 完成任务/大功能/合并前：发起代码审查（含审查者 prompt） |
| `receiving-code-review` | 收到审查意见后：先评判再落实，不盲从 |
| `finishing-a-development-branch` | 实现完成、测试全绿后：决定分支如何集成收尾（v6.3.0 起移除 worktree 前不再强删未跟踪文件） |
| `using-git-worktrees` | 需要与当前工作区隔离的特性开发：先建 git worktree 隔离工作 |
| `writing-skills` | 创建/修改/验证技能本身的元技能（含 Anthropic 最佳实践、说服原理、图表渲染脚本） |

## 使用方式（Codex 环境）

1. 框架按子技能自动触发：会话开始读 `skills/using-superpowers/SKILL.md` 建立规则；之后凡命中场景（如“做个功能”→先 `brainstorming`，“修个 bug”→先 `systematic-debugging`）即调用对应子技能，并宣布 "Using [skill] to [purpose]"。
2. 子代理类技能（SDD、并行分派）需要多代理支持：在 `~/.codex/config.toml` 开启 `[features] multi_agent = true`；Codex 专属注意事项（spawn_agent/wait_agent 用法、模型白名单等）见 `skills/using-superpowers/references/codex-tools.md`。
3. 各子技能产出的设计文档/计划按上游惯例存放在**用户项目**的 `docs/superpowers/specs/` 与 `docs/superpowers/plans/` 下（这是对目标项目的写入指令，不是本技能目录的路径）。
4. 框架概览、多运行时安装方式与工作流说明见 [README.md](./README.md)；OpenCode 与 Kimi Code 两个运行时的安装补充文档在 [docs/README.opencode.md](./docs/README.opencode.md)、[docs/README.kimi.md](./docs/README.kimi.md)。

## v6.3.0 版本变化要点（相对本地此前集成的 2026-07 快照）

- 新增 Devin CLI 与 Hermes Agent 运行时支持，`using-superpowers` 平台适配参考新增 `pi-tools.md`、`antigravity-tools.md`、`hermes-tools.md`（上游已删除 copilot/gemini-tools.md）。
- `brainstorming` 新增三档流程路由（spike / bounded / architectural），小任务免走双文档仪式，实现前仍必经用户确认。
- SDD（子代理驱动开发）效率与纪律重做：小任务合并派发、实现者/审查者禁止再生子代理、计划携带 `Spec:` 指针、非破坏性计划冲突由控制器裁决不再卡死；审查 prompt 重组为 `task-reviewer-prompt.md` + `re-review-prompt.md`，并新增 `scripts/task-brief`、`scripts/sdd-workspace`、`scripts/review-package`。
- Codex 适配改事件驱动等待、显式固定模型与推理力度，多代理参考对照 Codex 源码修正。
- `finishing-a-development-branch` 修复 worktree 移除误删未跟踪文件的问题；`writing-skills` 的 `render-graphs.js` 兼容 Windows。

## 引用索引

- 框架总览/安装/工作流/哲学：[README.md](./README.md)
- 全部子技能正文与配套 prompt、脚本：[skills/](./skills/)（各子技能的 `SKILL.md` 为入口）
- 许可证：[LICENSE](./LICENSE)（MIT）
