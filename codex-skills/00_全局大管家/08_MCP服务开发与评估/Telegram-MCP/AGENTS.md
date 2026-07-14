# Telegram MCP Agent 指南

本项目把一个**个人 Telegram 账号**暴露为 MCP 工具，供 OpenClaw、Codex、Claude Desktop 等 agent 调用。它不是 Telegram Bot API，也不是网页聊天壳；agent 通过 MCP 工具直接读取 Telegram 会话，并通过确认令牌执行写操作。

本项目是 vibecoding 迭代出的个人 Telegram MCP 工具，默认用于本地或私有环境的 agent 自动化。不要把它用于快速群发骚扰信息、刷屏、营销轰炸或规避 Telegram 平台规则；这类行为可能触发平台风控，导致账号限流、冻结或封禁。

## 前置检查

每次开始 Telegram 操作前，先调用：

```text
tg_mcp_health
```

处理规则：

- `telegram_session` 为 `present`：可以继续。
- `telegram_session` 为 `missing` 或工具报错：停止操作，提示用户执行登录命令。
- 需要确认当前账号身份时，再调用 `tg_get_me`。

不要用浏览器、网页自动化或 Telegram Bot API 替代本 MCP。所有 Telegram 操作都应通过 `tg_*` MCP 工具完成。

## 全局约束

- `chat_id` 必须来自 `tg_list_chats`、`tg_search_messages`、`tg_read_messages`、`tg_list_contacts`、`tg_get_chat_info` 的返回结果，或来自用户明确提供的 Telegram ID。不要编造。
- `message_id` 必须来自 `tg_read_messages` 或 `tg_search_messages` 的返回结果。不要编造。
- `user_id` 必须来自 `tg_list_contacts`、`tg_get_user_info`、消息 sender 信息或用户明确提供的 Telegram ID。
- 需要在群里 @ 某个 bot 或用户时，优先调用 `tg_get_user_info` 查询 `username`，使用 `@username`。Telegram 显示名不是 mention 标识，例如 `@统领` 只是普通文本，真实 username 才能触发。
- 读取类工具可以直接调用；写操作必须先调用 `tg_prepare_*`，再等待用户或上层 agent 明确确认后调用 `tg_confirm_action`。
- 不要绕过确认机制，不要批量群发陌生人，不要刷屏或执行平台滥用行为。
- 所有工具统一返回 JSON。先看 `ok` 字段；`ok=false` 时读取 `error` 并向用户解释。

## 意图路由

| 用户意图 | 首选工具 | 说明 |
|---|---|---|
| 检查服务和登录状态 | `tg_mcp_health` | 每次任务开始时优先调用 |
| 查看当前账号 | `tg_get_me` | 确认 MCP 正在操作哪个个人账号 |
| 列出私聊、群组、频道 | `tg_list_chats` | 获取 `chat_id`、标题、类型、未读数 |
| 读取某个会话 | `tg_read_messages` | 需要已有 `chat_id` |
| 搜索历史消息 | `tg_search_messages` | 可全局搜索，也可限定 `chat_id` |
| 查看联系人 | `tg_list_contacts` | 获取联系人 `user_id` |
| 查看会话详情 | `tg_get_chat_info` | 查询标题、类型、成员数、简介 |
| 查看用户详情 | `tg_get_user_info` | 查询用户名、手机号、简介、在线状态 |
| 回复或发送消息 | `tg_prepare_send_message` -> `tg_confirm_action` | `chat_id` 来自会话列表，`reply_to` 来自消息列表 |
| 评论频道消息 | `tg_prepare_comment_message` -> `tg_confirm_action` | 需要频道 `chat_id` 和消息 ID |
| 转发消息 | `tg_prepare_forward_message` -> `tg_confirm_action` | 需要来源会话、消息 ID、目标会话 |
| 编辑消息 | `tg_prepare_edit_message` -> `tg_confirm_action` | 通常只能编辑当前账号发出的消息 |
| 删除消息 | `tg_prepare_delete_message` -> `tg_confirm_action` | 高影响操作，确认前必须展示摘要 |
| 置顶或取消置顶 | `tg_prepare_pin_message` -> `tg_confirm_action` | 需要目标消息 ID |
| 标记已读 | `tg_prepare_mark_as_read` -> `tg_confirm_action` | 写操作，也需要确认 |
| 创建群组 | `tg_prepare_create_group` -> `tg_confirm_action` | 需要用户 ID 列表 |
| 退出群组或频道 | `tg_prepare_leave_chat` -> `tg_confirm_action` | 高影响操作，先确认目标会话 |

## 写操作流程

所有写操作都分两步：

1. 调用对应 `tg_prepare_*` 工具。
2. 将返回的 `summary`、目标 chat、参数和过期时间展示给用户。
3. 用户确认后，调用 `tg_confirm_action` 并传入 `confirmation_token`。
4. 用户取消或超时，调用 `tg_cancel_action` 或重新 prepare。

示例：

```text
tg_prepare_send_message(chat_id=123, text="你好")
```

返回中会包含：

```json
{
  "ok": true,
  "data": {
    "confirmation_token": "...",
    "summary": "向 chat 123 发送消息: '你好'",
    "expires_at": "..."
  }
}
```

确认后：

```text
tg_confirm_action(confirmation_token="...")
```

## 常见失败处理

| 场景 | 处理 |
|---|---|
| 未登录或 session 失效 | 提示用户运行 `docker compose run --rm telegram-mcp uv run python -m tg_mcp auth` |
| 找不到 chat | 先调用 `tg_list_chats` 或 `tg_search_messages`，不要猜 ID |
| 找不到 message | 先调用 `tg_read_messages` 或 `tg_search_messages` |
| 多账号错误 | 提示设置 `TG_MCP_USER_ID` 或重新执行 auth 替换当前账号 |
| prepare token 过期 | 重新调用对应 `tg_prepare_*` |
| 权限不足 | 根据错误提示检查 `TG_MCP_PERMISSION` |

## 参考文档

- 工具参数和返回结构：`docs/MCP_TOOLS.md`
- 常见 agent 工作流：`docs/AGENT_WORKFLOWS.md`
- MCP 客户端接入：`docs/CLIENT_SETUP.md`
