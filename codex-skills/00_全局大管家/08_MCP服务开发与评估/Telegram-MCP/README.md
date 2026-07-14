# Telegram Account MCP

Telegram Account MCP 是一个把**个人 Telegram 账号**封装成 MCP 服务的项目。部署完成后，OpenClaw、Claude Desktop、Codex 或其他支持 MCP 的 AI agent 可以通过标准 MCP 工具读取 Telegram 会话、搜索消息、查看联系人，并在授权后发送、转发、编辑、删除、置顶消息或创建群组。

它使用的是 Telegram 官方 MTProto API，也就是 `my.telegram.org/apps` 里创建的 `api_id` 和 `api_hash`。这和 Telegram Bot API 不同：Bot API 只能操作机器人账号，而本项目操作的是你自己的 Telegram 个人账号。

本项目是通过 vibecoding 方式从实际需求中迭代出来的工具项目，目标是把可用能力沉淀成一个清晰、可部署、可被 agent 调用的 MCP 服务。请在使用前认真阅读安全边界和 Telegram 平台限制。

## 适合什么场景

- 想让 AI agent 查询个人 Telegram 里的聊天、群组、频道和联系人。
- 想让 OpenClaw、Claude Desktop、Codex 等工具通过 MCP 统一调用 Telegram。
- 想把 Telegram 个人账号做成一个可本地部署、可 Docker 化、可接入多种 agent 的工具服务。
- 想把 Telegram 托管给AI使用，替你操作发送信息、回复信息、统计信息等行为。



## 功能概览

### 读取类能力

- 查看 MCP 服务、数据库和 Telegram session 状态。
- 查看当前登录的 Telegram 账号。
- 列出私聊、群组、超级群、频道。
- 读取指定会话的最近消息。
- 搜索 Telegram 历史消息。
- 查看联系人、文件夹、会话详情、用户详情。

### 写入类能力

写入类能力都走 `prepare -> confirm` 两步机制：

- 发送消息或回复消息。
- 在频道消息下发表评论。
- 转发消息。
- 编辑消息。
- 删除消息。
- 置顶或取消置顶消息。
- 标记会话已读。
- 创建群组。
- 退出群组或频道。

### MCP 接入方式

- HTTP MCP：默认地址 `http://localhost:18070/mcp`。
- stdio MCP：适合 Claude Desktop 等本地命令启动 MCP 的客户端。
- Docker Compose：推荐部署方式，自带 PostgreSQL。

## 项目结构

```text
.
├── tg_mcp/                  # MCP 服务核心代码
│   ├── server.py            # MCP 工具定义
│   ├── tools/telegram.py    # Telegram 操作实现
│   ├── auth.py              # 命令行登录和账号切换
│   ├── context.py           # session 加载、确认 token、权限控制
│   └── db.py                # PostgreSQL session 存储
├── docs/
│   ├── MCP_TOOLS.md         # 每个 MCP 工具的参数和返回结构
│   ├── AGENT_WORKFLOWS.md   # agent 调用工作流
│   └── CLIENT_SETUP.md      # OpenClaw、Claude Desktop 等客户端接入
├── docker-compose.yml       # Docker Compose 部署
├── Dockerfile               # MCP 服务镜像
├── .env.example             # 环境变量示例
└── AGENTS.md                # 给 AI agent 读取的操作规则
```

## 部署方式选择

| 部署方式 | 推荐程度 | 适合谁 | 说明 |
|---|---:|---|---|
| Docker Compose | 推荐 | 大多数用户 | 一条命令启动 PostgreSQL 和 MCP 服务，最省事 |
| 已有 PostgreSQL + 本地运行 | 可选 | 本地开发者 | 复用已有数据库，直接用 `uv run` 启动 |
| stdio MCP | 可选 | Claude Desktop 等本地 MCP 客户端 | 不暴露 HTTP 端口，由客户端拉起命令 |
| 远程服务器部署 | 可选 | 需要给多台机器或 Docker agent 使用 | 和 Docker Compose 类似，但要注意端口、防火墙和密钥保护 |

