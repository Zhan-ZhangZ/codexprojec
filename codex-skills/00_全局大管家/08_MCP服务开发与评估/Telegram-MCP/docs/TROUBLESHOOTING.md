# 故障排查

本文整理部署和使用 Telegram Account MCP 时常见的问题。排查时建议先确认三个基础状态：

```bash
docker compose ps
docker compose logs -f telegram-mcp
```

然后让 MCP 客户端调用：

```text
tg_mcp_health
tg_get_me
tg_list_chats
```

## 一、部署阶段问题

### 不知道镜像从哪里来

当前项目已经发布 Docker Hub 镜像。普通部署时，`docker-compose.yml` 会拉取：

```bash
docker pull aichishutiao/telegram-mcp:latest
```

也可以直接启动服务，Docker Compose 会自动拉取：

```bash
docker compose up -d telegram-mcp
```

如果你修改了代码，想使用本地构建版本，则执行：

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml build telegram-mcp
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d telegram-mcp
```

本地构建依据是仓库根目录的 `Dockerfile`，构建出来的本地镜像名是：

```text
telegram-account-mcp:local
```

查看本机是否已经有镜像：

```bash
docker images aichishutiao/telegram-mcp
docker images telegram-account-mcp
```

### 分不清 build、image、container

可以这样理解：

| 概念 | 在本项目里是什么 | 说明 |
|---|---|---|
| `Dockerfile` | 根目录的 `Dockerfile` | 制作镜像的说明书 |
| image | `aichishutiao/telegram-mcp:latest` | 默认使用的 Docker Hub 镜像 |
| local image | `telegram-account-mcp:local` | 二次开发时本地构建出来的镜像 |
| container | `telegram-account-mcp` | 正在运行的 MCP 服务实例 |
| postgres container | `telegram-mcp-postgres` | 正在运行的数据库 |

常用命令：

```bash
docker compose up -d postgres       # 启动数据库容器
docker compose up -d telegram-mcp   # 启动 MCP 容器
docker compose ps                   # 查看容器状态
docker images aichishutiao/telegram-mcp  # 查看 Docker Hub 镜像是否已拉取
```

### PostgreSQL 没有启动

现象：

- `telegram-mcp` 启动失败。
- 日志里出现数据库连接错误。
- `tg_mcp_health` 返回数据库错误。

处理：

```bash
docker compose up -d postgres
docker compose ps
```

确认 `telegram-mcp-postgres` 为 `healthy` 后，再启动 MCP：

```bash
docker compose up -d telegram-mcp
```

### `.env` 没有配置

现象：

- 服务启动时报环境变量缺失。
- 登录命令无法读取 Telegram API 凭据。

处理：

```bash
cp .env.example .env
```

然后填写：

```env
TELEGRAM_API_ID=你的_api_id
TELEGRAM_API_HASH=你的_api_hash
SESSION_ENCRYPTION_KEY=你的_Fernet_key
```

### `SESSION_ENCRYPTION_KEY` 格式错误

现象：

- session 加密或解密失败。
- 日志里出现 Fernet key 相关错误。

处理：

重新生成密钥：

```bash
uv run --with cryptography python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

把输出写入 `.env`：

```env
SESSION_ENCRYPTION_KEY=生成出的完整字符串
```

如果之前已经用旧密钥登录过 Telegram，换密钥后旧 session 将无法解密，需要重新执行登录。

## 二、Telegram 登录问题

### 收不到 login code

Telegram 通常把 login code 发到已登录的 Telegram 客户端，而不是短信。请检查：

- 手机 Telegram。
- 桌面 Telegram。
- Telegram 官方服务通知。

如果多次尝试失败，等待一段时间再重试，避免触发 Telegram 登录频率限制。

### `api_id` / `api_hash` 无效

现象：

- 登录时报 `ApiIdInvalidError`。
- 发送验证码失败。

处理：

重新打开：

```text
https://my.telegram.org/apps
```

确认 `.env` 中的 `TELEGRAM_API_ID` 和 `TELEGRAM_API_HASH` 与网页展示完全一致。`api_id` 是数字，`api_hash` 是字符串。

### 账号开启了两步验证

如果账号开启 2FA，登录命令会要求输入两步验证密码。这里不是短信验证码，也不是 Telegram login code，而是你为 Telegram 账号设置的云密码。

## 三、MCP 连接问题

### 浏览器访问 `/mcp` 返回 406

这是正常现象。MCP Streamable HTTP 不是普通网页接口，浏览器直接访问不会带协议头。

请使用支持 MCP 的客户端连接，例如 OpenClaw、mcporter、Claude Desktop 或其他 MCP 客户端。

### 客户端找不到工具

可能原因：

- MCP 服务没有启动。
- MCP 地址写错。
- 客户端在 Docker 容器里，却使用了 `localhost`。
- 客户端没有重启或刷新 MCP 工具列表。

处理：

```bash
docker compose ps
docker compose logs -f telegram-mcp
```

地址选择：

| 场景 | 地址 |
|---|---|
| 宿主机客户端 | `http://localhost:18070/mcp` |
| Docker Desktop 容器访问宿主机 | `http://192.168.65.254:18070/mcp` |
| 同一 Docker 网络 | `http://telegram-mcp:8000/mcp` |

### `telegram_session` 是 `missing`

说明数据库里没有可用 Telegram session。执行：

```bash
docker compose run --rm telegram-mcp uv run python -m tg_mcp auth
```

登录成功后重启 MCP 服务：

```bash
docker compose restart telegram-mcp
```

## 四、工具调用问题

### 找不到 chat

不要让 agent 自己猜 `chat_id`。应先调用：

```text
tg_list_chats
```

如果会话很多，可以提高 `limit`。如果用户只提供关键词，可以调用：

```text
tg_search_messages
```

### 找不到 message

`message_id` 应来自：

```text
tg_read_messages
tg_search_messages
```

不要手写或猜测消息 ID。

### 写操作没有执行

写操作分两步：

```text
tg_prepare_*
tg_confirm_action
```

只调用 `tg_prepare_*` 不会真正写入 Telegram。需要使用返回的 `confirmation_token` 调用 `tg_confirm_action`。

### token 过期

默认确认 token 10 分钟过期。过期后重新调用对应的 `tg_prepare_*` 即可。

可以通过 `.env` 调整：

```env
TG_MCP_CONFIRMATION_TTL_SECONDS=600
```

## 五、Telegram 平台限制

### 转发失败

Telegram 可能禁止转发某些消息，例如：

- 受保护内容。
- 服务通知。
- 来自限制转发的频道或群组。
- 当前账号无权限访问的消息。

这种情况不是 MCP 一定有问题。可以向用户说明平台限制，并在用户同意时改用复制文本发送。

### 频道评论失败

频道消息评论依赖 Telegram 的 discussion/comment 机制。失败原因可能包括：

- 频道没有开启评论区。
- 当前账号没有评论权限。
- 消息不允许评论。
- 账号被限制发言。

### 账号触发风控

不要使用本项目进行快速群发、骚扰、刷屏、营销轰炸或规避 Telegram 群组规则。Telegram 可能对异常行为触发风控，包括：

- 私聊受限。
- 群组发言受限。
- 需要重新验证账号。
- 临时冻结。
- 永久封禁。

即使 MCP 工具可以调用，也不代表 Telegram 平台允许该行为。
