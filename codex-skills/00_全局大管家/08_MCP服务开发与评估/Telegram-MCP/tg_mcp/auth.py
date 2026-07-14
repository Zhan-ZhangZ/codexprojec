import argparse
import asyncio
import getpass
import hashlib

from sqlalchemy import select
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError
from telethon.sessions import StringSession

from .config import Settings
from .crypto import encrypt_session, init_crypto
from .db import User, create_db_engine, create_session_factory, ensure_schema


def phone_to_hash(phone: str) -> str:
    return hashlib.sha256(phone.encode()).hexdigest()


async def run_auth(args: argparse.Namespace) -> None:
    settings = Settings()
    init_crypto(settings.session_encryption_key)

    phone = args.phone or input("请输入 Telegram 手机号，国际格式，例如 +8613800000000: ").strip()
    if not phone:
        raise SystemExit("手机号不能为空")

    client = TelegramClient(StringSession(), settings.telegram_api_id, settings.telegram_api_hash)
    await client.connect()
    try:
        sent = await client.send_code_request(phone)
        code = args.code or input("请输入 Telegram login code: ").strip()
        if not code:
            raise SystemExit("验证码不能为空")

        try:
            await client.sign_in(phone, code, phone_code_hash=sent.phone_code_hash)
        except SessionPasswordNeededError:
            await client.sign_in(password=args.password or getpass.getpass("请输入 Telegram 2FA 密码: "))

        if not await client.is_user_authorized():
            raise SystemExit("Telegram 授权失败")

        engine = create_db_engine(settings.database_url, pool_pre_ping=True)
        await ensure_schema(engine)
        session_factory = create_session_factory(engine)
        async with session_factory() as db:
            if args.replace_current:
                result = await db.execute(select(User).where(User.telegram_session_encrypted.is_not(None)))
                for user in result.scalars().all():
                    user.telegram_session_encrypted = None

            phone_hash = phone_to_hash(phone)
            result = await db.execute(select(User).where(User.phone_hash == phone_hash))
            user = result.scalar_one_or_none()
            encrypted = encrypt_session(client.session.save())
            if user is None:
                user = User(phone_hash=phone_hash, telegram_session_encrypted=encrypted)
                db.add(user)
            else:
                user.telegram_session_encrypted = encrypted

            await db.commit()
            await db.refresh(user)
            print(f"Telegram 账号已写入数据库，user_id={user.id}")
            if args.replace_current:
                print("已禁用其他已保存账号，MCP 默认使用当前账号。")
        await engine.dispose()
    finally:
        await client.disconnect()


def add_auth_parser(subparsers: argparse._SubParsersAction) -> None:
    parser = subparsers.add_parser("auth", help="首次登录或切换 MCP 使用的 Telegram 个人账号")
    parser.add_argument("--phone", help="Telegram 手机号，国际格式")
    parser.add_argument("--code", help="Telegram login code。不传则交互输入。")
    parser.add_argument("--password", help="Telegram 2FA 密码。不传则隐藏输入。")
    parser.add_argument(
        "--keep-existing",
        dest="replace_current",
        action="store_false",
        help="保留其他账号 session。若保留多个账号，启动服务时需要设置 TG_MCP_USER_ID。",
    )
    parser.set_defaults(func=lambda ns: asyncio.run(run_auth(ns)), replace_current=True)
