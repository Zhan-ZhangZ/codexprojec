from telethon import TelegramClient
from telethon.errors import RPCError
from telethon.tl.functions.channels import GetFullChannelRequest
from telethon.tl.functions.contacts import GetContactsRequest
from telethon.tl.functions.messages import CreateChatRequest, GetDialogFiltersRequest, GetFullChatRequest
from telethon.tl.functions.users import GetFullUserRequest
from telethon.tl.types import (
    Channel,
    Chat as TlChat,
    DialogFilter,
    DialogFilterDefault,
    User as TlUser,
    UserStatusOffline,
    UserStatusOnline,
    UserStatusRecently,
)

from ..converters import dialog_to_chat, message_to_dict
from ..permissions import PermissionLevel
from ..registry import registry


async def _resolve_chat(client: TelegramClient, chat_id: int):
    me = await client.get_me()
    if getattr(me, "id", None) == chat_id:
        return "me"

    try:
        return await client.get_entity(chat_id)
    except (ValueError, TypeError, RPCError):
        pass

    async for dialog in client.iter_dialogs():
        entity = dialog.entity
        if dialog.id == chat_id or getattr(entity, "id", None) == chat_id:
            return entity

    raise ValueError(f"Could not resolve Telegram chat_id {chat_id}. Refresh chats with tg_list_chats and retry.")


async def _resolve_user(client: TelegramClient, user_id: int):
    try:
        return await client.get_entity(user_id)
    except (ValueError, TypeError, RPCError):
        pass

    result = await client(GetContactsRequest(hash=0))
    for user in result.users:
        if isinstance(user, TlUser) and user.id == user_id:
            return user

    async for dialog in client.iter_dialogs():
        entity = dialog.entity
        if isinstance(entity, TlUser) and entity.id == user_id:
            return entity

    raise ValueError(f"Could not resolve Telegram user_id {user_id}. Refresh contacts with tg_list_contacts and retry.")


@registry.register(
    name="list_chats",
    description="List Telegram chats/dialogs. Returns chat id, title, type, unread count, and last message.",
    permission=PermissionLevel.READ_ONLY,
    parameters={"type": "object", "properties": {"limit": {"type": "integer"}}, "required": []},
)
async def list_chats(client: TelegramClient, limit: int = 20) -> dict:
    dialogs = await client.get_dialogs(limit=limit)
    return {"chats": [dialog_to_chat(dialog) for dialog in dialogs]}


@registry.register(
    name="read_messages",
    description="Read recent messages from a Telegram chat.",
    permission=PermissionLevel.READ_ONLY,
    parameters={
        "type": "object",
        "properties": {"chat_id": {"type": "integer"}, "limit": {"type": "integer"}},
        "required": ["chat_id"],
    },
)
async def read_messages(client: TelegramClient, chat_id: int, limit: int = 20) -> dict:
    chat = await _resolve_chat(client, chat_id)
    messages = await client.get_messages(chat, limit=limit)
    return {"messages": [message_to_dict(message, chat_id) for message in messages]}


@registry.register(
    name="search_messages",
    description="Search messages globally or within a specific Telegram chat.",
    permission=PermissionLevel.READ_ONLY,
    parameters={
        "type": "object",
        "properties": {
            "query": {"type": "string"},
            "chat_id": {"type": "integer"},
            "limit": {"type": "integer"},
        },
        "required": ["query"],
    },
)
async def search_messages(client: TelegramClient, query: str, chat_id: int | None = None, limit: int = 20) -> dict:
    chat = await _resolve_chat(client, chat_id) if chat_id else None
    messages = await client.get_messages(chat, search=query, limit=limit)
    return {"messages": [message_to_dict(message, message.chat_id or 0) for message in messages]}


@registry.register(
    name="list_contacts",
    description="List Telegram contacts.",
    permission=PermissionLevel.READ_ONLY,
    parameters={"type": "object", "properties": {"limit": {"type": "integer"}}, "required": []},
)
async def list_contacts(client: TelegramClient, limit: int = 50) -> dict:
    result = await client(GetContactsRequest(hash=0))
    contacts = []
    for user in result.users[:limit]:
        if isinstance(user, TlUser):
            contacts.append(
                {
                    "id": user.id,
                    "first_name": user.first_name or "",
                    "last_name": user.last_name or "",
                    "username": user.username,
                    "phone": user.phone,
                }
            )
    return {"contacts": contacts}


