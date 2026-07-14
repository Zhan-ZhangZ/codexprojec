"""Runtime configuration and logging setup for LexParse MCP."""

from __future__ import annotations

import base64
import logging
import os
from dataclasses import dataclass
from functools import lru_cache

import structlog


def _normalize_mount_path(value: str, default: str) -> str:
    path = (value or default).strip() or default
    return path if path.startswith("/") else f"/{path}"


def _load_aes_key(value: str | None) -> bytes | None:
    if not value:
        return None

    raw_value = value.strip()
    try:
        decoded = base64.b64decode(raw_value)
        if len(decoded) in {16, 24, 32}:
            return decoded
    except Exception:
        pass

    raw_bytes = raw_value.encode("utf-8")
    if len(raw_bytes) in {16, 24, 32}:
        return raw_bytes
    return None


def configure_logging(level: str = "INFO") -> None:
    """Configure standard logging and structlog once per process."""

    logging.basicConfig(
        format="%(message)s",
        level=getattr(logging, level.upper(), logging.INFO),
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, level.upper(), logging.INFO)),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


@dataclass(slots=True)
class Settings:
    """Application settings loaded from environment variables."""

    service_name: str
    host: str
    port: int
    log_level: str
    default_jurisdiction: str
    anthropic_api_key: str | None
    sonnet_model: str
    haiku_model: str
    classification_max_tokens: int
    classification_char_limit: int
    extraction_max_tokens: int
    risk_max_tokens: int
    max_document_chars: int
    sse_mount_path: str
    http_mount_path: str
    aes_key: bytes | None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached environment-backed settings."""

    settings = Settings(
        service_name=os.getenv("LEXPARSE_SERVICE_NAME", "LexParse MCP"),
        host=os.getenv("LEXPARSE_HOST", "0.0.0.0"),
        port=int(os.getenv("LEXPARSE_PORT", "8000")),
        log_level=os.getenv("LEXPARSE_LOG_LEVEL", "INFO"),
        default_jurisdiction=os.getenv("LEXPARSE_DEFAULT_JURISDICTION", "CN").upper(),
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
        sonnet_model=os.getenv("LEXPARSE_SONNET_MODEL", "claude-sonnet-4-6"),
        haiku_model=os.getenv("LEXPARSE_HAIKU_MODEL", "claude-haiku-4-5"),
        classification_max_tokens=int(os.getenv("LEXPARSE_CLASSIFICATION_MAX_TOKENS", "256")),
        classification_char_limit=int(os.getenv("LEXPARSE_CLASSIFICATION_CHAR_LIMIT", "6000")),
        extraction_max_tokens=int(os.getenv("LEXPARSE_EXTRACTION_MAX_TOKENS", "5000")),
        risk_max_tokens=int(os.getenv("LEXPARSE_RISK_MAX_TOKENS", "3000")),
        max_document_chars=int(os.getenv("LEXPARSE_MAX_DOCUMENT_CHARS", "24000")),
        sse_mount_path=_normalize_mount_path(os.getenv("LEXPARSE_SSE_MOUNT_PATH", "/sse"), "/sse"),
        http_mount_path=_normalize_mount_path(os.getenv("LEXPARSE_HTTP_MOUNT_PATH", "/mcp"), "/mcp"),
        aes_key=_load_aes_key(os.getenv("LEXPARSE_AES_KEY")),
    )
    configure_logging(settings.log_level)
    return settings
