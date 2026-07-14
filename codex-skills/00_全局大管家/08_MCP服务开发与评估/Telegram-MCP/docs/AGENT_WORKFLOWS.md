# Agent 工作流

本文档给 agent 使用，按场景说明应调用哪些 MCP 工具、参数从哪里来、失败时如何处理。

## 1. 查询当前账号和连接状态

流程：

1. 调用 `tg_mcp_health`。
2. 如果 `telegram_session` 是 `present`，继续。
3. 如果用户关心当前账号，调用 `tg_get_me`。

失败处理：

- session 缺失或失效：提示用户运行 `docker compose run --rm telegram-mcp uv run python -m tg_mcp auth`。
- 数据库错误：提示检查 `docker compose ps` 和 `docker compose logs -f telegram-mcp`。

## 2. 列出群组、频道、私聊

流程：

1. 调用 `tg_list_chats(limit=100)`；数量不足时提高 limit。
2. 按 `type` 分类：
   - `user`：私聊
   - `group`：普通群
   - `supergroup`：超级群
   - `channel`：频道
3. 向用户展示标题、类型、`chat_id`、未读数。

示例统计：

```text
群组数量 = type 为 group 或 supergroup 的数量
频道数量 = type 为 channel 的数量
私聊数量 = type 为 user 的数量
```

## 3. 读取某个会话最近消息

流程：

1. 如果用户只提供会话名称，先调用 `tg_list_chats` 查找候选。
2. 找到目标 `chat_id` 后调用 `tg_read_messages(chat_id, limit=20)`。
3. 展示必要字段：`id`、`sender_name`、`text`、`date`、`is_outgoing`。

失败处理：

- 同名会话多个：列出候选，让用户选择。
- 找不到会话：建议用户提供更准确名称或提高 `limit`。

## 4. 搜索历史消息

流程：

1. 用户给关键词时调用 `tg_search_messages(query, limit=20)`。
2. 用户指定某个会话时，先解析 `chat_id`，再调用 `tg_search_messages(query, chat_id, limit=20)`。
3. 返回结果中保留 `chat_id` 和 `message_id`，供后续回复、转发、编辑、删除使用。

失败处理：

- 无结果：建议换关键词，或改为全局搜索。
- 搜索结果来自多个会话：按会话分组展示。

## 5. 准备发送或回复消息

流程：

1. 通过 `tg_list_chats`、`tg_search_messages` 或用户明确输入确定 `chat_id`。
2. 如果是回复某条消息，先调用 `tg_read_messages` 获取 `reply_to` 的 `message_id`。
3. 如果文本需要 @ 某个用户或 bot，先调用 `tg_get_user_info` 或从联系人/消息结果中确认 `username`，使用 `@username`，不要使用显示名。
4. 调用 `tg_prepare_send_message(chat_id, text, reply_to?)`。
5. 展示 `summary` 和 `confirmation_token` 的过期时间。
6. 用户确认后调用 `tg_confirm_action(confirmation_token)`。
7. 用户取消时调用 `tg_cancel_action(confirmation_token)`。

约束：

- 不要直接承诺“已发送”，只有 `tg_confirm_action` 成功后才算发送。
- 文本内容不明确时先向用户确认。
- Telegram 显示名不是 mention 标识，`@显示名` 通常不会触发；需要触发 bot 时使用真实 username，例如 `@example_bot`。

## 6. 转发消息

流程：

1. 确定来源会话 `from_chat_id`。
2. 调用 `tg_read_messages` 或 `tg_search_messages` 确定 `message_id`。
3. 确定目标会话 `to_chat_id`。
4. 调用 `tg_prepare_forward_message(from_chat_id, message_id, to_chat_id)`。
5. 展示摘要并等待确认。
6. 用户确认后调用 `tg_confirm_action`。

失败处理：

- 找不到原消息：重新读取或搜索。
- 目标会话不明确：列出候选，不要猜测。
- 收藏夹通常是当前账号自己的 `me` 对话；如果列表里找不到“收藏夹”，先调用 `tg_get_me`，再用当前账号 id 读取消息。
- Telegram 受限内容或服务提示可能无法转发；如果用户只是要求“把信息发过去”，可说明限制后改用复制文本发送。

## 6.1 评论频道消息

流程：

1. 调用 `tg_list_chats` 找到频道 `chat_id`。
2. 调用 `tg_read_messages(chat_id, limit=1)` 获取最新消息 ID。
3. 调用 `tg_prepare_comment_message(chat_id, message_id, text)`。
4. 用户确认后调用 `tg_confirm_action`。

失败处理：

- 频道未开启评论或账号无评论权限时，Telegram 会返回平台错误，向用户说明不能评论。
- 评论是公开行为，生产环境应先展示评论内容并等待确认。

## 7. 编辑消息

流程：

1. 读取目标会话消息。
2. 选择 `is_outgoing=true` 且需要编辑的消息。
3. 调用 `tg_prepare_edit_message(chat_id, message_id, text)`。
4. 展示新旧含义和确认摘要。
5. 确认后调用 `tg_confirm_action`。

失败处理：

- 不是当前账号发送的消息：提示 Telegram 通常不允许编辑。
- 消息过旧或平台拒绝编辑：展示 MCP 返回错误。

## 8. 删除消息

流程：

1. 读取目标会话消息并确定 `message_ids`。
2. 调用 `tg_prepare_delete_message(chat_id, message_ids)`。
3. 删除前必须展示目标会话和消息 ID 列表。
4. 用户确认后调用 `tg_confirm_action`。

约束：

- 删除是高影响操作，不要批量删除不明确范围。
- 用户只说“删掉这个”但上下文不清时，先确认具体消息。

## 9. 置顶、取消置顶、标记已读

置顶：

1. 获取 `chat_id` 和 `message_id`。
2. 调用 `tg_prepare_pin_message(chat_id, message_id, unpin=false)`。
3. 确认后调用 `tg_confirm_action`。

取消置顶：

1. 获取 `chat_id` 和目标置顶消息 `message_id`。
2. 调用 `tg_prepare_pin_message(chat_id, message_id, unpin=true)`。
3. 确认后调用 `tg_confirm_action`。

标记已读：

1. 获取 `chat_id`。
2. 调用 `tg_prepare_mark_as_read(chat_id)`。
3. 确认后调用 `tg_confirm_action`。

## 10. 创建群组

流程：

1. 调用 `tg_list_contacts` 或根据用户提供的 Telegram ID 收集 `user_ids`。
2. 确认群名 `title` 和成员列表。
3. 调用 `tg_prepare_create_group(title, user_ids)`。
4. 展示摘要，用户确认后调用 `tg_confirm_action`。

失败处理：

- 找不到联系人：提示用户提供 Telegram ID 或先添加联系人。
- 多个同名联系人：列出候选并让用户选择。

## 11. 查看和取消待确认操作

流程：

1. 用户问“刚才准备了什么”时调用 `tg_list_pending_actions`。
2. 用户要求取消时调用 `tg_cancel_action(confirmation_token)`。
3. token 过期或不存在时，重新执行 prepare 流程。

## 12. 退出群组或频道

流程：

1. 调用 `tg_list_chats` 查找目标会话。
2. 向用户确认目标标题、`chat_id` 和 `type`，避免退出错群。
3. 调用 `tg_prepare_leave_chat(chat_id)`。
4. 用户确认后调用 `tg_confirm_action`。
5. 再次调用 `tg_list_chats` 验证目标会话是否已经消失。

约束：

- 退出群组或频道是高影响操作，不能靠模糊名称直接执行。
- 如果多个会话名称相近，列出候选并让用户选择。