如果你只是想先跑起来，直接使用 Docker Compose。

## Docker 新手先看这一段

如果你不熟悉 Docker，可以先把本项目理解成两个程序：

1. `postgres`：数据库，用来保存加密后的 Telegram 登录 session。
2. `telegram-mcp`：本项目的 MCP 服务，用来连接 Telegram，并把 Telegram 能力暴露给 agent。

Docker 会把这两个程序分别放进两个容器里运行。你不需要手动安装 PostgreSQL，也不需要手动配置 Python 运行环境。

### 本项目有没有提供现成镜像？

有。默认推荐直接使用 Docker Hub 上的预构建镜像：

```text
docker.io/aichishutiao/telegram-mcp:latest
```

也可以手动拉取：

```bash
docker pull aichishutiao/telegram-mcp:latest
```

同时，仓库仍然保留了本地构建能力：

- 仓库里提供了 `Dockerfile`，它描述如何制作 MCP 服务镜像。
- 普通部署用 `docker-compose.yml`，默认拉取 `aichishutiao/telegram-mcp:latest`。
- 开发或二次修改时，用 `docker-compose.build.yml` 覆盖为本地构建。

`docker-compose.yml` 默认是：

```yaml
telegram-mcp:
  image: aichishutiao/telegram-mcp:latest
```

含义：

- `image: aichishutiao/telegram-mcp:latest`：从 Docker Hub 拉取已经构建好的 MCP 服务镜像。

如果你改了代码，想使用本地构建版本，执行：

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml build telegram-mcp
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d telegram-mcp
```

这会用当前目录的 `Dockerfile` 构建本地镜像 `telegram-account-mcp:local`，并用它启动服务。

如果只是普通部署，不需要构建，直接执行：

```bash
docker compose up -d telegram-mcp
```

Docker Compose 会自动拉取 Docker Hub 镜像。

### Docker 部署时每个文件是干什么的？

| 文件 | 作用 |
|---|---|
| `Dockerfile` | 定义如何构建 MCP 服务镜像 |
| `docker-compose.yml` | 定义要启动哪些容器、端口、数据库、环境变量 |
| `.env` | 保存你的 Telegram API 凭据、session 加密密钥、权限配置 |
| `.env.example` | `.env` 的模板 |

### Docker 部署后会出现哪些东西？

执行成功后，本机 Docker 里会有：

| 类型 | 名称 | 说明 |
|---|---|---|
| 镜像 | `aichishutiao/telegram-mcp:latest` | Docker Hub 上的 MCP 服务镜像 |
| 容器 | `telegram-account-mcp` | MCP 服务容器 |
| 容器 | `telegram-mcp-postgres` | PostgreSQL 数据库容器 |
| 数据卷 | `sovereign-core_pgdata` 或类似名称 | 保存数据库数据，名字取决于目录名 |

端口映射：

```text
宿主机 http://localhost:18070/mcp -> 容器内 http://telegram-mcp:8000/mcp
```

你平时给 OpenClaw、Claude、Codex 等 MCP 客户端填写的是宿主机地址：

```text
http://localhost:18070/mcp
```

如果客户端也在 Docker 容器里，不能直接用 `localhost`，要看 [docs/CLIENT_SETUP.md](docs/CLIENT_SETUP.md) 里的 Docker 网络说明。

### 最短 Docker 部署流程

如果你已经安装好 Docker Desktop，并且已经拿到 Telegram `api_id` / `api_hash`，完整流程就是：

```bash
git clone <your-private-repo-url>
cd Telegram-MCP
cp .env.example .env
```

编辑 `.env`，填入 Telegram API 凭据和 `SESSION_ENCRYPTION_KEY`。

然后执行：

```bash
docker compose up -d postgres
docker compose run --rm telegram-mcp uv run python -m tg_mcp auth
docker compose up -d telegram-mcp
```

三条命令分别表示：

1. 启动数据库。
2. 登录 Telegram 个人账号，把 session 加密写入数据库。
3. 启动 MCP 服务。

以后如果只是重启服务，通常只需要：

```bash
docker compose up -d telegram-mcp
```

如果修改了代码，需要重新构建镜像：

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml build telegram-mcp
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d telegram-mcp
```

