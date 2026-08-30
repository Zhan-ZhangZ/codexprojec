"""CLI bridge from this Skill to the official local Comfy MCP server."""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any

from shared.comfy_mcp import ComfyMcpError, request, resolve_connection
from shared.runtime_config import get_default_server_id, get_server_by_id


def _parse_env(values: list[str]) -> dict[str, str]:
    env: dict[str, str] = {}
    for value in values:
        if "=" not in value:
            raise ValueError(f"Invalid --env value {value!r}; expected KEY=VALUE.")
        key, item = value.split("=", 1)
        if not key.strip():
            raise ValueError("Environment variable name cannot be empty.")
        env[key.strip()] = item
    return env


def _parse_arguments(value: str) -> dict[str, Any]:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError as exc:
        raise ValueError(f"--arguments must be valid JSON: {exc}") from exc
    if not isinstance(parsed, dict):
        raise ValueError("--arguments must be a JSON object.")
    return parsed


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Call the official local Comfy MCP server from a shell-capable Agent."
    )
    parser.add_argument("--server", default=None, help="Server id from config.json.")
    parser.add_argument("--command", default="", help="Override mcp_command.")
    parser.add_argument("--python", default="", help="Override mcp_python.")
    parser.add_argument("--cwd", default="", help="Override mcp_cwd.")
    parser.add_argument(
        "--env",
        action="append",
        default=[],
        metavar="KEY=VALUE",
        help="Add an MCP launcher environment variable. May be repeated.",
    )
    subparsers = parser.add_subparsers(dest="action", required=True)
    subparsers.add_parser("probe", help="Read server_info and the live tool catalog.")
    subparsers.add_parser("tools", help="List the live MCP tool catalog without calling a tool.")
    call_parser = subparsers.add_parser("call", help="Call one official MCP tool.")
    call_parser.add_argument("tool", help="Official MCP tool name.")
    call_parser.add_argument("--arguments", default="{}", help="Tool arguments as a JSON object.")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    server_id = args.server or get_default_server_id()
    server = get_server_by_id(server_id)
    if not server:
        print(json.dumps({"error": f"Server '{server_id}' not found in config.json"}, ensure_ascii=False))
        return 1

    try:
        connection = resolve_connection(
            server,
            command=args.command,
            python=args.python,
            cwd=args.cwd,
            extra_env=_parse_env(args.env),
        )
        arguments = _parse_arguments(args.arguments) if args.action == "call" else None
        result = request(
            connection,
            action=args.action,
            tool_name=getattr(args, "tool", ""),
            arguments=arguments,
        )
        result["server_id"] = server_id
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (ComfyMcpError, ValueError) as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    sys.exit(main())
