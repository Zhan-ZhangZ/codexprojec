"""Local stdio entrypoint for Claude Desktop or Cursor."""

from __future__ import annotations

from mcp_server.server import run_server


if __name__ == "__main__":
    run_server("stdio")
