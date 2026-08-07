---
name: zlibrary-mcp
description: Z-Library 图书检索与下载 MCP 服务。提供基于 Z-Library 的电子书资源搜索与下载能力。
---

# Z-Library MCP 服务集成指南

**⚠️ 强制前置要求 (Prerequisite)**:
在执行任何操作前，**必须首先使用 `view_file` 或 `read_url_content` 阅读本目录下的 `README.md`**，以全面掌握 MCP 服务的参数配置、环境变量要求及启动方式。

## 1. 核心法则 (Golden Rules)
- **环境安全**：确保所有环境变量（如 API Keys、账号信息等）的安全，不得将敏感信息直接硬编码或打印到输出。
- **职责单一**：本技能专门处理 Z-Library 的电子书检索与下载任务。
- **优雅降级**：如果 Z-Library 接口请求受限或失败，必须向用户提供明确的错误说明及后续建议。

## 2. 轨迹驱动执行引擎 (Execution Trajectory)
- **State 0: 需求分析** - 明确用户所需的电子书名称、作者或 ISBN。
- **State 1: 配置检查** - 检查当前环境中是否已配置该 MCP 服务所需的必要环境变量或前置依赖。
- **State 2: 服务调用** - 通过 MCP 接口或指定的命令调用 `zlibrary-mcp` 的搜索和下载功能。
- **State 3: 结果返回** - 将下载的资源路径或搜索结果清晰地呈现给用户。

## 3. 异常处理模式 (Exception Handling)
- **依赖缺失**：如检测到缺失必要的依赖包（如 Node.js 或特定 npm 包），主动提示用户安装。
- **网络异常**：如 Z-Library 访问不通，建议用户检查网络连通性或提供备用搜索方案。
