# MCP 客户端接入指南

本文说明如何把 Telegram Account MCP 接入 OpenClaw、mcporter、Claude Desktop、Codex 或其他 MCP 客户端。

本项目来自 vibecoding 式的实际需求迭代：先把个人 Telegram 账号能力封装为可用 MCP，再逐步补齐部署、权限、工具说明和 agent 工作流。它面向本地或私有环境使用，不是公开 SaaS。

阅读本文前，请先完成根目录 [README.md](../README.md) 中的部署和登录步骤，确保：

- PostgreSQL 已启动。
- Telegram 账号已经通过 `python -m tg_mcp auth` 登录。
- HTTP MCP 服务已经启动，或你准备使用 stdio 模式。

如果你还不熟悉 Docker，先看 README 中的“Docker 新手先看这一段”。当前项目已经发布 Docker Hub 镜像 `aichishutiao/telegram-mcp:latest`，普通部署会直接拉取该镜像；开发或二次修改时仍可通过 `docker-compose.build.yml` 使用本地构建。

## 一、先理解 MCP 地址

Docker Compose 部署后，服务内部监听：

```text
0.0.0.0:8000/mcp
```

宿主机映射端口：

```text
http://localhost:18070/mcp
```

不同运行环境里，MCP 客户端应该使用不同地址：

| 客户端所在位置 | 应使用的地址 | 说明 |
|---|---|---|
| 和 MCP 服务都在宿主机 | `http://localhost:18070/mcp` | 最常见的本机调试方式 |
| Docker Desktop 容器访问宿主机 | `http://192.168.65.254:18070/mcp` | macOS Docker Desktop 常用宿主机网关 |
| 和 MCP 服务在同一个 Docker Compose 网络 | `http://telegram-mcp:8000/mcp` | 使用 Compose service name |
| 远程服务器上的服务 | `http://服务器IP:18070/mcp` | 需要确认防火墙和安全策略 |

注意：直接用浏览器打开 `/mcp`，或者普通 `curl http://localhost:18070/mcp`，可能返回：

```text
406 Not Acceptable
```

这是正常的。MCP Streamable HTTP 需要客户端带特定协议头，不是普通网页接口。

## 二、OpenClaw / mcporter 接入

如果 OpenClaw 运行在 Docker 容器中，并且 MCP 服务部署在宿主机，建议使用：

```text
http://192.168.65.254:18070/mcp
```

配置示例：

```json
{
  "mcpServers": {
    "telegram-account": {
      "baseUrl": "http://192.168.65.254:18070/mcp"
    }
  }
}
```

如果 OpenClaw 和 `telegram-mcp` 在同一个 Docker 网络中，使用：

```json
{
  "mcpServers": {
    "telegram-account": {
      "baseUrl": "http://telegram-mcp:8000/mcp"
    }
  }
}
```

如果 OpenClaw 直接运行在宿主机，使用：

```json
{
  "mcpServers": {
    "telegram-account": {
      "baseUrl": "http://localhost:18070/mcp"
    }
  }
}
```

配置后重启 OpenClaw 或开启新的 agent 会话，让客户端重新发现 MCP 工具。

建议连接后先让 agent 调用：

```text
tg_mcp_health
tg_get_me
tg_list_chats
```

## 三、Claude Desktop 接入

Claude Desktop 常见方式是 stdio MCP，也就是 Claude 用本地命令启动服务。

前提：

- 本机已安装 uv。
- 项目目录可访问。
- `.env` 已配置。
- PostgreSQL 可访问。
- Telegram 账号已完成 `auth` 登录。

如果 PostgreSQL 由 Docker Compose 提供，而 Claude Desktop 在宿主机运行，`.env` 中的数据库地址要使用 `localhost`：

```env
DATABASE_URL=postgresql+asyncpg://telegram_mcp:telegram_mcp@localhost:5432/telegram_mcp
```

Claude Desktop 配置示例：

