---
name: google-workspace-mcp
description: "Google Workspace 全家桶 MCP 服务器（PyPI workspace-mcp）。覆盖
  Gmail/Calendar/Docs/Sheets/Drive/Chat/Contacts/Slides/Tasks/Forms 全组件，OAuth
  单次授权，FastMCP 实现，Docker 一键部署。Leading Words: Google Workspace MCP, Gmail日历文档,
  谷歌全家桶接入, OAuth MCP, workspace mcp"
metadata:
  upstream: github.com/taylorwilsdon/google_workspace_mcp
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# google-workspace-mcp

Google Workspace 全家桶 MCP 服务器（PyPI workspace-mcp）。覆盖 Gmail/Calendar/Docs/Sheets/Drive/Chat/Contacts/Slides/Tasks/Forms 全组件，OAuth 单次授权，FastMCP 实现，Docker 一键部署。

## 何时使用

适用任务：Google Workspace 全家桶 MCP 服务器（PyPI workspace-mcp）。覆盖 Gmail/Calendar/Docs/Sheets/Drive/Chat/Contacts/Slides/Tasks/Forms 全组件，OAuth 单次授权，FastMCP 实现，Docker 一键部署。
相关检索词：Google Workspace MCP、workspace-mcp、谷歌全家桶MCP。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `skills/managing-google-workspace/SKILL.md` — **managing-google-workspace**：Manages Google Workspace operations across 12 services (Gmail, Drive, Calendar, Docs, Sheets, Slides, Forms, Tasks, Contacts, Chat, Apps Script, Custom Search). Supports MCP tools or CLI via uvx workspace-mcp --cli. Pro…

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `pyproject.toml`

## 上游

- https://github.com/taylorwilsdon/google_workspace_mcp
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
