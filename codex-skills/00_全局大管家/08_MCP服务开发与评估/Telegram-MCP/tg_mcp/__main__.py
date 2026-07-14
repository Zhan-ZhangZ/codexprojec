import argparse

from .auth import add_auth_parser


def main() -> None:
    parser = argparse.ArgumentParser(description="Telegram 个人账号 MCP 服务")
    subparsers = parser.add_subparsers(dest="command")
    add_auth_parser(subparsers)

    serve_parser = subparsers.add_parser("serve", help="启动 MCP 服务")
    serve_parser.add_argument("--transport", choices=["http", "stdio"], default="http")
    serve_parser.add_argument("--host")
    serve_parser.add_argument("--port", type=int)
    serve_parser.add_argument("--path")

    args = parser.parse_args()
    if hasattr(args, "func"):
        args.func(args)
        return

    if args.command != "serve":
        parser.print_help()
        return

    from .server import mcp, settings

    if args.transport == "stdio":
        mcp.run(transport="stdio")
        return

    mcp.settings.host = args.host or settings.mcp_host
    mcp.settings.port = args.port or settings.mcp_port
    mcp.settings.streamable_http_path = args.path or settings.mcp_http_path
    mcp.run(transport="streamable-http")


if __name__ == "__main__":
    main()
