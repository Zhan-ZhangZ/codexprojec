---
name: bernstein
description: Bernstein 开源 AI Agent 治理层与确定性编排引擎。协调环内无模型——计划重放即同一任务图，每个编码任务跑在独立 git worktree 并过 lint/类型/测试门；离线可验证运行回执、签名血缘与可选 HMAC 审计链。驱动 Claude Code、Codex、Gemini CLI 等 40+ CLI 代码助手。Leading Words: 确定性Agent编排, CLI多智能体调度, 任务流状态机, Agent治理审计
version: 3.19.0
---

# Bernstein

AI Agent 的开源治理层（governance layer）：用纯 Python 确定性调度器驱动 CLI 编码助手，**协调环里没有 LLM**——同一计划重放得到同一任务图，全程可复现。适用于需要可审计、可验证的多智能体代码任务流水线。

## 核心机制

- **确定性调度**：计划（plan）即任务图，重放等价；无模型参与协调
- **每任务独立 worktree**：每个编码任务在专属 git worktree 中执行，前置 lint / 类型 / 测试门
- **工件模式任务**：在隔离的普通目录中以签名血缘回执（signed lineage receipt）完成
- **可验证性**：运行回执（run receipts）离线可验；血缘脊柱 + 重放日志；可选 HMAC 链式审计日志
- **40+ 适配器**：Claude Code、Codex、Gemini CLI、Cursor、Aider、Cline、Zed 等（[references/docs/adapters/](references/docs/adapters/)，适配器开发指南见 [ADAPTER_GUIDE.md](references/docs/adapters/ADAPTER_GUIDE.md)）

## 上手路径

1. **概念**：[references/docs/concepts/](references/docs/concepts/) —— 计划、任务图、血缘、回执的核心模型
2. **入门**：[references/docs/getting-started/](references/docs/getting-started/) —— 安装与首个编排
3. **参考**：[references/docs/reference/](references/docs/reference/) —— CLI 与配置参考
4. **LLM 导读**：[references/docs/llms.txt](references/docs/llms.txt) —— 为 LLM 编制的官方文档索引
5. **示例配置**：[references/bernstein.yaml](references/bernstein.yaml)、MCP 服务清单 [references/server.json](references/server.json)、工件/审计 JSON Schema [references/schemas/](references/schemas/)

## 专题文档

| 主题 | 位置 |
| --- | --- |
| 编排（orchestration）与 SDD | [references/docs/orchestration/](references/docs/orchestration/)、[references/docs/sdd/](references/docs/sdd/) |
| 安全与沙箱 | [references/docs/security/](references/docs/security/)、[references/docs/sandbox/](references/docs/sandbox/) |
| 可观测性与合规 | [references/docs/observability/](references/docs/observability/)、[references/docs/compliance/](references/docs/compliance/) |
| 血缘与审计 | [references/docs/lineage/](references/docs/lineage/) |
| MCP 集成 | [references/docs/mcp/](references/docs/mcp/) |
| 底层助手接入（substrate） | [references/docs/substrate/](references/docs/substrate/) |
| 架构决策 | [references/docs/architecture/](references/docs/architecture/) |

## 参考文档索引

- [references/README.md](references/README.md) — 上游总说明
- [references/CHANGELOG.md](references/CHANGELOG.md) — 变更史（按版本明细见上游 release-notes）
- [references/docs/index.md](references/docs/index.md) — 文档站首页
- [references/LICENSE](references/LICENSE) — 许可证

> 上游运营/部署、多语言站点、博客与历史 release-notes 未随库分发，需要时访问 [上游仓库](https://github.com/sipyourdrink-ltd/bernstein/tree/v3.19.0/docs)。