## 一、准备工作

### 1. 安装基础软件

本项目需要：

- Docker 和 Docker Compose
- Git
- Python 3.13 或更高版本
- uv

如果只使用 Docker Compose 运行服务，Python 和 uv 主要用于本地生成密钥、开发和测试；容器内部也会使用 uv 启动服务。

### 2. 获取 Telegram API 凭据

打开：

```text
https://my.telegram.org/apps
```

使用你的 Telegram 手机号登录。登录后创建一个应用，表单可以按下面这样填写：

| 字段 | 示例 | 说明 |
|---|---|---|
| App title | `Telegram MCP Local` | 应用名称，自己能识别即可 |
| Short name | `telegrammcplocal` | 5 到 32 位英文或数字 |
| URL | `http://localhost:18070` | 本地部署可以填 localhost |
| Platform | `Desktop` | 本地服务选桌面即可 |
| Description | `Personal Telegram MCP server for local AI agents.` | 简短说明 |

创建成功后会看到：

- `api_id`
- `api_hash`

这两个值要写入 `.env`。不要公开它们。

### 3. 准备 Telegram 登录环境

首次登录时，Telegram 通常会把 login code 发送到你已经登录的 Telegram 客户端，而不是短信。请提前打开手机或桌面 Telegram，确保可以收到官方登录验证码。

如果账号开启了两步验证，登录命令还会要求输入 2FA 密码。

## 二、Docker Compose 部署

这是推荐方式。

### 1. 克隆仓库

```bash
git clone <your-private-repo-url>
cd Telegram-MCP
```

如果你已经在仓库目录中，可以跳过这一步。

### 2. 创建 `.env`

```bash
cp .env.example .env
```

生成 session 加密密钥：

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

如果本机没有安装 `cryptography`，也可以用 uv 临时运行：

```bash
uv run --with cryptography python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

编辑 `.env`：

```env
TELEGRAM_API_ID=你的_api_id
TELEGRAM_API_HASH=你的_api_hash
SESSION_ENCRYPTION_KEY=刚生成的_Fernet_key

DATABASE_URL=postgresql+asyncpg://telegram_mcp:telegram_mcp@postgres:5432/telegram_mcp
TG_MCP_PERMISSION=full_autonomy
TG_MCP_CONFIRMATION_TTL_SECONDS=600
TG_MCP_WRITE_MIN_INTERVAL_SECONDS=3

MCP_HOST=0.0.0.0
MCP_PORT=8000
MCP_HTTP_PATH=/mcp
```

说明：

- `SESSION_ENCRYPTION_KEY` 用来加密 Telegram session，必须妥善保存。
- `.env` 已被 `.gitignore` 忽略，不要提交到 Git。
- Docker Compose 内部使用服务名 `postgres` 连接数据库，所以 `DATABASE_URL` 中的主机名保持 `postgres`。

### 3. 启动数据库

```bash
docker compose up -d postgres
```

查看数据库是否健康：

```bash
docker compose ps
```

你应该看到 `telegram-mcp-postgres` 处于 `healthy` 或 `Up` 状态。

### 4. 登录 Telegram 账号

首次部署必须执行一次登录，把个人账号 session 写入 PostgreSQL：

```bash
docker compose run --rm telegram-mcp uv run python -m tg_mcp auth
```

按提示输入：

1. Telegram 手机号，使用国际格式，例如 `+8613800000000`。
2. Telegram 官方发送到客户端里的 login code。
3. 如果账号开启了 2FA，再输入 2FA 密码。

登录成功后，服务会把 Telethon `StringSession` 加密保存到 PostgreSQL。后续 MCP 服务启动时会自动读取这个 session，不需要每次重新登录。

### 5. 启动 MCP 服务

```bash
docker compose up -d telegram-mcp
```

默认 HTTP MCP 地址：

```text
http://localhost:18070/mcp
```

查看日志：

```bash
docker compose logs -f telegram-mcp
```

### 6. 验证服务

查看容器：

```bash
docker compose ps
```

正常情况下会看到：

- `telegram-mcp-postgres`
- `telegram-account-mcp`

注意：直接用浏览器访问 `http://localhost:18070/mcp` 或执行普通 `curl GET /mcp` 可能返回 `406 Not Acceptable`。这是正常现象，因为 MCP Streamable HTTP 需要客户端带协议头连接。

