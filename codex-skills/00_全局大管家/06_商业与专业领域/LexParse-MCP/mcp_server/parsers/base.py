"""Base parser abstractions and shared document helpers."""

from __future__ import annotations

import base64
import binascii
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


BINARY_EXTENSIONS = {".pdf", ".docx", ".doc"}
BASE64_DATA_URL_RE = re.compile(r"^data:(?P<mime>[\w/+.-]+);base64,(?P<data>.+)$", re.DOTALL)
BASE64_CHARS_RE = re.compile(r"^[A-Za-z0-9+/=\s]+$")


@dataclass(slots=True)
class ParsedDocument:
    """Normalized document payload after file parsing."""

    file_name: str
    file_type: str
    text: str
    metadata: dict[str, Any] = field(default_factory=dict)


class BaseParser(ABC):
    """Shared interface for all file parsers."""

    supported_extensions: tuple[str, ...] = ()

    @abstractmethod
    def parse(self, document_content: str | bytes, file_name: str) -> ParsedDocument:
        """Parse raw document content into plain text."""


def get_extension(file_name: str) -> str:
    """Return a lowercase suffix for the provided file name."""

    return Path(file_name).suffix.lower()


def normalize_text(text: str) -> str:
    """Normalize spacing while preserving legal document structure."""

    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\x00", "")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _maybe_decode_data_url(document_content: str) -> bytes | None:
    match = BASE64_DATA_URL_RE.match(document_content.strip())
    if not match:
        return None
    payload = match.group("data")
    return base64.b64decode(payload, validate=True)


def is_probably_base64(document_content: str) -> bool:
    """Heuristic base64 detector for binary uploads routed through JSON."""

    payload = document_content.strip()
    if len(payload) < 32 or len(payload) % 4 != 0:
        return False
    return bool(BASE64_CHARS_RE.fullmatch(payload))


def ensure_bytes(document_content: str | bytes, file_name: str = "") -> bytes:
    """Convert string or bytes into binary payload."""

    if isinstance(document_content, bytes):
        return document_content

    decoded_from_data_url = _maybe_decode_data_url(document_content)
    if decoded_from_data_url is not None:
        return decoded_from_data_url

    extension = get_extension(file_name)
    if extension in BINARY_EXTENSIONS or is_probably_base64(document_content):
        try:
            return base64.b64decode(document_content, validate=True)
        except (ValueError, binascii.Error):
            pass

    return document_content.encode("utf-8")


def ensure_text(document_content: str | bytes) -> str:
    """Convert string or bytes into text using common Mainland/HK encodings."""

    if isinstance(document_content, str):
        return normalize_text(document_content)

    for encoding in ("utf-8", "utf-8-sig", "gb18030", "big5", "latin-1"):
        try:
            return normalize_text(document_content.decode(encoding))
        except UnicodeDecodeError:
            continue

    return normalize_text(document_content.decode("utf-8", errors="ignore"))


def parse_plain_text(document_content: str | bytes, file_name: str) -> ParsedDocument:
    """Fallback parser for TXT, Markdown, or already-extracted text."""

    text = ensure_text(document_content)
    return ParsedDocument(
        file_name=file_name,
        file_type=get_extension(file_name) or ".txt",
        text=text,
        metadata={
            "parser": "plain_text",
            "character_count": len(text),
            "line_count": len(text.splitlines()),
        },
    )
