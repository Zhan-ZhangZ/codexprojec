---
name: ha-mcp-python
description: Home Assistant 极客版智能家居自动化 YAML 注入引擎 (MCP)。赋予大模型接管全局设备的权限。可读取异构传感器状态，全自动编排与调试复杂的智能场景 YAML 剧本。Leading Words: HA智能家居全局接管, 异构传感器状态读取, 自动化YAML剧本编排, 智能场景调试网关
version: 8.4.0
---

# ha-mcp-python

`homeassistant-ai/ha-mcp`：非官方 Home Assistant MCP 服务器（88 工具目录），让 Agent 全局接管智能家居——读取异构传感器状态、编排自动化 YAML、管理仪表盘/助手/备份。

## 安装形态（用户侧）

- **推荐：Home Assistant 应用（add-on）** 一键安装，streamable HTTP 传输
- **自定义组件 `ha_mcp_tools`**：文件与 YAML 服务直通（见 references/README.md「Custom Component」节）
- **stdio 仅建议演示**：已知传输问题（#1713），正式环境用组件或 HTTP
- **演示服务器**：Windows/macOS/Linux 一条命令连官方托管演示环境，无需自有 HA
- **Setup Wizard**：15+ 客户端配置向导

## 工具面与技能资源

- 完整工具目录 **88 个**；默认经 `tools/list` 列出 ~84 个，对有工具数上限的客户端自动收敛到 ~10 个核心集 + `ha_search` 搜索式发现（小模型/Ollama 友好）
- **内置 Agent Skills**：`homeassistant-ai/skills` 以 `skill://` MCP 资源形式捆绑分发；工具型客户端经多态 `ha_get_skill_guide`（必选工具，不可禁用）列出/读取——教 Agent 用原生构造而非 Jinja2 变通、选对 helper 类型、安全重构

## v8.4.0 要点（2026-08-29）

- **search**：用 HA 引用图做实体依赖发现、显式实体成员关系
- **bulk**：确定性结构化选择器；**screenshot** 报告主题变更而非回写
- 修复：仪表盘截图自定义尺寸、分页 journald 错误日志窗口、Supervisor 日志/错误载荷限界、环回 MCP 会话超时
- 韩语/克林贡本地化；完整历史见 [references/CHANGELOG.md](references/CHANGELOG.md)

## 参考文档索引

- [references/README.md](references/README.md) — 上游总说明（安装矩阵/功能对照/工具发现）
- [references/CHANGELOG.md](references/CHANGELOG.md) — 变更史
- [references/docs/](references/docs/) — FAQ、OAuth/OIDC、Windows/macOS uv 指南、进程内服务器、beta/dev 通道
- [references/docs/superpowers/](references/docs/superpowers/) — 设计规格与实施计划
- [references/server.json](references/server.json) / [references/fastmcp.json](references/fastmcp.json) 等 — MCP 服务器清单
- [references/PRIVACY.md](references/PRIVACY.md)、[references/SECURITY.md](references/SECURITY.md)、[references/LICENSE](references/LICENSE)

> 上游为 HA add-on + 自定义组件 + PyPI `ha-mcp` 三形态分发；`src/`、`tests/`、`custom_components/`、add-on 打包与 `site/` 文档站未随库分发（docs/img/demo.webp 5.4M 演示动画亦剔除，走 GitHub 链接），需要时访问 [上游仓库](https://github.com/homeassistant-ai/ha-mcp/tree/v8.4.0)。
