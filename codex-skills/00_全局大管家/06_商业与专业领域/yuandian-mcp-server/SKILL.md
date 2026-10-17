---
name: yuandian-mcp-server
description: "华宇元典法律数据 MCP 服务。用于检索法律法规、裁判文书与企业工商信用信息，辅助法律检索、商业背调和合规审查。"
metadata:
  upstream: github.com/yuandian-ailaw/yuandian-mcp-server
  entrypoint: managed-v2
  entrypoint_kind: mcp
---

<!-- codex-skills-managed-entrypoint:v2 -->
# yuandian-mcp-server

这是一个连接华宇元典法律数据服务的 MCP，可检索法律法规、裁判文书与企业工商信用信息，辅助法律研究、商业背调和合规审查。

## 何时使用

适用任务：法律法规检索、裁判文书查询、企业工商信息获取、商业背调或合规审查。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 执行

1. 读取与本任务直接相关的 README、安装说明和入口文件，确认所需运行时、权限与配置。
2. 按仓库当前文档启动或接入 MCP 服务，核对实际工具名和参数；不要凭项目简介编造工具。
3. 先用一个只读、最小请求验证连接，再执行用户要求的操作。凭据只从环境或安全配置读取，不写进技能文件。

## 本地入口

- `README.md`
- `README_EN.md`
- `package.json`

## 上游

- https://github.com/yuandian-ailaw/yuandian-mcp-server
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
