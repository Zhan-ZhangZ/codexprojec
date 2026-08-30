"""Small stdio client for the official local Comfy MCP server."""

from __future__ import annotations

import asyncio
import ipaddress
import json
import os
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


_DLL_DIRECTORY_HANDLES: list[Any] = []


class ComfyMcpError(RuntimeError):
    """Raised when the official MCP runtime or one of its tools fails."""


@dataclass(frozen=True, slots=True)
class McpConnection:
    command: str
    args: list[str]
    cwd: str | None
    env: dict[str, str]
    python: str


def _string_list(value: Any, field: str) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise ComfyMcpError(f"{field} must be a list of strings.")
    return list(value)


def _string_dict(value: Any, field: str) -> dict[str, str]:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ComfyMcpError(f"{field} must be an object of string environment variables.")
    return {
        str(key): str(item)
        for key, item in value.items()
        if str(key).strip() and str(item).strip()
    }


def _merge_no_proxy(existing: str, additions: tuple[str, ...]) -> str:
    values = [item.strip() for item in existing.split(",") if item.strip()]
    seen = {item.lower() for item in values}
    for item in additions:
        if item.lower() not in seen:
            values.append(item)
            seen.add(item.lower())
    return ",".join(values)


def _is_loopback_url(url: str) -> bool:
    host = (urlparse(url).hostname or "").strip().lower()
    if host in {"localhost", "0.0.0.0", "::"}:
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


def resolve_connection(
    server: dict[str, Any],
    *,
    command: str = "",
    python: str = "",
    cwd: str = "",
    extra_env: dict[str, str] | None = None,
) -> McpConnection:
    """Resolve launcher settings from one project server entry and CLI overrides."""
    configured_command = str(command or server.get("mcp_command") or "comfy-mcp").strip()
    resolved_command = shutil.which(configured_command) or configured_command
    args = _string_list(server.get("mcp_args"), "mcp_args")
    configured_env = _string_dict(server.get("mcp_env"), "mcp_env")
    configured_env.update(extra_env or {})

    env = {str(key): str(value) for key, value in os.environ.items()}
    env.update(configured_env)
    env["COMFY_WHERE"] = "local"
    server_url = str(server.get("url") or "http://127.0.0.1:8188").strip()
    for key in ("COMFY_LOCAL_URL", "COMFYUI_URL", "COMFYUI_HOST", "COMFYUI_PORT"):
        env.pop(key, None)
    if _is_loopback_url(server_url):
        env["COMFY_LOCAL_URL"] = server_url
    else:
        env["COMFYUI_URL"] = server_url
    no_proxy = _merge_no_proxy(
        env.get("NO_PROXY") or env.get("no_proxy") or "",
        ("127.0.0.1", "localhost"),
    )
    env["NO_PROXY"] = no_proxy
    env["no_proxy"] = no_proxy

    resolved_cwd = str(cwd or server.get("mcp_cwd") or "").strip() or None
    resolved_python = str(python or server.get("mcp_python") or "").strip()
    return McpConnection(
        command=resolved_command,
        args=args,
        cwd=resolved_cwd,
        env=env,
        python=resolved_python,
    )


def _candidate_pythons(connection: McpConnection) -> list[Path]:
    candidates: list[Path] = []
    if connection.python:
        candidates.append(Path(connection.python))
    command_path = Path(connection.command)
    if command_path.suffix.lower() in {".exe", ".cmd", ".bat"}:
        candidates.append(command_path.parent / "python.exe")
    return candidates


def _runtime_site_packages(python_path: Path) -> list[Path]:
    env_root = python_path.parent.parent
    candidates = [env_root / "Lib" / "site-packages"]
    for pattern in ("lib/python*/site-packages", "lib64/python*/site-packages"):
        candidates.extend(sorted(env_root.glob(pattern)))
    return [candidate for candidate in candidates if candidate.is_dir()]


def _add_runtime_site_packages(python_path: Path) -> None:
    for site_packages in _runtime_site_packages(python_path):
        if str(site_packages) not in sys.path:
            sys.path.insert(0, str(site_packages))

        pywin32_system32 = site_packages / "pywin32_system32"
        if pywin32_system32.is_dir():
            if str(pywin32_system32) not in sys.path:
                sys.path.insert(0, str(pywin32_system32))
            if hasattr(os, "add_dll_directory"):
                _DLL_DIRECTORY_HANDLES.append(os.add_dll_directory(str(pywin32_system32)))
        for win32_path in (site_packages / "win32", site_packages / "win32" / "lib"):
            if win32_path.is_dir() and str(win32_path) not in sys.path:
                sys.path.insert(0, str(win32_path))


