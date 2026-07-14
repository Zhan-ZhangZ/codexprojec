"""Cloud entrypoint exposing FastAPI, SSE, and Streamable HTTP."""

from __future__ import annotations

import contextlib
from collections.abc import AsyncIterator

from fastapi import FastAPI

from config import get_settings
from mcp_server.server import get_mcp_server

settings = get_settings()
mcp_server = get_mcp_server()
mcp_server.settings.streamable_http_path = "/"


@contextlib.asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    async with mcp_server.session_manager.run():
        yield


app = FastAPI(
    title=settings.service_name,
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health() -> dict[str, object]:
    """Simple health endpoint for cloud deployment."""

    return {
        "status": "ok",
        "service": settings.service_name,
        "models": {
            "haiku": settings.haiku_model,
            "sonnet": settings.sonnet_model,
        },
        "transport": {
            "sse": settings.sse_mount_path,
            "http": settings.http_mount_path,
        },
    }


app.mount(settings.sse_mount_path, mcp_server.sse_app(settings.sse_mount_path))
app.mount(settings.http_mount_path, mcp_server.streamable_http_app())
