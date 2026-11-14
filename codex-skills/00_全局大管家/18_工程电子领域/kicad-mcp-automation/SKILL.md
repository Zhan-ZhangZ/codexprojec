---
name: kicad-mcp-automation
description: "KiCad MCP 自动化服务。通过自然语言或 CLI 管理工程、运行 ERC/DRC、维护元器件，并导出 BOM、Gerber、钻孔文件和 3D 模型。"
metadata:
  upstream: github.com/muammar-yacoob/kicad-mcp
  entrypoint: managed-v2
  entrypoint_kind: mcp
---

<!-- codex-skills-managed-entrypoint:v2 -->
# kicad-mcp-automation

这是一个用于 KiCad 的 MCP 服务，可管理工程与元器件、运行电气规则和设计规则检查，并导出 BOM、Gerber、钻孔文件及制造资料。

## 何时使用

适用任务：初始化 KiCad 工程、检查 ERC/DRC、管理元器件、生成 BOM 或导出制造文件。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 执行

1. 读取与本任务直接相关的 README、安装说明和入口文件，确认所需运行时、权限与配置。
2. 按仓库当前文档启动或接入 MCP 服务，核对实际工具名和参数；不要凭项目简介编造工具。
3. 先用一个只读、最小请求验证连接，再执行用户要求的操作。凭据只从环境或安全配置读取，不写进技能文件。

## 本地入口

- `README.md`
- `package.json`
- `requirements.txt`
- `docs/`

## 上游

- https://github.com/muammar-yacoob/kicad-mcp
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
