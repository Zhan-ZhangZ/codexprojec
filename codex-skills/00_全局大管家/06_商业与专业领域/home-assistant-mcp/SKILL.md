---
name: home-assistant-mcp
description: "Home Assistant MCP 服务。通过 stdio 或 SSE 连接，让智能体查询和控制系统中的实体、服务、历史与自动化。"
metadata:
  upstream: github.com/oleander/home-assistant-mcp-server
  entrypoint: managed-v2
  entrypoint_kind: mcp
---

<!-- codex-skills-managed-entrypoint:v2 -->
# home-assistant-mcp

这是一个连接 Home Assistant 实例的 MCP 服务。它支持 stdio 和 SSE 传输，可查询实体状态、调用服务、读取历史记录并辅助验证自动化行为。该项目不是 Home Assistant 官方项目。

## 何时使用

适用任务：查询智能家居实体、调用 Home Assistant 服务、读取历史记录或验证自动化规则。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 执行

1. 读取与本任务直接相关的 README、安装说明和入口文件，确认所需运行时、权限与配置。
2. 按仓库当前文档启动或接入 MCP 服务，核对实际工具名和参数；不要凭项目简介编造工具。
3. 先用一个只读、最小请求验证连接，再执行用户要求的操作。凭据只从环境或安全配置读取，不写进技能文件。

## 本地入口

- `README.md`
- `package.json`
- `docs/`

## 上游

- https://github.com/oleander/home-assistant-mcp-server
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
