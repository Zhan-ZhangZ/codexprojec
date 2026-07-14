from telethon.tl.types import Channel, Chat, Message, User


def entity_type(entity) -> str:
    if isinstance(entity, User):
        return "user"
    if isinstance(entity, Channel):
        return "channel" if entity.broadcast else "supergroup" if entity.megagroup else "group"
    if isinstance(entity, Chat):
        return "group"
    return "unknown"


def entity_title(entity) -> str:
    if isinstance(entity, User):
        return " ".join(part for part in [entity.first_name, entity.last_name] if part) or entity.username or str(entity.id)
    return getattr(entity, "title", None) or getattr(entity, "username", None) or str(getattr(entity, "id", ""))


def message_to_dict(message: Message, chat_id: int) -> dict:
    sender = getattr(message, "sender", None)
    return {
        "id": message.id,
        "chat_id": chat_id,
        "sender_id": getattr(message, "sender_id", None),
        "sender_name": entity_title(sender) if sender else None,
        "text": message.text,
        "date": message.date.isoformat() if message.date else None,
        "reply_to_id": message.reply_to_msg_id,
        "is_outgoing": bool(message.out),
        "edit_date": message.edit_date.isoformat() if message.edit_date else None,
    }


def dialog_to_chat(dialog) -> dict:
    entity = dialog.entity
    last_message = dialog.message
    return {
        "id": dialog.id,
        "title": entity_title(entity),
        "type": entity_type(entity),
        "unread_count": dialog.unread_count,
        "is_pinned": dialog.pinned,
        "last_message": message_to_dict(last_message, dialog.id) if last_message else None,
    }
