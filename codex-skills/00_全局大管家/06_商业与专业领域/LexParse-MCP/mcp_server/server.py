"""FastMCP server bootstrap for LexParse MCP."""

from __future__ import annotations

from mcp.server.fastmcp import FastMCP

from config import get_settings
from mcp_server.tools import register_tools

settings = get_settings()

lexparse_mcp = FastMCP(
    name=settings.service_name,
    instructions=(
        "LexParse MCP 提供法律文书结构化抽取、风险分析和版本比较。"
        "适用于判决书、合同、起诉状等中文或中英双语法律文书。"
    ),
    json_response=True,
    streamable_http_path=settings.http_mount_path,
)

register_tools(lexparse_mcp)


def get_mcp_server() -> FastMCP:
    """Return the singleton FastMCP instance."""

    return lexparse_mcp


def run_server(transport: str = "stdio", host: str | None = None, port: int | None = None) -> None:
    """Run the FastMCP server over stdio, SSE, or Streamable HTTP."""

    resolved_host = host or settings.host
    resolved_port = port or settings.port

    if transport == "sse":
        lexparse_mcp.run(
            transport="sse",
            host=resolved_host,
            port=resolved_port,
            mount_path=settings.sse_mount_path,
        )
        return

    if transport == "streamable-http":
        lexparse_mcp.settings.streamable_http_path = settings.http_mount_path
        lexparse_mcp.run(
            transport="streamable-http",
            host=resolved_host,
            port=resolved_port,
        )
        return

    lexparse_mcp.run(transport="stdio")
