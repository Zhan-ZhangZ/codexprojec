# MCP 工具手册

本文面向两类读者：

- 部署者：确认这个 MCP 服务到底暴露了哪些 Telegram 能力。
- AI agent：理解每个工具应该在什么场景调用、参数从哪里来、返回值怎么判断。

本项目操作的是**个人 Telegram 账号**，不是 Bot API。所有 `chat_id`、`message_id`、`user_id` 都应该来自 MCP 工具的读取结果，或来自用户明确提供的 Telegram ID。不要让 agent 自己猜 ID。

## 安全边界

- 读取类工具可以直接执行。
- 写操作只提供 `tg_prepare_*`，不会立即写入 Telegram。
- 真正执行写操作必须再调用 `tg_confirm_action`。
- 不建议把本 MCP 用于快速群发、骚扰、刷屏、营销轰炸或规避群组规则。这类行为可能触发 Telegram 平台风控，导致账号被限流、冻结或封禁。

所有工具返回 JSON 对象：

```json
{"ok": true, "data": {}}
```

失败时：

```json
{"ok": false, "tool": "工具名", "error": "错误说明"}
```

## 工具索引

| 类型 | 工具 | 用途 |
|---|---|---|
| 状态 | `tg_mcp_health` | 检查服务、数据库、session、权限 |
| 状态 | `tg_get_me` | 查看当前 Telegram 账号 |
| 读取 | `tg_list_chats` | 列出私聊、群组、频道 |
| 读取 | `tg_read_messages` | 读取指定会话消息 |
| 读取 | `tg_search_messages` | 搜索历史消息 |
| 读取 | `tg_list_contacts` | 列出联系人 |
| 读取 | `tg_list_folders` | 列出 Telegram 文件夹 |
| 读取 | `tg_get_chat_info` | 获取会话详情 |
| 读取 | `tg_get_user_info` | 获取用户详情 |
| 准备写入 | `tg_prepare_send_message` | 准备发送或回复消息 |
| 准备写入 | `tg_prepare_comment_message` | 准备评论频道消息 |
| 准备写入 | `tg_prepare_forward_message` | 准备转发消息 |
| 准备写入 | `tg_prepare_edit_message` | 准备编辑消息 |
| 准备写入 | `tg_prepare_delete_message` | 准备删除消息 |
| 准备写入 | `tg_prepare_pin_message` | 准备置顶或取消置顶 |
| 准备写入 | `tg_prepare_mark_as_read` | 准备标记已读 |
| 准备写入 | `tg_prepare_create_group` | 准备创建群组 |
| 准备写入 | `tg_prepare_leave_chat` | 准备退出群组或频道 |
| 确认 | `tg_confirm_action` | 执行待确认动作 |
| 确认 | `tg_cancel_action` | 取消待确认动作 |
| 确认 | `tg_list_pending_actions` | 列出待确认动作 |

## 通用字段

### chat

`tg_list_chats` 返回的会话对象常见字段：

```json
{
  "id": 123456,
  "title": "会话标题",
  "type": "user | group | supergroup | channel | unknown",
  "unread_count": 0,
  "is_pinned": false,
  "last_message": {}
}
```

`type` 含义：

- `user`：私聊
- `group`：普通群
- `supergroup`：超级群
- `channel`：频道
- `unknown`：无法识别的实体

### message

消息对象常见字段：

```json
{
  "id": 100,
  "chat_id": 123456,
  "sender_id": 789,
  "sender_name": "Alice",
  "text": "消息正文",
  "date": "2026-05-17T00:00:00+00:00",
  "reply_to_id": null,
  "is_outgoing": false,
  "edit_date": null
}
```

## 只读工具

### tg_mcp_health

用途：检查 MCP 服务、数据库、Telegram session、权限和待确认操作数量。

参数：无。

返回示例：

```json
{
  "ok": true,
  "data": {
    "database": "ok",
    "telegram_session": "present",
    "user_id": "uuid",
    "permission": "full_autonomy",
    "pending_actions": 0
  }
}
```

agent 使用建议：每次 Telegram 任务开始时先调用。

### tg_get_me

用途：查看当前 MCP 正在操作的 Telegram 个人账号。

参数：无。

返回字段：`id`、`first_name`、`last_name`、`username`、`phone`、`is_bot`。

### tg_list_chats

用途：列出私聊、普通群、超级群、频道，获取后续操作所需的 `chat_id`。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `limit` | integer | 否 | 返回数量，默认 20 |

返回字段：`chats` 数组，每项包含 `id`、`title`、`type`、`unread_count`、`is_pinned`、`last_message`。

示例：

```text
tg_list_chats(limit=100)
```

### tg_read_messages

用途：读取指定会话最近消息，获取 `message_id`、`sender_id` 和正文。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `chat_id` | integer | 是 | 来自 `tg_list_chats` |
| `limit` | integer | 否 | 返回数量，默认 20 |

返回字段：`messages` 数组。

### tg_search_messages

用途：全局搜索消息，或在指定会话内搜索消息。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `query` | string | 是 | 搜索关键词 |
| `chat_id` | integer | 否 | 限定会话；不传则全局搜索 |
| `limit` | integer | 否 | 返回数量，默认 20 |

