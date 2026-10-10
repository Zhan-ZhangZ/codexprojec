---
name: google-workspace-mcp
description: "Google Workspace 全家桶 MCP 服务器（Agent Skills Hub mcp-for-google 场景实测首选，PyPI workspace-mcp）。覆盖 Gmail/Calendar/Docs/Sheets/Drive/Chat/Contacts/Slides/Tasks/Forms 全组件，OAuth 单次授权，FastMCP 实现，Docker 一键部署。Leading Words: Google Workspace MCP, Gmail日历文档, 谷歌全家桶接入, OAuth MCP, workspace mcp"
metadata:
  upstream: "github.com/taylorwilsdon/google_workspace_mcp"
---

# google-workspace-mcp

**上游仓库**：<https://github.com/taylorwilsdon/google_workspace_mcp>

Google Workspace MCP 服务器：Gmail/日历/文档/表格/云盘/聊天/通讯录/幻灯片/任务/表单。FastAPI 服务入口 [fastmcp_server.py](fastmcp_server.py)，各组件模块在根目录（gcalendar/gdocs/...），部署见 [README.md](README.md)。

## 集成说明（本库维护）

- 集成日期：2026-10-10；来源：Agent Skills Hub 热门场景榜单（对应场景实测首选）。
- 瘦身剔除：tests/、CONTRIBUTING；保留全部组件模块与部署配置。