def _load_sdk(connection: McpConnection) -> tuple[Any, Any, Any]:
    for candidate in _candidate_pythons(connection):
        _add_runtime_site_packages(candidate)
    try:
        from mcp import ClientSession, StdioServerParameters, stdio_client
    except ImportError as exc:
        raise ComfyMcpError(
            "The MCP client SDK is unavailable. Set mcp_python to the Python "
            "inside the official comfy-mcp environment, or install the 'mcp' package."
        ) from exc
    return ClientSession, StdioServerParameters, stdio_client


def _as_json(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    return value


def _tool_payload(result: Any) -> Any:
    is_error = getattr(result, "is_error", None)
    if is_error is None:
        is_error = getattr(result, "isError", False)
    content = getattr(result, "content", []) or []
    if is_error:
        details = [str(getattr(item, "text", "")) for item in content if getattr(item, "text", "")]
        raise ComfyMcpError("Official Comfy MCP tool failed: " + "\n".join(details))

    structured = getattr(result, "structuredContent", None)
    if structured is None:
        structured = getattr(result, "structured_content", None)
    if structured is not None:
        return _as_json(structured)

    rendered: list[Any] = []
    for item in content:
        text = getattr(item, "text", None)
        if text is None:
            rendered.append(_as_json(item))
            continue
        try:
            rendered.append(json.loads(text))
        except json.JSONDecodeError:
            rendered.append(text)
    if len(rendered) == 1:
        return rendered[0]
    return rendered


def _tool_descriptor(tool: Any) -> dict[str, Any]:
    data = _as_json(tool)
    if not isinstance(data, dict):
        return {"name": str(tool)}
    schema = data.get("inputSchema") or data.get("input_schema") or {}
    properties = schema.get("properties", {}) if isinstance(schema, dict) else {}
    description = str(data.get("description") or "").strip()
    summary = " ".join(description.split("\n\n", 1)[0].splitlines())
    return {
        "name": data.get("name", ""),
        "description": summary,
        "required": schema.get("required", []) if isinstance(schema, dict) else [],
        "parameters": list(properties) if isinstance(properties, dict) else [],
    }


async def _request(
    connection: McpConnection,
    *,
    action: str,
    tool_name: str = "",
    arguments: dict[str, Any] | None = None,
) -> dict[str, Any]:
    ClientSession, StdioServerParameters, stdio_client = _load_sdk(connection)
    params = StdioServerParameters(
        command=connection.command,
        args=connection.args,
        env=connection.env,
        cwd=connection.cwd,
    )
    async with stdio_client(params) as streams:
        async with ClientSession(*streams) as session:
            initialized = await session.initialize()
            if action == "call":
                result = await session.call_tool(tool_name, arguments or {})
                return {"tool": tool_name, "result": _tool_payload(result)}

            listed = await session.list_tools()
            tools = [_tool_descriptor(tool) for tool in getattr(listed, "tools", []) or []]
            payload: dict[str, Any] = {
                "server": _as_json(getattr(initialized, "serverInfo", None) or getattr(initialized, "server_info", None)),
                "tool_count": len(tools),
                "tools": tools,
            }
            if action == "probe":
                payload["server_info"] = _tool_payload(await session.call_tool("server_info", {}))
            return payload


def request(
    connection: McpConnection,
    *,
    action: str,
    tool_name: str = "",
    arguments: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run one MCP session and return a JSON-serializable response."""
    try:
        return asyncio.run(
            _request(
                connection,
                action=action,
                tool_name=tool_name,
                arguments=arguments,
            )
        )
    except ComfyMcpError:
        raise
    except BaseException as exc:
        nested = getattr(exc, "exceptions", None)
        if nested:
            details = "; ".join(str(item) for item in nested)
        else:
            details = str(exc) or type(exc).__name__
        raise ComfyMcpError(f"Official Comfy MCP connection failed: {details}") from exc