agent 使用建议：用户只给了人名、群名、关键词时，先搜索，不要猜 ID。

### tg_list_contacts

用途：列出 Telegram 联系人，获取 `user_id`。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `limit` | integer | 否 | 返回数量，默认 50 |

返回字段：`contacts` 数组，每项包含 `id`、`first_name`、`last_name`、`username`、`phone`。

### tg_list_folders

用途：列出 Telegram 会话文件夹。

参数：无。

返回字段：`folders` 数组，包含文件夹 `id`、`title`、`include_peers`、`exclude_peers`。

### tg_get_chat_info

用途：获取会话、频道、群组或用户详情。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `chat_id` | integer | 是 | 来自会话列表或消息结果 |

返回字段：`id`、`type`、`title`、`username`、`description`、`members_count`。

### tg_get_user_info

用途：获取用户详情。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `user_id` | integer | 是 | 来自联系人或消息 sender |

返回字段：`id`、姓名、`username`、`phone`、`bio`、`last_seen`、`is_bot`。

## 写入准备工具

写入准备工具返回 pending action，不会立即执行 Telegram 写入。

通用返回示例：

```json
{
  "ok": true,
  "data": {
    "confirmation_token": "...",
    "tool_name": "send_message",
    "arguments": {},
    "summary": "操作摘要",
    "expires_at": "..."
  }
}
```

### tg_prepare_send_message

用途：准备向会话发送文本消息，或回复某条消息。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `chat_id` | integer | 是 | 来自 `tg_list_chats` |
| `text` | string | 是 | 要发送的文本 |
| `reply_to` | integer | 否 | 来自 `tg_read_messages` 的消息 ID |

下一步：展示摘要，确认后调用 `tg_confirm_action`。

### tg_prepare_comment_message

用途：准备在频道消息评论区发表评论。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `chat_id` | integer | 是 | 频道会话 ID，来自 `tg_list_chats` |
| `message_id` | integer | 是 | 频道消息 ID，来自 `tg_read_messages` |
| `text` | string | 是 | 评论内容 |

注意：该工具使用 Telegram 的 `comment_to` 机制。频道必须开启评论，当前账号也必须有评论权限，否则确认执行时会返回平台错误。

### tg_prepare_forward_message

用途：准备从一个会话转发消息到另一个会话。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `from_chat_id` | integer | 是 | 来源会话 ID |
| `message_id` | integer | 是 | 来源消息 ID |
| `to_chat_id` | integer | 是 | 目标会话 ID |

参数来源：`from_chat_id` 和 `to_chat_id` 来自 `tg_list_chats`；`message_id` 来自 `tg_read_messages` 或 `tg_search_messages`。

注意：Telegram 可能禁止转发某些受限内容、服务提示或私密内容。遇到平台错误时，应向用户解释限制，不要反复重试刷请求。

### tg_prepare_edit_message

用途：准备编辑当前账号发出的消息。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `chat_id` | integer | 是 | 目标会话 ID |
| `message_id` | integer | 是 | 要编辑的消息 ID |
| `text` | string | 是 | 编辑后的文本 |

注意：Telegram 通常只允许编辑当前账号自己发送的消息。

### tg_prepare_delete_message

用途：准备删除一条或多条消息。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `chat_id` | integer | 是 | 目标会话 |
| `message_ids` | integer[] | 是 | 要删除的消息 ID 列表 |

注意：这是高影响操作，确认前必须向用户展示目标会话和消息 ID。

### tg_prepare_pin_message

用途：准备置顶或取消置顶消息。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `chat_id` | integer | 是 | 目标会话 ID |
| `message_id` | integer | 是 | 目标消息 ID |
| `unpin` | boolean | 否 | `false` 表示置顶，`true` 表示取消置顶 |

注意：置顶能力取决于当前账号在群组、频道或会话中的权限。

### tg_prepare_mark_as_read

用途：准备将会话标记为已读。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `chat_id` | integer | 是 | 目标会话 ID |

### tg_prepare_create_group

用途：准备创建新 Telegram 群组。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | string | 是 | 群名 |
| `user_ids` | integer[] | 是 | 群成员用户 ID |

参数来源：`user_ids` 来自 `tg_list_contacts` 或用户明确提供。

### tg_prepare_leave_chat

用途：准备退出 Telegram 群组、超级群或频道。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `chat_id` | integer | 是 | 来自 `tg_list_chats` |

注意：这是高影响操作。执行成功后，该会话通常会从账号会话列表中消失。

## 确认工具

### tg_confirm_action

用途：执行一个已经 prepare 的写操作。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `confirmation_token` | string | 是 | 来自 `tg_prepare_*` 返回 |

注意：token 默认 10 分钟过期，只能使用一次。

### tg_cancel_action

用途：取消一个待确认写操作。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `confirmation_token` | string | 是 | 来自 `tg_prepare_*` 返回 |

### tg_list_pending_actions

用途：列出当前 MCP 进程内等待确认的写操作。

参数：无。

用途场景：用户问“刚才准备了什么操作”“取消之前的发送”时先调用。
