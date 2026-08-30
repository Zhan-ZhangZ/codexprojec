---
title: 官方本地 Comfy MCP 应用层接入
description: 在同一个 ComfyUI Skill 中保留 CLI 高效执行，同时使用官方本地 Comfy MCP 完成实时发现、校验和复杂编排。
permalink: /zh/comfy-mcp-application-layer/
---

# 官方本地 Comfy MCP 应用层接入

这个项目现在把 CLI 和官方 MCP 放在同一个 Skill 应用层里，但两者分工不同：

```text
用户需求
  -> ComfyUI Skill：理解需求并选择入口
      -> comfyui-skill CLI：跑已登记工作流、重复任务和批量任务
      -> 官方本地 Comfy MCP：发现模板/节点/模型、校验和复杂编排
```

对业务来说，CLI 是已经标准化的生产通道，适合稳定重复；MCP 是实时了解 ComfyUI 生态的能力通道，适合还不知道该选哪个工作流、模型或节点的需求。

## 如何连接

先按照 Comfy 官方的[本地 MCP 连接指南](https://docs.comfy.org/zh/agent-tools/mcp#local-comfy-mcp-connection)把 MCP 注册到 Agent。宿主能直接看到 MCP 工具时，Skill 会直接调用。

如果 Agent 只有 Shell 能力，可以走仓库内置连接桥：

```bash
python ./scripts/comfy_mcp.py probe
python ./scripts/comfy_mcp.py tools
python ./scripts/comfy_mcp.py call search_templates --arguments '{"query":"background removal"}'
```

这个脚本启动的仍然是官方 `comfy-mcp` stdio server，并没有在项目里重新实现一套 MCP。

## 怎么选择入口

| 用户需求 | 使用入口 |
| --- | --- |
| 运行已有 `<server>/<workflow>` | `comfyui-skill` CLI |
| 重复生成或批量执行 | `comfyui-skill` CLI |
| 查找当前可用模板、节点或模型 | 官方 MCP |
| 校验或修改陌生工作流 | 官方 MCP |
| 查询 MCP 任务状态并取回文件 | 官方 MCP |
| 安装、更新、重启、切版本或产生费用 | 用户确认后使用官方 MCP |

耗时任务应使用 `run_workflow(wait=false)` 或 `run_template(wait=false)`，然后通过 `job` 查询，最后用 `fetch_outputs` 取结果。一旦某个入口返回了 `prompt_id`，后续必须留在同一入口，避免同一个请求被重复提交两次。

Agent 使用的详细规则见 [`references/comfy-mcp.md`](https://github.com/HuangYuChuh/ComfyUI_Skills_OpenClaw/blob/main/references/comfy-mcp.md)。
