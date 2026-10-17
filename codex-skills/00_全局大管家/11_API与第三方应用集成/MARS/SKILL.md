---
name: MARS
description: "MARS-Curiosity：用 Delphi 构建 REST 服务、客户端与 MCP 服务器的开源库。包含 Delphi REST API、项目脚手架和 MCP 发布的作者技能。"
metadata:
  upstream: github.com/andrea-magni/MARS
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# MARS

MARS-Curiosity 是面向 Delphi 的声明式 REST 服务与客户端库，支持 JWT、OpenAPI、SSE、数据集访问，以及把 Delphi 方法暴露为 MCP 工具、资源和提示。

## 何时使用

适用任务：Delphi REST API、MARS-Curiosity 项目脚手架、JWT/OpenAPI 接入，以及在 Delphi 中实现 MCP 服务器。
相关检索词：MARS-Curiosity、Delphi REST、Delphi MCP。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `Skills/mars-development/SKILL.md` — **mars-development**：Develop REST APIs with MARS-Curiosity (Delphi REST library) - writing resources (the primary, JAX-RS style model) and, as an additional option, route-based endpoints (Express style, MARS.Core.Routes, middlewares), REST …
- `Skills/mars-mcp-server/SKILL.md` — **mars-mcp-server**：Build MCP (Model Context Protocol) servers in Delphi with MARS-Curiosity, so AI agents (Claude, ChatGPT, Open WebUI/Ollama, MCP Inspector) can discover and call Delphi code as tools, read MCP resources, use MCP prompts …
- `Skills/mars-new-project/SKILL.md` — **mars-new-project**：Scaffold a new REST server project with MARS-Curiosity (Delphi REST library). Use this skill whenever the user wants to create, bootstrap, or set up a new MARS server, a new Delphi REST API/server/microservice/web servi…

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `docs/`
- `Skills/`

## 上游

- https://github.com/andrea-magni/MARS
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
