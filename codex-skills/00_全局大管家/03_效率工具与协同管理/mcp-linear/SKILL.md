---
name: mcp-linear
description: 基于 MCP 协议的 Linear 服务。将 Linear 的底层 API 包装为自然语言可调用的 MCP 工具集，适用于解耦的智能体挂载使用。Leading Words: MCP Linear接口, 自然语言项目流转, MCP状态管理
version: 1.4.3
---

# mcp-linear

`tacticlaunch/mcp-linear`：Linear GraphQL API 的 MCP 服务器实现，让 AI 助手用自然语言驱动 Linear 项目管理——issue/cycle/project/team/label 全对象读写，含 webhook 与 OAuth 应用管理。

## 规模与鉴权

- **215 个已实现工具**（另有 42 个规划中），逐工具状态与签名见 [references/TOOLS.md](references/TOOLS.md)
- **个人 API Key**（默认）：Linear 设置 → Security & access → Personal API Keys 生成；支持常规工具，不能调用 alpha 托管子 OAuth 应用 API
- **OAuth 访问令牌**：`LINEAR_OAUTH_ACCESS_TOKEN`，用于创建/管理子 OAuth 应用（`linear_generateOAuthApplicationSetup` 等仍可预备清单）

## 安装（用户侧）

```bash
npx add-mcp @tacticlaunch/mcp-linear --env LINEAR_API_TOKEN=YOUR_LINEAR_API_TOKEN
# 或全局安装
npm install -g @tacticlaunch/mcp-linear
```

Claude Desktop / Cline 等 JSON 配置形态见 [references/README.md](references/README.md) Installation 节。

## 参考文档索引

- [references/README.md](references/README.md) — 上游总说明（鉴权/安装/验证）
- [references/TOOLS.md](references/TOOLS.md) — 215 已实现 + 42 规划工具目录与实现指南
- [references/DEVELOPMENT.md](references/DEVELOPMENT.md) — 开发与贡献指南
- [references/glama.json](references/glama.json) — MCP 注册表元数据
- [references/LICENSE.md](references/LICENSE.md) — 许可证

> 用户经 npm 安装运行，本库只携文档层；`src/`、`scripts/`、测试与构建配置未随库分发，需要时访问 [上游仓库](https://github.com/tacticlaunch/mcp-linear/tree/v1.4.3)。
