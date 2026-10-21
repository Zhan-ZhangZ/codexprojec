---
name: photoshop-mcp
description: Adobe Photoshop MCP 自动化技能。通过已发布的 npm MCP 服务，用自然语言或 Agent 工具检查 Photoshop 文档状态，执行选区、蒙版、图层、文字、调整、滤镜、生成式 AI、批量配方、社媒导出和预览验证。适用于抠图、人像修饰、批量水印、样机替换、颜色分级、网页与社媒交付，以及需要可撤销 Photoshop 自动化的任务。
license: MIT
metadata:
  upstream: https://github.com/alisaitteke/photoshop-mcp
  version: 1.7.37
  commit: ba36d8f2a28ecc56686568f3c0191e388336d498
---

# Photoshop MCP

这是独立的 Photoshop MCP 接入技能。服务通过 `npx -y @alisaitteke/photoshop-mcp` 启动，本目录保留工具文档、提示词层、两套原生子技能和可选 UXP 插件，不包含服务源码。

中文说明见 [README.zh-CN.md](./README.zh-CN.md)，英文原文见 [README.md](./README.md)。

## 路由

| 任务 | 入口 |
|---|---|
| 移除背景、抠图、透明背景 | [photoshop-remove-background](./skills/photoshop-remove-background/SKILL.md) |
| 人像、调色、网页导出、轮播、水印、样机、证件照、贴纸描边等 | [photoshop-recipes](./skills/photoshop-recipes/SKILL.md) |
| 原子工具参数与完整工具表 | [available-tools.md](./docs/available-tools.md) |
| 独立 Web UI、认证与 Action Plan | [standalone-ui.md](./docs/standalone-ui.md) |
| 生成式 AI 能力 | [generative-ai.md](./docs/generative-ai.md) |
| 连接或脚本错误 | [troubleshooting.md](./docs/troubleshooting.md) |

## 最短执行路径

1. 确认 Photoshop 正在运行、Node.js 为 18+，且 MCP 客户端已配置 `npx -y @alisaitteke/photoshop-mcp`。
2. 新会话先调用能力检查与 `photoshop_get_state`；不要凭猜测假定活动文档、图层或选区。
3. 多步骤结果优先选 `photoshop_recipe_*`，每个配方应保持单一撤销步骤；单步精确修改再用原子工具。
4. 关键修改后调用 `photoshop_get_preview` 做视觉验证。
5. 删除、合并、拼合、覆盖文件和关闭未保存文档前先确认；遇到结构化错误时读取 `code`、`suggested_next_tool`，重新获取状态后只重试一步。

## 运行与隐私

- 需要在本机启动 Photoshop；Windows 通过 COM，macOS 通过 AppleScript。
- Neural Filters 需要按需加载 `uxp-plugin/`；其余核心工具通过 ExtendScript 工作。
- 匿名聚合分析默认启用，可通过 `ANALYTICS_DISABLED=1` 关闭；详见 [anonymous-usage-analytics.md](./docs/anonymous-usage-analytics.md)。