真正的验证方式是让 MCP 客户端连接后调用：

```text
tg_mcp_health
tg_get_me
tg_list_chats
```

预期：

- `tg_mcp_health` 返回 `ok: true`。
- `telegram_session` 为 `present`。
- `tg_get_me` 能返回当前 Telegram 账号信息。
- `tg_list_chats` 能列出会话。

## 三、切换或重新登录 Telegram 账号

如果你想换一个 Telegram 个人账号，重新执行：

```bash
docker compose run --rm telegram-mcp uv run python -m tg_mcp auth
```

登录成功后，新的 session 会写入数据库。当前版本默认按单账号模式运行，如果数据库中有多个可用 session，建议只保留一个启用账号，或通过环境变量指定：

```env
TG_MCP_USER_ID=目标用户ID
```

## 四、本地开发运行

如果你不想用 Docker 启动 MCP 服务，也可以本地运行。

### 1. 启动 PostgreSQL

可以继续使用 Docker 只启动数据库：

```bash
docker compose up -d postgres
```

此时本机访问数据库的地址是：

```env
DATABASE_URL=postgresql+asyncpg://telegram_mcp:telegram_mcp@localhost:5432/telegram_mcp
```

注意：本地运行时数据库主机名应使用 `localhost`；Docker Compose 服务内部运行时使用 `postgres`。

### 2. 安装依赖

```bash
uv sync
```

### 3. 本地登录账号

```bash
DATABASE_URL=postgresql+asyncpg://telegram_mcp:telegram_mcp@localhost:5432/telegram_mcp uv run python -m tg_mcp auth
```

### 4. 本地启动 HTTP MCP

```bash
DATABASE_URL=postgresql+asyncpg://telegram_mcp:telegram_mcp@localhost:5432/telegram_mcp uv run python -m tg_mcp serve --transport http --host 127.0.0.1 --port 18070 --path /mcp
```

MCP 地址仍是：

```text
http://localhost:18070/mcp
```

## 五、stdio MCP 运行方式

有些客户端不通过 HTTP 连接 MCP，而是通过本地命令启动 MCP 服务。可以使用：

```bash
uv run python -m tg_mcp serve --transport stdio
```

stdio 模式仍然需要可用的 `.env` 和 PostgreSQL。Claude Desktop 的完整配置示例见 [docs/CLIENT_SETUP.md](docs/CLIENT_SETUP.md)。

## 六、接入 AI agent

不同客户端的 MCP 配置方式不同。常用地址如下：

| 场景 | MCP 地址 |
|---|---|
| MCP 客户端和服务都在宿主机 | `http://localhost:18070/mcp` |
| Docker Desktop 容器访问宿主机 MCP | `http://192.168.65.254:18070/mcp` |
| 同一 Docker Compose 网络内访问 | `http://telegram-mcp:8000/mcp` |

OpenClaw / mcporter 示例：

```json
{
  "mcpServers": {
    "telegram-account": {
      "baseUrl": "http://192.168.65.254:18070/mcp"
    }
  }
}
```

更多客户端示例见 [docs/CLIENT_SETUP.md](docs/CLIENT_SETUP.md)。

## 七、写操作安全机制

本项目的写操作不直接执行。agent 必须先准备动作，再确认执行。

这个机制不是为了绕过 Telegram 限制，而是为了降低 agent 误操作风险。Telegram 会对异常行为进行风控，例如短时间大量私聊陌生人、大量群发重复内容、频繁加入或退出群组、刷屏、发送骚扰内容等。即使工具层允许调用，也不代表平台允许这些行为。

例如发送消息：

```text
tg_prepare_send_message(chat_id=123456, text="你好")
```

返回：

