---
name: arduino-cli-mcp
description: "Arduino CLI 的 MCP 集成。用于编译本地工程、管理开发板与库依赖，并完成 ESP8266、ESP32 或 Arduino 固件烧录和串口调试。"
metadata:
  upstream: github.com/Oliver0804/arduino-cli-mcp
  entrypoint: managed-v2
  entrypoint_kind: mcp
---

<!-- codex-skills-managed-entrypoint:v2 -->
# arduino-cli-mcp

这是一个封装 Arduino CLI 的 MCP 服务，可编译本地工程、管理开发板包与库依赖，并执行固件烧录和串口通信。它不是 Arduino 官方发布的 MCP 服务。

## 何时使用

适用任务：Arduino/ESP 工程编译、开发板与库管理、固件烧录或串口调试。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 执行

1. 读取与本任务直接相关的 README、安装说明和入口文件，确认所需运行时、权限与配置。
2. 按仓库当前文档启动或接入 MCP 服务，核对实际工具名和参数；不要凭项目简介编造工具。
3. 先用一个只读、最小请求验证连接，再执行用户要求的操作。凭据只从环境或安全配置读取，不写进技能文件。

## 本地入口

- `README.md`
- `README_zh.md`
- `INSTALLATION.md`
- `pyproject.toml`

## 上游

- https://github.com/Oliver0804/arduino-cli-mcp
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