@registry.register(
    name="list_folders",
    description="List Telegram chat folders.",
    permission=PermissionLevel.READ_ONLY,
    parameters={"type": "object", "properties": {}, "required": []},
)
async def list_folders(client: TelegramClient) -> dict:
    result = await client(GetDialogFiltersRequest())
    folders = []
    for folder in result.filters:
        if isinstance(folder, DialogFilterDefault):
            folders.append({"id": 0, "title": "All Chats", "include_peers": [], "exclude_peers": []})
        elif isinstance(folder, DialogFilter):
            folders.append(
                {
                    "id": folder.id,
                    "title": folder.title.text if hasattr(folder.title, "text") else str(folder.title),
                    "include_peers": [_peer_id(peer) for peer in folder.include_peers],
                    "exclude_peers": [_peer_id(peer) for peer in folder.exclude_peers],
                }
            )
    return {"folders": folders}


def _peer_id(peer) -> int | None:
    return (
        getattr(peer, "channel_id", None)
        or getattr(peer, "chat_id", None)
        or getattr(peer, "user_id", None)
    )


@registry.register(
    name="get_chat_info",
    description="Get detailed information about a Telegram chat/channel/group/user.",
    permission=PermissionLevel.READ_ONLY,
    parameters={"type": "object", "properties": {"chat_id": {"type": "integer"}}, "required": ["chat_id"]},
)
async def get_chat_info(client: TelegramClient, chat_id: int) -> dict:
    entity = await _resolve_chat(client, chat_id)
    info: dict = {"id": chat_id}

    if isinstance(entity, Channel):
        info["type"] = "channel" if entity.broadcast else "supergroup" if entity.megagroup else "group"
        info["title"] = entity.title or ""
        info["username"] = entity.username
        full = await client(GetFullChannelRequest(entity))
        info["description"] = full.full_chat.about or ""
        info["members_count"] = full.full_chat.participants_count
    elif isinstance(entity, TlChat):
        info["type"] = "group"
        info["title"] = entity.title or ""
        info["username"] = None
        full = await client(GetFullChatRequest(entity.id))
        info["description"] = full.full_chat.about or ""
        participants_count = getattr(full.full_chat, "participants_count", None)
        participants = getattr(getattr(full.full_chat, "participants", None), "participants", None)
        info["members_count"] = participants_count if participants_count is not None else len(participants or [])
    elif isinstance(entity, TlUser):
        info["type"] = "user"
        info["title"] = " ".join(part for part in [entity.first_name, entity.last_name] if part)
        info["username"] = entity.username
        info["description"] = ""
        info["members_count"] = None
    else:
        info["type"] = "unknown"
        info["title"] = str(entity)
    return info


@registry.register(
    name="get_user_info",
    description="Get detailed information about a Telegram user.",
    permission=PermissionLevel.READ_ONLY,
    parameters={"type": "object", "properties": {"user_id": {"type": "integer"}}, "required": ["user_id"]},
)
async def get_user_info(client: TelegramClient, user_id: int) -> dict:
    if not user_id:
        return {"error": "user_id must be a valid non-zero Telegram user ID"}

    full = await client(GetFullUserRequest(await _resolve_user(client, user_id)))
    user = full.users[0]

    last_seen = None
    if isinstance(user.status, UserStatusOnline):
        last_seen = "online"
    elif isinstance(user.status, UserStatusOffline):
        last_seen = user.status.was_online.isoformat() if user.status.was_online else "offline"
    elif isinstance(user.status, UserStatusRecently):
        last_seen = "recently"

    return {
        "id": user.id,
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "username": user.username,
        "phone": user.phone,
        "bio": full.full_user.about or "",
        "last_seen": last_seen,
        "is_bot": user.bot or False,
    }


@registry.register(
    name="send_message",
    description="Send a text message to a Telegram chat on behalf of the logged-in account.",
    permission=PermissionLevel.READ_WRITE,
    parameters={
        "type": "object",
        "properties": {
            "chat_id": {"type": "integer"},
            "text": {"type": "string"},
            "reply_to": {"type": "integer"},
        },
        "required": ["chat_id", "text"],
    },
)
async def send_message(client: TelegramClient, chat_id: int, text: str, reply_to: int | None = None) -> dict:
    chat = await _resolve_chat(client, chat_id)
    message = await client.send_message(chat, text, reply_to=reply_to)
    return {"success": True, "message_id": message.id}


@registry.register(
    name="comment_message",
    description="Post a comment under a Telegram channel message.",
    permission=PermissionLevel.READ_WRITE,
    parameters={
        "type": "object",
        "properties": {
            "chat_id": {"type": "integer"},
            "message_id": {"type": "integer"},
            "text": {"type": "string"},
        },
        "required": ["chat_id", "message_id", "text"],
    },
)
async def comment_message(client: TelegramClient, chat_id: int, message_id: int, text: str) -> dict:
    chat = await _resolve_chat(client, chat_id)
    message = await client.send_message(chat, text, comment_to=message_id)
    return {"success": True, "message_id": message.id}