```json
{
  "ok": true,
  "data": {
    "confirmation_token": "xxxxxxxx",
    "summary": "向 chat 123456 发送消息: '你好'",
    "expires_at": 1770000000
  }
}
```

确认执行：

```text
tg_confirm_action(confirmation_token="xxxxxxxx")
```

取消执行：

```text
tg_cancel_action(confirmation_token="xxxxxxxx")
```

默认 token 10 分钟过期，可通过 `.env` 调整：

```env
TG_MCP_CONFIRMATION_TTL_SECONDS=600
```

## 八、权限配置

`.env` 中可以设置：

```env
TG_MCP_PERMISSION=full_autonomy
```

可选值：

| 权限 | 能力 |
|---|---|
| `read_only` | 只允许读取 Telegram 数据 |
| `read_write` | 允许发送、回复、转发、编辑、置顶、标记已读等常规写操作 |
| `full_autonomy` | 允许删除消息、创建群组、退出群组等高影响操作 |

即使设置为 `full_autonomy`，写操作仍然需要 `prepare -> confirm`。

## 九、常用运维命令

启动：

```bash
docker compose up -d postgres telegram-mcp
```

停止 MCP 服务但保留数据库：

```bash
docker compose stop telegram-mcp
```

停止全部服务：

```bash
docker compose down
```

查看日志：

```bash
docker compose logs -f telegram-mcp
```

重新构建镜像：

```bash
docker compose build telegram-mcp
```

重新启动 MCP 服务：

```bash
docker compose restart telegram-mcp
```

## 十、常见问题

### 为什么浏览器打开 `/mcp` 是 406？

这是正常的。MCP Streamable HTTP 不是普通网页接口，浏览器直接 GET 不会带 MCP 所需协议头。请使用支持 MCP 的客户端连接。

### 登录验证码收不到怎么办？

Telegram 通常把验证码发到已登录的 Telegram 客户端，不一定发短信。请打开手机或桌面 Telegram 查看官方消息。如果多次失败，等待一段时间再重试，避免触发 Telegram 频率限制。

### 提示 `telegram_session` missing 怎么办？

说明数据库里还没有可用 session。执行：

```bash
docker compose run --rm telegram-mcp uv run python -m tg_mcp auth
```

### Docker 内的 agent 访问 `localhost:18070` 失败怎么办？

容器里的 `localhost` 指向容器自己，不是宿主机。Docker Desktop 可以改用：

```text
http://192.168.65.254:18070/mcp
```

如果在同一个 Compose 网络里，使用：

```text
http://telegram-mcp:8000/mcp
```

### 为什么发送或转发失败？

常见原因：

- 账号没有目标会话权限。
- 目标群组禁止发言。
- 来源消息受 Telegram 限制，不能转发。
- `chat_id` 或 `message_id` 不是从 MCP 返回结果中取得。
- prepare token 已过期。

### 可以用它快速群发消息吗？

技术上 MCP 可以把发送消息能力提供给 agent，但不建议、也不鼓励把它用于快速群发、骚扰、营销轰炸或规避平台规则。Telegram 可能对这类行为触发风控，包括限制发言、限制私聊、要求重新验证、冻结账号或封禁账号。

## 十一、更多文档

| 文档 | 用途 |
|---|---|
| [AGENTS.md](AGENTS.md) | 给 AI agent 读取的操作规则和约束 |
| [docs/MCP_TOOLS.md](docs/MCP_TOOLS.md) | 每个 MCP 工具的用途、参数、返回结构和示例 |
| [docs/AGENT_WORKFLOWS.md](docs/AGENT_WORKFLOWS.md) | 常见 agent 工作流，例如读消息、搜索、发送、转发、评论 |
| [docs/CLIENT_SETUP.md](docs/CLIENT_SETUP.md) | OpenClaw、mcporter、Claude Desktop、stdio、Docker 网络接入 |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | 部署、登录、MCP 连接和 Telegram 平台限制排查 |

## 十二、开发检查

运行测试：

```bash
uv run --with pytest pytest -q
```

检查 Python 编译：

```bash
uv run python -m compileall tg_mcp
```
