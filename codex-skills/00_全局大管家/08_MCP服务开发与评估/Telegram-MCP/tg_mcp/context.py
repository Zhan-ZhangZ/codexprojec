import asyncio
import time
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker
from telethon import TelegramClient
from telethon.sessions import StringSession

from .confirmations import ConfirmationStore
from .config import Settings
from .crypto import decrypt_session, init_crypto
from .db import User, create_db_engine, create_session_factory, ensure_schema
from .executor import execute_tool
from .registry import registry
import tg_mcp.tools  # noqa: F401 - registers tools


READ_TOOLS = {
    "list_chats",
    "read_messages",
    "search_messages",
    "list_contacts",
    "list_folders",
    "get_chat_info",
    "get_user_info",
}

WRITE_TOOLS = {
    "send_message",
    "comment_message",
    "forward_message",
    "edit_message",
    "delete_message",
    "pin_message",
    "mark_as_read",
    "create_group",
    "leave_chat",
}


class TelegramMcpContext:
    def __init__(
        self,
        settings: Settings,
        engine: AsyncEngine | None = None,
        confirmations: ConfirmationStore | None = None,
    ):
        self.settings = settings
        self.engine = engine or create_db_engine(settings.database_url, pool_pre_ping=True)
        self.session_factory: async_sessionmaker = create_session_factory(self.engine)
        self.confirmations = confirmations or ConfirmationStore(
            ttl_seconds=settings.tg_mcp_confirmation_ttl_seconds,
            max_pending=settings.tg_mcp_max_pending_actions,
        )
        self._client: TelegramClient | None = None
        self._connect_lock = asyncio.Lock()
        self._write_lock = asyncio.Lock()
        self._last_write_at = 0.0
        self._schema_ready = False
        init_crypto(settings.session_encryption_key)

    async def close(self) -> None:
        if self._client is not None:
            await self._client.disconnect()
            self._client = None
        await self.engine.dispose()

    async def health(self) -> dict[str, Any]:
        user = await self._load_user()
        return {
            "database": "ok",
            "telegram_session": "present" if user.telegram_session_encrypted else "missing",
            "user_id": str(user.id),
            "permission": self.settings.tg_mcp_permission,
            "pending_actions": len(self.confirmations.list()),
        }

    async def get_client(self) -> TelegramClient:
        async with self._connect_lock:
            if self._client is not None and self._client.is_connected():
                return self._client

            user = await self._load_user()
            if not user.telegram_session_encrypted:
                raise RuntimeError("Selected user has no Telegram session. Run: docker compose run --rm telegram-mcp uv run python -m tg_mcp auth")

            client = TelegramClient(
                StringSession(decrypt_session(user.telegram_session_encrypted)),
                self.settings.telegram_api_id,
                self.settings.telegram_api_hash,
            )
            await client.connect()
            if not await client.is_user_authorized():
                await client.disconnect()
                raise RuntimeError("Stored Telegram session is not authorized. Run the auth command again.")

            self._client = client
            return client

    async def get_me(self) -> dict[str, Any]:
        me = await (await self.get_client()).get_me()
        return {
            "id": me.id,
            "first_name": me.first_name or "",
            "last_name": me.last_name or "",
            "username": me.username,
            "phone": me.phone,
            "is_bot": bool(me.bot),
        }

    async def call_read_tool(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        self._check_tool(tool_name, must_be_read=True)
        result = await execute_tool(registry, tool_name, arguments, client=await self.get_client())
        return self._wrap_tool_result(tool_name, result)

    def prepare_write_tool(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        self._check_tool(tool_name, must_be_write=True)
        action = self.confirmations.prepare(
            tool_name=tool_name,
            arguments=arguments,
            summary=self._summarize_action(tool_name, arguments),
        )
        return {"ok": True, "data": action.to_dict()}

    async def confirm_action(self, confirmation_token: str) -> dict[str, Any]:
        action = self.confirmations.pop(confirmation_token)
        self._check_tool(action.tool_name, must_be_write=True)
        async with self._write_lock:
            elapsed = time.monotonic() - self._last_write_at
            wait_for = self.settings.tg_mcp_write_min_interval_seconds - elapsed
            if wait_for > 0:
                await asyncio.sleep(wait_for)
            result = await execute_tool(registry, action.tool_name, action.arguments, client=await self.get_client())
            self._last_write_at = time.monotonic()
        return self._wrap_tool_result(action.tool_name, result)

    def cancel_action(self, confirmation_token: str) -> dict[str, Any]:
        return {"ok": True, "data": self.confirmations.cancel(confirmation_token).to_dict()}

    def list_pending_actions(self) -> dict[str, Any]:
        return {"ok": True, "data": {"pending_actions": self.confirmations.list()}}

    async def _ensure_schema(self) -> None:
        if not self._schema_ready:
            await ensure_schema(self.engine)
            self._schema_ready = True

    async def _load_user(self) -> User:
        await self._ensure_schema()
        async with self.session_factory() as session:
            if self.settings.tg_mcp_user_id:
                result = await session.execute(select(User).where(User.id == uuid.UUID(self.settings.tg_mcp_user_id)))
                user = result.scalar_one_or_none()
                if user is None:
                    raise RuntimeError(f"TG_MCP_USER_ID not found: {self.settings.tg_mcp_user_id}")
                return user

            result = await session.execute(
                select(User).where(User.telegram_session_encrypted.is_not(None)).order_by(User.created_at.desc())
            )
            users = list(result.scalars().all())
            if not users:
                raise RuntimeError("No Telegram account is logged in. Run: docker compose run --rm telegram-mcp uv run python -m tg_mcp auth")
            if len(users) > 1:
                raise RuntimeError("Multiple Telegram users found. Set TG_MCP_USER_ID explicitly.")
            return users[0]

    def _check_tool(self, tool_name: str, *, must_be_read: bool = False, must_be_write: bool = False) -> None:
        tool = registry.get_tool(tool_name)
        if tool is None:
            raise RuntimeError(f"Unknown Telegram tool: {tool_name}")
        if tool.permission > self.settings.permission_level:
            raise PermissionError(
                f"Tool {tool_name} requires {tool.permission.name}, current permission is {self.settings.permission_level.name}"
            )
        if must_be_read and tool_name not in READ_TOOLS:
            raise RuntimeError(f"Tool {tool_name} is not exposed as a read tool")
        if must_be_write and tool_name not in WRITE_TOOLS:
            raise RuntimeError(f"Tool {tool_name} is not exposed as a write tool")

    @staticmethod
    def _wrap_tool_result(tool_name: str, result: dict[str, Any]) -> dict[str, Any]:
        if "error" in result:
            return {"ok": False, "tool": tool_name, "error": result["error"]}
        return {"ok": True, "tool": tool_name, "data": result}

    @staticmethod
    def _summarize_action(tool_name: str, arguments: dict[str, Any]) -> str:
        if tool_name == "send_message":
            text = str(arguments.get("text", ""))
            preview = text[:80] + ("..." if len(text) > 80 else "")
            return f"向 chat {arguments.get('chat_id')} 发送消息: {preview!r}"
        if tool_name == "comment_message":
            text = str(arguments.get("text", ""))
            preview = text[:80] + ("..." if len(text) > 80 else "")
            return f"在 chat {arguments.get('chat_id')} 的消息 {arguments.get('message_id')} 下评论: {preview!r}"
        if tool_name == "forward_message":
            return f"从 chat {arguments.get('from_chat_id')} 转发消息 {arguments.get('message_id')} 到 chat {arguments.get('to_chat_id')}"
        if tool_name == "edit_message":
            return f"编辑 chat {arguments.get('chat_id')} 中的消息 {arguments.get('message_id')}"
        if tool_name == "delete_message":
            return f"删除 chat {arguments.get('chat_id')} 中的消息 {arguments.get('message_ids')}"
        if tool_name == "pin_message":
            verb = "取消置顶" if arguments.get("unpin") else "置顶"
            return f"{verb} chat {arguments.get('chat_id')} 中的消息 {arguments.get('message_id')}"
        if tool_name == "mark_as_read":
            return f"将 chat {arguments.get('chat_id')} 标记为已读"
        if tool_name == "create_group":
            return f"创建群组 {arguments.get('title')!r}，成员数 {len(arguments.get('user_ids', []))}"
        if tool_name == "leave_chat":
            return f"退出 chat {arguments.get('chat_id')}"
        return f"执行 Telegram 操作 {tool_name}"
