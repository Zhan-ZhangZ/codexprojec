from pydantic_settings import BaseSettings

from .permissions import PermissionLevel


class Settings(BaseSettings):
    telegram_api_id: int
    telegram_api_hash: str
    session_encryption_key: str
    database_url: str = "postgresql+asyncpg://telegram_mcp:telegram_mcp@localhost:5432/telegram_mcp"

    tg_mcp_user_id: str | None = None
    tg_mcp_permission: str = "full_autonomy"
    tg_mcp_confirmation_ttl_seconds: int = 600
    tg_mcp_max_pending_actions: int = 100
    tg_mcp_write_min_interval_seconds: float = 3.0

    mcp_host: str = "127.0.0.1"
    mcp_port: int = 8000
    mcp_http_path: str = "/mcp"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @property
    def permission_level(self) -> PermissionLevel:
        return PermissionLevel.from_string(self.tg_mcp_permission)
