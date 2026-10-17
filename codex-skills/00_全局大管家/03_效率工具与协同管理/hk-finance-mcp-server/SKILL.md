---
name: hk-finance-mcp-server
description: "香港公开财经数据 MCP 服务器。通过 FastMCP 查询商业登记、负资产按揭、信用卡贷款、HIBOR、印花税、银行网点、ATM、按揭与反欺诈告示等 HKMA/IRD 数据。"
metadata:
  upstream: github.com/hkopenai/hk-finance-mcp-server
  entrypoint: managed-v2
  entrypoint_kind: mcp
---

<!-- codex-skills-managed-entrypoint:v2 -->
# hk-finance-mcp-server

这个 MCP 服务器把香港金管局和税务局公开数据封装成工具，覆盖商业登记、负资产住宅按揭、信用卡贷款调查、硬币车、挂失热线、HKMA 招标、HIBOR、ATM、银行网点、诈骗银行网站和印花税统计。

## 何时使用

- 查询香港商业登记、HIBOR、印花税或按揭统计数据。
- 查找银行网点、ATM 或信用卡挂失热线。
- 查询 HKMA 招标信息或已通报的欺诈银行网站。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 执行

1. 读取与本任务直接相关的 README、安装说明和入口文件，确认所需运行时、权限与配置。
2. 按仓库当前文档启动或接入 MCP 服务，核对实际工具名和参数；不要凭项目简介编造工具。
3. 先用一个只读、最小请求验证连接，再执行用户要求的操作。凭据只从环境或安全配置读取，不写进技能文件。

## 本地入口

- `README.md`
- `pyproject.toml`
- `hkopenai/`

## 上游

- https://github.com/hkopenai/hk-finance-mcp-server

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
