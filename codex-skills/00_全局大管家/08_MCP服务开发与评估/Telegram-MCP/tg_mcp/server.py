from __future__ import annotations

from typing import Any

from mcp.server.fastmcp import FastMCP

from .config import Settings
from .context import TelegramMcpContext


settings = Settings()
ctx = TelegramMcpContext(settings)
mcp = FastMCP("Telegram Account MCP", json_response=True, host=settings.mcp_host, port=settings.mcp_port)
mcp.settings.streamable_http_path = settings.mcp_http_path


def _error(tool: str, exc: Exception) -> dict[str, Any]:
    return {"ok": False, "tool": tool, "error": str(exc)}


async def _read(tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    try:
        return await ctx.call_read_tool(tool_name, arguments)
    except Exception as exc:
        return _error(tool_name, exc)


def _prepare(tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    try:
        return ctx.prepare_write_tool(tool_name, arguments)
    except Exception as exc:
        return _error(tool_name, exc)


@mcp.tool()
async def tg_mcp_health() -> dict[str, Any]:
    """检查 Telegram MCP 是否可用。

    每次任务开始时优先调用。返回 database、telegram_session、当前权限和待确认写操作数量。
    当 telegram_session 不是 present 时，不要继续调用 Telegram 读写工具，应提示用户重新执行 auth 登录。
    """
    try:
        return {"ok": True, "data": await ctx.health()}
    except Exception as exc:
        return _error("tg_mcp_health", exc)


@mcp.tool()
async def tg_get_me() -> dict[str, Any]:
    """返回当前 MCP 正在操作的 Telegram 个人账号信息。

    用于确认 agent 代表哪个账号行动。返回 id、姓名、username、phone、is_bot。
    """
    try:
        return {"ok": True, "data": await ctx.get_me()}
    except Exception as exc:
        return _error("tg_get_me", exc)


@mcp.tool()
async def tg_list_chats(limit: int = 20) -> dict[str, Any]:
    """列出 Telegram 会话，用于获取 chat_id。

    返回 chats 数组，每项包含 id、title、type、unread_count、is_pinned 和 last_message。
    type 可能是 user、group、supergroup、channel。后续读消息、发消息、转发等操作的 chat_id 应来自这里。
    """
    return await _read("list_chats", {"limit": limit})


@mcp.tool()
async def tg_read_messages(chat_id: int, limit: int = 20) -> dict[str, Any]:
    """读取指定会话的最近消息。

    chat_id 应来自 tg_list_chats、tg_search_messages 或用户明确提供。返回 messages 数组，
    每条消息包含 id、chat_id、sender_id、sender_name、text、date、reply_to_id、is_outgoing。
    后续 reply_to、forward、edit、delete、pin 的 message_id 应来自这里或 tg_search_messages。
    """
    return await _read("read_messages", {"chat_id": chat_id, "limit": limit})


@mcp.tool()
async def tg_search_messages(query: str, chat_id: int | None = None, limit: int = 20) -> dict[str, Any]:
    """搜索 Telegram 消息。

    query 是必填关键词。chat_id 可选；不传则全局搜索，传入则只在指定会话内搜索。
    返回 messages 数组，可用于定位 chat_id、message_id 和上下文。不要编造搜索结果中不存在的 ID。
    """
    return await _read("search_messages", {"query": query, "chat_id": chat_id, "limit": limit})


@mcp.tool()
async def tg_list_contacts(limit: int = 50) -> dict[str, Any]:
    """列出 Telegram 联系人，用于获取 user_id。

    返回 contacts 数组，每项包含 id、first_name、last_name、username、phone。
    创建群组或查询用户详情时的 user_id 应来自这里、消息 sender 信息或用户明确提供。
    """
    return await _read("list_contacts", {"limit": limit})


@mcp.tool()
async def tg_list_folders() -> dict[str, Any]:
    """列出 Telegram 会话文件夹。

    返回 folders 数组，包含文件夹 id、title、include_peers、exclude_peers。用于理解用户账号里的会话分组。
    """
    return await _read("list_folders", {})


@mcp.tool()
async def tg_get_chat_info(chat_id: int) -> dict[str, Any]:
    """获取 Telegram 会话、频道、群组或用户详情。

    chat_id 应来自 tg_list_chats 或消息结果。返回 type、title、username、description、members_count 等信息。
    当用户要求确认群/频道/联系人身份时使用。
    """
    return await _read("get_chat_info", {"chat_id": chat_id})


@mcp.tool()
async def tg_get_user_info(user_id: int) -> dict[str, Any]:
    """获取 Telegram 用户详情。

    user_id 应来自 tg_list_contacts、消息 sender_id 或用户明确提供。返回姓名、username、phone、bio、last_seen、is_bot。
    """
    return await _read("get_user_info", {"user_id": user_id})


@mcp.tool()
def tg_prepare_send_message(chat_id: int, text: str, reply_to: int | None = None) -> dict[str, Any]:
    """准备发送 Telegram 文本消息，但不会立即发送。

    chat_id 应来自 tg_list_chats。text 是待发送内容。reply_to 可选，应来自 tg_read_messages 的消息 id。
    返回 confirmation_token、summary、arguments、expires_at。用户确认后再调用 tg_confirm_action。
    """
    return _prepare("send_message", {"chat_id": chat_id, "text": text, "reply_to": reply_to})


@mcp.tool()
def tg_prepare_comment_message(chat_id: int, message_id: int, text: str) -> dict[str, Any]:
    """准备在频道消息评论区发表评论，但不会立即执行。

    chat_id 应来自 tg_list_chats，message_id 应来自 tg_read_messages，text 是评论内容。
    该工具使用 Telegram channel comments 的 comment_to 机制；若频道未开启评论或账号无权限，确认时会返回平台错误。
    返回 confirmation_token。用户确认后再调用 tg_confirm_action。
    """
    return _prepare("comment_message", {"chat_id": chat_id, "message_id": message_id, "text": text})


@mcp.tool()
def tg_prepare_forward_message(from_chat_id: int, message_id: int, to_chat_id: int) -> dict[str, Any]:
    """准备转发 Telegram 消息，但不会立即执行。

    from_chat_id 和 to_chat_id 应来自 tg_list_chats；message_id 应来自 tg_read_messages 或 tg_search_messages。
    返回 confirmation_token 和摘要。用户确认后再调用 tg_confirm_action。
    """
    return _prepare("forward_message", {"from_chat_id": from_chat_id, "message_id": message_id, "to_chat_id": to_chat_id})


@mcp.tool()
def tg_prepare_edit_message(chat_id: int, message_id: int, text: str) -> dict[str, Any]:
    """准备编辑消息，但不会立即执行。

    chat_id 来自会话列表，message_id 来自消息读取结果，text 是新内容。通常只能编辑当前账号自己发送的消息。
    返回 confirmation_token 和摘要。用户确认后再调用 tg_confirm_action。
    """
    return _prepare("edit_message", {"chat_id": chat_id, "message_id": message_id, "text": text})


@mcp.tool()
def tg_prepare_delete_message(chat_id: int, message_ids: list[int]) -> dict[str, Any]:
    """准备删除一条或多条消息，但不会立即执行。

    chat_id 来自会话列表，message_ids 来自 tg_read_messages 或 tg_search_messages。
    这是高影响操作，确认前必须向用户展示目标会话和消息 ID。用户确认后再调用 tg_confirm_action。
    """
    return _prepare("delete_message", {"chat_id": chat_id, "message_ids": message_ids})


@mcp.tool()
def tg_prepare_pin_message(chat_id: int, message_id: int, unpin: bool = False) -> dict[str, Any]:
    """准备置顶或取消置顶 Telegram 消息，但不会立即执行。

    chat_id 来自会话列表，message_id 来自消息读取结果。unpin=false 表示置顶，unpin=true 表示取消置顶。
    返回 confirmation_token。用户确认后再调用 tg_confirm_action。
    """
    return _prepare("pin_message", {"chat_id": chat_id, "message_id": message_id, "unpin": unpin})


@mcp.tool()
def tg_prepare_mark_as_read(chat_id: int) -> dict[str, Any]:
    """准备将一个 Telegram 会话标记为已读，但不会立即执行。

    chat_id 应来自 tg_list_chats。返回 confirmation_token。用户确认后再调用 tg_confirm_action。
    """
    return _prepare("mark_as_read", {"chat_id": chat_id})


@mcp.tool()
def tg_prepare_create_group(title: str, user_ids: list[int]) -> dict[str, Any]:
    """准备创建 Telegram 群组，但不会立即执行。

    title 是群名；user_ids 应来自 tg_list_contacts、消息 sender_id 或用户明确提供。
    返回 confirmation_token 和成员数量摘要。用户确认后再调用 tg_confirm_action。
    """
    return _prepare("create_group", {"title": title, "user_ids": user_ids})


@mcp.tool()
def tg_prepare_leave_chat(chat_id: int) -> dict[str, Any]:
    """准备退出 Telegram 群组、超级群或频道，但不会立即执行。

    chat_id 应来自 tg_list_chats。退出后该会话通常会从列表中消失；这是高影响操作。
    返回 confirmation_token。用户确认后再调用 tg_confirm_action。
    """
    return _prepare("leave_chat", {"chat_id": chat_id})


@mcp.tool()
async def tg_confirm_action(confirmation_token: str) -> dict[str, Any]:
    """执行一个已经 prepare 的写操作。

    confirmation_token 必须来自 tg_prepare_* 返回。token 默认 10 分钟过期，并且只能使用一次。
    只有本工具成功后，消息发送、转发、编辑、删除等写操作才真正发生。
    """
    try:
        return await ctx.confirm_action(confirmation_token)
    except Exception as exc:
        return _error("tg_confirm_action", exc)


@mcp.tool()
def tg_cancel_action(confirmation_token: str) -> dict[str, Any]:
    """取消一个待确认写操作。

    confirmation_token 来自 tg_prepare_* 返回。取消后该 token 不能再确认执行。
    """
    try:
        return ctx.cancel_action(confirmation_token)
    except Exception as exc:
        return _error("tg_cancel_action", exc)


@mcp.tool()
def tg_list_pending_actions() -> dict[str, Any]:
    """列出当前 MCP 进程内等待确认的 Telegram 写操作。

    用于用户询问“刚才准备了什么操作”或需要取消 pending action 的场景。
    """
    try:
        return ctx.list_pending_actions()
    except Exception as exc:
        return _error("tg_list_pending_actions", exc)