```json
{
  "mcpServers": {
    "telegram-account": {
      "command": "uv",
      "args": [
        "run",
        "python",
        "-m",
        "tg_mcp",
        "serve",
        "--transport",
        "stdio"
      ],
      "cwd": "/absolute/path/to/Telegram-MCP"
    }
  }
}
```

请把 `cwd` 改成你的仓库绝对路径。

## 四、Codex 或其他支持 HTTP MCP 的客户端

如果客户端支持 HTTP MCP，优先使用 HTTP 方式：

```text
http://localhost:18070/mcp
```

如果客户端运行在 Docker 容器里，按实际网络环境选择：

```text
http://192.168.65.254:18070/mcp
```

或：

```text
http://telegram-mcp:8000/mcp
```

连接成功后，客户端应该能发现一组 `tg_*` 工具。

## 五、只用 stdio 启动

stdio 模式适合不想暴露 HTTP 端口的场景。启动命令：

```bash
uv run python -m tg_mcp serve --transport stdio
```

stdio 模式不会监听端口，MCP 客户端通过标准输入输出和服务通信。

## 六、远程服务器部署时的接入建议

如果把服务部署在远程服务器，MCP 地址可能类似：

```text
http://203.0.113.10:18070/mcp
```

建议：

- 不要把 MCP 服务直接暴露到公网给所有人访问。
- 优先通过 VPN、内网、SSH 隧道或反向代理鉴权访问。
- 妥善保护 `.env`、Telegram API 凭据和 `SESSION_ENCRYPTION_KEY`。
- 定期查看日志，确认没有异常调用。

SSH 隧道示例：

```bash
ssh -L 18070:127.0.0.1:18070 user@your-server
```

然后本机客户端使用：

```text
http://localhost:18070/mcp
```

## 七、连接后验证流程

让 agent 依次调用：

```text
tg_mcp_health
```

预期返回：

```json
{
  "ok": true,
  "data": {
    "database": "ok",
    "telegram_session": "present"
  }
}
```

然后调用：

```text
tg_get_me
```

确认返回的是你希望操作的 Telegram 账号。

再调用：

```text
tg_list_chats
```

确认能看到私聊、群组、频道。

## 八、客户端使用建议

给 agent 的系统提示或项目说明中，建议加入：

```text
你可以使用 Telegram Account MCP 操作 Telegram。开始任何 Telegram 任务前，先调用 tg_mcp_health。需要发送、转发、编辑、删除、置顶、评论、创建群组或退出群组时，必须先调用 tg_prepare_* 获取 confirmation_token，再调用 tg_confirm_action 执行。chat_id 必须来自 tg_list_chats、tg_search_messages 或用户明确提供，message_id 必须来自 tg_read_messages 或 tg_search_messages。
```

完整 agent 规则见 [../AGENTS.md](../AGENTS.md)。

另外建议在 agent 规则中明确：不要使用本 MCP 执行快速群发、骚扰、刷屏、规避群组规则等行为。Telegram 会对异常消息行为触发平台风控，可能导致账号被限流、冻结或封禁。

## 九、常见问题

| 问题 | 原因 | 处理 |
|---|---|---|
| 客户端找不到工具 | MCP 地址错、服务未启动、客户端未刷新 | 检查 `docker compose ps`，重启客户端会话 |
| `/mcp` 返回 406 | 用普通 HTTP GET 访问 MCP 端点 | 使用真正的 MCP 客户端连接 |
| `telegram_session` 是 `missing` | 还没有登录 Telegram 账号 | 执行 `docker compose run --rm telegram-mcp uv run python -m tg_mcp auth` |
| 容器里访问 `localhost` 失败 | 容器的 localhost 指向自己 | 使用 `192.168.65.254` 或同网络服务名 |
| `chat_id` 找不到 | agent 编造了 ID 或会话不在列表里 | 先调用 `tg_list_chats` 或 `tg_search_messages` |
| 写操作没有执行 | 只调用了 prepare，没有 confirm | 使用返回的 `confirmation_token` 调用 `tg_confirm_action` |
| token 过期 | 超过确认时间 | 重新调用对应 `tg_prepare_*` |