@registry.register(
    name="forward_message",
    description="Forward a message from one Telegram chat to another.",
    permission=PermissionLevel.READ_WRITE,
    parameters={
        "type": "object",
        "properties": {
            "from_chat_id": {"type": "integer"},
            "message_id": {"type": "integer"},
            "to_chat_id": {"type": "integer"},
        },
        "required": ["from_chat_id", "message_id", "to_chat_id"],
    },
)
async def forward_message(client: TelegramClient, from_chat_id: int, message_id: int, to_chat_id: int) -> dict:
    from_chat = await _resolve_chat(client, from_chat_id)
    to_chat = await _resolve_chat(client, to_chat_id)
    result = await client.forward_messages(to_chat, message_id, from_chat)
    forwarded_id = result[0].id if isinstance(result, list) else result.id
    return {"success": True, "message_id": forwarded_id}


@registry.register(
    name="edit_message",
    description="Edit a message sent by the logged-in Telegram account.",
    permission=PermissionLevel.READ_WRITE,
    parameters={
        "type": "object",
        "properties": {
            "chat_id": {"type": "integer"},
            "message_id": {"type": "integer"},
            "text": {"type": "string"},
        },
        "required": ["chat_id", "message_id", "text"],
    },
)
async def edit_message(client: TelegramClient, chat_id: int, message_id: int, text: str) -> dict:
    chat = await _resolve_chat(client, chat_id)
    await client.edit_message(chat, message_id, text)
    return {"success": True}


@registry.register(
    name="delete_message",
    description="Delete one or more messages from a Telegram chat.",
    permission=PermissionLevel.FULL_AUTONOMY,
    parameters={
        "type": "object",
        "properties": {
            "chat_id": {"type": "integer"},
            "message_ids": {"type": "array", "items": {"type": "integer"}},
        },
        "required": ["chat_id", "message_ids"],
    },
)
async def delete_message(client: TelegramClient, chat_id: int, message_ids: list[int]) -> dict:
    chat = await _resolve_chat(client, chat_id)
    result = await client.delete_messages(chat, message_ids)
    return {"success": True, "deleted_count": getattr(result, "pts_count", len(message_ids))}


@registry.register(
    name="pin_message",
    description="Pin or unpin a Telegram message.",
    permission=PermissionLevel.READ_WRITE,
    parameters={
        "type": "object",
        "properties": {
            "chat_id": {"type": "integer"},
            "message_id": {"type": "integer"},
            "unpin": {"type": "boolean"},
        },
        "required": ["chat_id", "message_id"],
    },
)
async def pin_message(client: TelegramClient, chat_id: int, message_id: int, unpin: bool = False) -> dict:
    chat = await _resolve_chat(client, chat_id)
    if unpin:
        await client.unpin_message(chat, message_id)
    else:
        await client.pin_message(chat, message_id)
    return {"success": True}


@registry.register(
    name="mark_as_read",
    description="Mark all messages in a Telegram chat as read.",
    permission=PermissionLevel.READ_WRITE,
    parameters={"type": "object", "properties": {"chat_id": {"type": "integer"}}, "required": ["chat_id"]},
)
async def mark_as_read(client: TelegramClient, chat_id: int) -> dict:
    chat = await _resolve_chat(client, chat_id)
    await client.send_read_acknowledge(chat)
    return {"success": True}


@registry.register(
    name="create_group",
    description="Create a new Telegram group chat with specified users.",
    permission=PermissionLevel.FULL_AUTONOMY,
    parameters={
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "user_ids": {"type": "array", "items": {"type": "integer"}},
        },
        "required": ["title", "user_ids"],
    },
)
async def create_group(client: TelegramClient, title: str, user_ids: list[int]) -> dict:
    users = [await _resolve_user(client, user_id) for user_id in user_ids]
    await client(CreateChatRequest(users=users, title=title))
    async for dialog in client.iter_dialogs():
        if dialog.name == title:
            return {"success": True, "chat_id": dialog.id, "title": title}
    return {"success": True, "title": title}


@registry.register(
    name="leave_chat",
    description="Leave a Telegram group, supergroup, or channel.",
    permission=PermissionLevel.FULL_AUTONOMY,
    parameters={"type": "object", "properties": {"chat_id": {"type": "integer"}}, "required": ["chat_id"]},
)
async def leave_chat(client: TelegramClient, chat_id: int) -> dict:
    chat = await _resolve_chat(client, chat_id)
    await client.delete_dialog(chat)
    return {"success": True, "chat_id": chat_id}
