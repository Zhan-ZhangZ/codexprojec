---
name: mcp2serial
description: "TTY / COM 物理串口穿透式数据监听与控制台桥接器
  (MCP)。赋予大模型直接操作宿主机裸串口的能力，通过波特率握手实现与树莓派 Pico、ESP32 或工业级 PLC 的双向字节流通信与 REPL
  会话。Leading Words: 物理串口穿透监听, TTY/COM底层通信, REPL双向字节流, 裸板卡控制台桥接"
metadata:
  upstream: github.com/mcp2everything/mcp2serial
  entrypoint: managed-v2
  entrypoint_kind: mcp
---

<!-- codex-skills-managed-entrypoint:v2 -->
# mcp2serial

TTY / COM 物理串口穿透式数据监听与控制台桥接器 (MCP)。赋予大模型直接操作宿主机裸串口的能力，通过波特率握手实现与树莓派 Pico、ESP32 或工业级 PLC 的双向字节流通信与 REPL 会话。

## 何时使用

适用任务：TTY / COM 物理串口穿透式数据监听与控制台桥接器 (MCP)。赋予大模型直接操作宿主机裸串口的能力，通过波特率握手实现与树莓派 Pico、ESP32 或工业级 PLC 的双向字节流通信与 REPL 会话。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 执行

1. 读取与本任务直接相关的 README、安装说明和入口文件，确认所需运行时、权限与配置。
2. 按仓库当前文档启动或接入 MCP 服务，核对实际工具名和参数；不要凭项目简介编造工具。
3. 先用一个只读、最小请求验证连接，再执行用户要求的操作。凭据只从环境或安全配置读取，不写进技能文件。

## 本地入口

- `README.md`
- `README_EN.md`
- `README_PYPI.md`
- `pyproject.toml`
- `docs/`

## 上游

- https://github.com/mcp2everything/mcp2serial
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
