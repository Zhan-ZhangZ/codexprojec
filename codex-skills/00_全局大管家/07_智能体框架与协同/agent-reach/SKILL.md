---
name: agent-reach
description: 免 API 密钥的 16+ 平台数据抓取与 Exa 搜索工具。支持获取推特、小红书、微博、YouTube等媒体的内容与字幕。Leading Words: 免API密钥数据抓取, Exa平台内容获取, 推特小红书搜索, YouTube字幕提取
---

# Agent-Reach 🌐

Give AI agents direct, unified access to real-time internet data and 16+ major social/video/forum platforms without requiring official API tokens.

## 核心法则 (Golden Rules)
> [!IMPORTANT]  
> **绝对禁止**在未阅读 README.md 的情况下尝试调用此工具！
> 1. 新版本（1.5.0+）的 `agent-reach` 已经由“直接爬虫”演变为“底层环境路由管家”。
> 2. **不要**使用已被废弃的 `agent-reach xhs` 或类似直连命令。

## ⚙️ 轨迹驱动执行引擎 (Execution Trajectory)

### State 1: 知识装载 (Read Docs)
- 立刻通过 `view_file` 工具完整查阅当前目录下的 `README.md`，理解最新的调用链条。

### State 2: 诊断与安装 (Doctor & Install)
- 对于绝大部分免配置平台（如网页、YouTube、RSS、Exa 全网搜索），直接按照 README 指导，在 Agent 终端调用对应的底层工具命令（例如 `yt-dlp`, `curl`, `feedparser`）。
- 对于需要环境或登录的复杂平台（如小红书、Twitter）：
  1. 使用命令 `agent-reach install` 初始化依赖。
  2. 使用 `agent-reach doctor` 检查对应渠道（如 `xiaohongshu`）当前生效的后端（如 `OpenCLI` 或 `xhs-cli`）。
  
### State 3: 工具挂载与提取 (Execute Tooling)
- 根据 doctor 指示，唤醒对应的独立后端。
- 小红书抓取示例：不使用本仓库命令，而是按 README 中所说“告诉 Agent 帮我配小红书”，然后根据提示走 `xiaohongshu-mcp` 或 `OpenCLI` 的流程。

## 异常处理模式
- 若遇到 `agent-reach: error: argument command: invalid choice`，说明你使用了废弃的 API。返回 State 1 阅读 README！
- 若在执行平台独立工具时报错，尝试通过 `agent-reach install --env=auto` 修复依赖。
