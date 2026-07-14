# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 George Saliba <george.saliba@salitronic.com>
"""EDA Agent MCP Server - Main entry point + CLI subcommands."""

import argparse
import logging
import sys
import threading
from pathlib import Path
from typing import Optional
from mcp.server.fastmcp import FastMCP

from .tools import register_all_tools
from .config import get_config

logger = logging.getLogger("eda_agent")


class _ThreadAwareStdout:
    """sys.stdout wrapper that keeps the MAIN thread's writes on the
    real stdout (which the MCP server uses for JSON-RPC) but redirects
    every BACKGROUND-thread write to stderr.

    Lenient MCP clients (Claude Code) tolerate stray stdout bytes from
    the dashboard thread; strict clients (Codex) see a single non-JSON
    byte and close the transport. This wrapper makes the dashboard
    coexist with strict-stdio clients without disabling it -- any
    background-thread print() / write() lands on stderr where it's
    safe, while the main thread's MCP I/O stays untouched.
    """

    __slots__ = ("_real_stdout", "_real_stderr")

    def __init__(self, real_stdout, real_stderr):
        self._real_stdout = real_stdout
        self._real_stderr = real_stderr

    def _target(self):
        if threading.current_thread() is threading.main_thread():
            return self._real_stdout
        return self._real_stderr

    # Required stream methods. Delegating __getattr__ alone isn't safe
    # because some callers do isinstance checks / direct attribute peeks
    # before writing.
    def write(self, s):
        return self._target().write(s)

    def writelines(self, lines):
        return self._target().writelines(lines)

    def flush(self):
        return self._target().flush()

    def isatty(self):
        return self._target().isatty()

    def fileno(self):
        return self._target().fileno()

    @property
    def buffer(self):
        return self._target().buffer

    @property
    def encoding(self):
        return self._target().encoding

    @property
    def errors(self):
        return self._target().errors

    def __getattr__(self, name):
        return getattr(self._target(), name)


def _install_stdio_guard() -> None:
    """Replace sys.stdout with the thread-aware wrapper.

    Idempotent: a second call is a no-op. Captures the original stdout
    so the MCP main thread can keep writing JSON-RPC to it; everything
    on background threads falls through to stderr automatically.
    """
    if isinstance(sys.stdout, _ThreadAwareStdout):
        return
    sys.stdout = _ThreadAwareStdout(sys.stdout, sys.stderr)


def setup_logging() -> None:
    """Configure logging for the MCP server."""
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(
        logging.Formatter("%(asctime)s [%(name)s] %(levelname)s: %(message)s")
    )
    root = logging.getLogger("eda_agent")
    root.addHandler(handler)
    root.setLevel(logging.INFO)


# Create global FastMCP instance
mcp = FastMCP("eda-agent")

# Register all tools
register_all_tools(mcp)


def _probe_port_owner(host: str, port: int) -> Optional[int]:
    """Return the OS pid that owns ``host:port`` if it's already bound, else None.

    Used at startup to detect the orphan-MCP-server situation: a previous
    eda-agent instance failed to exit on stdio EOF and is still holding
    port 8766, so this new instance's Flask thread will silently fail to
    bind. Surfacing the owning pid + a kill hint turns a confusing
    "dashboard not loading new endpoints" experience into one obvious fix.
    """
    try:
        import psutil  # type: ignore[import-not-found]
    except ImportError:
        return None
    try:
        for conn in psutil.net_connections(kind="tcp"):
            la = conn.laddr
            if la and la.port == port and conn.status == "LISTEN":
                return conn.pid
    except (psutil.AccessDenied, OSError):
        return None
    return None


def _dashboard_disabled_via_env() -> bool:
    """Check the env vars that opt out of the dashboard.

    Accepts any of:
      EDA_AGENT_NO_DASHBOARD=1      (original name)
      EDA_AGENT_DISABLE_DASHBOARD=1 (alias requested in GH issue #4)
      EDA_AGENT_HEADLESS=1          (alias)
    Reading all three keeps existing setups working while matching the
    naming pattern users / docs may have settled on.
    """
    import os
    for key in ("EDA_AGENT_NO_DASHBOARD",
                "EDA_AGENT_DISABLE_DASHBOARD",
                "EDA_AGENT_HEADLESS"):
        if os.environ.get(key, "").strip() in ("1", "true", "yes", "on"):
            return True
    return False


def _spawn_dashboard_background(host: str, port: int) -> "Optional[object]":
    """Start the local web dashboard on a background thread.

    Two ways the dashboard runs:
      1. Auto-spawned in-process when MCP starts (this function) -- the
         common case when the user opens Claude with the MCP server.
         Dies when MCP exits.
      2. Manually via `eda-agent dashboard --port 8766` in a terminal --
         a standalone process the user controls.

    Returns the Werkzeug server handle so the caller can ``.shutdown()``
    it on stdio EOF. Werkzeug's request-handler threads aren't daemonic,
    so without the explicit shutdown the process can't exit and the
    next /mcp reconnect ends up with port 8766 still held by the orphan.
    """
    import os
    import threading

    if _dashboard_disabled_via_env():
        logger.info("dashboard disabled via env var (no/disable/headless)")
        return None

    # If port is already bound -- probably a manually-launched standalone
    # `eda-agent dashboard` -- skip with an info log. The MCP server
    # works fine without an in-process dashboard.
    owner_pid = _probe_port_owner(host, port)
    if owner_pid is not None and owner_pid != os.getpid():
        logger.info(
            "dashboard already running on port %s (pid %s) -- not "
            "spawning another. http://%s:%s/", port, owner_pid, host, port,
        )
        return {"already_running": True, "owner_pid": owner_pid}

    server_holder: dict[str, object] = {}

    def _run():
        try:
            from werkzeug.serving import make_server
            from .web.dashboard import create_app
            app = create_app()
            import logging as _log
            _log.getLogger("werkzeug").setLevel(_log.WARNING)
            srv = make_server(host, port, app, threaded=True)
            server_holder["srv"] = srv
            srv.serve_forever()
        except OSError as e:
            logger.warning("dashboard could not bind %s:%s (%s)",
                           host, port, e)
        except Exception as e:
            logger.warning("dashboard background thread crashed: %s", e)

    t = threading.Thread(target=_run, name="dashboard-server", daemon=True)
    t.start()
    logger.info("dashboard scheduled on http://%s:%s/", host, port)
    server_holder["thread"] = t
    return server_holder


def serve_mcp(no_dashboard: bool = False) -> int:
    """Start the MCP server on stdio. This is the default mode -- it's
    what an MCP-compatible client calls when it invokes `eda-agent` with no args.

    Passing ``no_dashboard=True`` (or setting any of the supported env
    vars listed in ``_dashboard_disabled_via_env``) skips the dashboard
    background thread entirely. Strict MCP clients (Codex, MCP CLI, etc)
    do not tolerate ANY noise on stdio, and even with the dashboard
    running silently a stray print from a transitive import can corrupt
    the JSON-RPC stream. Headless mode is the safe default for those
    clients.
    """
    # CRITICAL ORDER: install the thread-aware stdio guard BEFORE any
    # other module gets a chance to print. Strict MCP stdio clients
    # (Codex etc) close the transport on the first non-JSON byte. The
    # guard sends background-thread writes to stderr while keeping the
    # main thread's stdout intact for the MCP JSON-RPC stream.
    _install_stdio_guard()
    sys.stdout.flush()

    setup_logging()
    logger.info("Starting EDA Agent MCP Server")

    config = get_config()
    config.ensure_workspace()
    logger.info("Workspace directory: %s", config.workspace_dir)

    # Auto-launch the web dashboard in-process. Skip for headless / strict
    # MCP clients that can't tolerate dashboard side-effects.
    if no_dashboard or _dashboard_disabled_via_env():
        logger.info("headless mode -- dashboard not started")
        dash = None
    else:
        dash = _spawn_dashboard_background(host="127.0.0.1", port=8766)

    try:
        mcp.run(transport="stdio")
    finally:
        # Shut down the in-process Werkzeug server so the process can
        # actually exit. Werkzeug's request-handler threads aren't
        # daemonic, so without this they keep the process alive past
        # stdio-EOF and the next /mcp reconnect ends up with port 8766
        # still held by the orphan.
        if dash and isinstance(dash, dict):
            srv = dash.get("srv")
            try:
                if srv is not None and hasattr(srv, "shutdown"):
                    srv.shutdown()  # type: ignore[attr-defined]
            except Exception as e:
                logger.debug("dashboard shutdown raised: %s", e)
        import os as _os
        _os._exit(0)
    return 0


def main() -> int:
    """CLI entry point.

    Subcommands:
      serve             -- run the MCP server (default when no args given)
      scripts-path      -- print the path to the bundled DelphiScript files
      install-scripts   -- copy bundled scripts to a chosen directory

    IMPORTANT: when invoked with no arguments, this MUST start the MCP
    server on stdio -- MCP-compatible clients rely on that behaviour.
    """
    parser = argparse.ArgumentParser(
        prog="eda-agent",
        description=(
            "MCP server bridge for Altium Designer. "
            "Run with no arguments to start the MCP server on stdio."
        ),
    )
    # Top-level flag so `eda-agent --no-dashboard` works without the
    # `serve` subcommand. Important: most MCP clients invoke the binary
    # with NO arguments, so this needs to attach at the top level.
    parser.add_argument(
        "--no-dashboard", action="store_true",
        help=("Skip the in-process web dashboard. Required by strict "
              "MCP stdio clients (Codex, etc) that can't tolerate the "
              "dashboard thread's side-effects. Equivalent to setting "
              "EDA_AGENT_DISABLE_DASHBOARD=1 / EDA_AGENT_HEADLESS=1."),
    )
    parser.add_argument(
        "--headless", action="store_true",
        help="Alias for --no-dashboard.",
    )
    subparsers = parser.add_subparsers(dest="command", metavar="COMMAND")

    # serve -- default when no args given
    serve_p = subparsers.add_parser(
        "serve",
        help="Run the MCP server on stdio (default when no args given)",
    )
    serve_p.add_argument(
        "--no-dashboard", action="store_true",
        help="Skip the in-process web dashboard (see top-level flag).",
    )
    serve_p.add_argument(
        "--headless", action="store_true",
        help="Alias for --no-dashboard.",
    )

    # scripts-path
    subparsers.add_parser(
        "scripts-path",
        help="Print the path to the bundled DelphiScript files",
    )

    # install-scripts
    install_p = subparsers.add_parser(
        "install-scripts",
        help="Copy bundled scripts to a directory of your choice",
    )
    install_p.add_argument(
        "--dest",
        help=r"Destination directory (default: %%USERPROFILE%%\EDA Agent\scripts)",
    )
    install_p.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing scripts without prompting",
    )

    # health -- offline, fast
    subparsers.add_parser(
        "health",
        help="Fast offline preconditions (workspace, pointer file, scripts)",
    )

    # doctor -- full preflight, talks to Altium
    doctor_p = subparsers.add_parser(
        "doctor",
        help="Full preflight: workspace + Altium + version + canary IPC calls",
    )
    doctor_p.add_argument(
        "--library",
        action="append",
        default=[],
        metavar="PATH",
        help=(
            "Optional .SchLib path to test reachability. Repeat for "
            "multiple libs. The doctor never crawls; it only tests "
            "paths you supply."
        ),
    )
    doctor_p.add_argument(
        "--json",
        action="store_true",
        help="Emit machine-readable JSON instead of the text report.",
    )

    # dashboard -- local web UI for the MCP bridge
    dash_p = subparsers.add_parser(
        "dashboard",
        help=(
            "Launch the local web dashboard. Open http://127.0.0.1:8766 "
            "to see live MCP activity, performance, and health. The "
            "in-Altium status form has an 'Open Dashboard' button that "
            "auto-launches this server's URL via a workspace sentinel."
        ),
    )
    dash_p.add_argument("--host", default="127.0.0.1")
    dash_p.add_argument("--port", type=int, default=8766)
    dash_p.add_argument("--debug", action="store_true")

    # stop-dashboard -- terminate the dashboard process by PID file
    stop_dash_p = subparsers.add_parser(
        "stop-dashboard",
        help=("Stop the dashboard process (reads workspace/dashboard.pid). "
              "Use this when the dashboard was launched detached by the "
              "Altium script and you want to kill it without rebooting."),
    )

    # vote -- pairwise-preference vote UI in the browser
    vote_p = subparsers.add_parser(
        "vote",
        help=(
            "Launch the pairwise layout-preference vote UI in your "
            "browser. Generates two layouts of the same plan; you click "
            "the better one. Builds training data for the quality model."
        ),
    )
    vote_p.add_argument("--plan", required=True, type=Path,
                        help="Path to the DesignPlan JSON to vote on.")
    vote_p.add_argument("--symbols", type=Path, default=None,
                        help="Symbol fixtures JSON for offline mode. "
                             "Omit to use the live Altium bridge.")
    vote_p.add_argument("--host", default="127.0.0.1")
    vote_p.add_argument("--port", type=int, default=8765)
    vote_p.add_argument("--debug", action="store_true")

    args = parser.parse_args()

    if args.command is None or args.command == "serve":
        # Honour the flag whether it was given at the top level
        # (`eda-agent --no-dashboard`) or on the serve subcommand
        # (`eda-agent serve --no-dashboard`). Either form should work.
        no_dash = bool(
            getattr(args, "no_dashboard", False)
            or getattr(args, "headless", False)
        )
        return serve_mcp(no_dashboard=no_dash)

    # Lazy import -- keeps the hot stdio path free of CLI-only deps.
    from . import cli

    if args.command == "scripts-path":
        return cli.cmd_scripts_path()
    if args.command == "install-scripts":
        return cli.cmd_install_scripts(dest=args.dest, force=args.force)
    if args.command == "dashboard":
        from .web.dashboard import main as dashboard_main
        return dashboard_main([
            "--host", args.host,
            "--port", str(args.port),
            *(["--debug"] if args.debug else []),
        ])
    if args.command == "stop-dashboard":
        # Read the PID written by the dashboard process and SIGTERM it.
        # No PID file = no dashboard running -> success (idempotent stop).
        import os as _os, signal as _sig
        pid_path = get_config().workspace_dir / "dashboard.pid"
        if not pid_path.exists():
            print("dashboard.pid not found -- dashboard not running "
                  "(or workspace mismatch).")
            return 0
        try:
            pid = int(pid_path.read_text(encoding="utf-8").strip())
        except (OSError, ValueError) as e:
            print(f"could not read dashboard.pid: {e}")
            return 1
        try:
            if sys.platform == "win32":
                # On Windows, SIGTERM isn't honoured for native procs;
                # use TerminateProcess via taskkill for reliability.
                import subprocess as _sp
                _sp.run(["taskkill", "/PID", str(pid), "/F"],
                        capture_output=True, check=False)
            else:
                _os.kill(pid, _sig.SIGTERM)
            print(f"stopped dashboard pid {pid}")
            try: pid_path.unlink()
            except OSError: pass
            return 0
        except Exception as e:
            print(f"could not stop dashboard pid {pid}: {e}")
            return 1
    if args.command == "vote":
        from .web.server import main as vote_main
        return vote_main([
            "--plan", str(args.plan),
            *(["--symbols", str(args.symbols)] if args.symbols else []),
            "--host", args.host,
            "--port", str(args.port),
            *(["--debug"] if args.debug else []),
        ])
    if args.command in ("health", "doctor"):
        from .diag.checks import format_report, overall_exit_code
        if args.command == "health":
            from .diag.health import run_health_checks
            checks = run_health_checks()
            title = "eda-agent health"
        else:
            from .diag.doctor import run_doctor_checks
            checks = run_doctor_checks(library_paths=args.library)
            title = "eda-agent doctor"

        emit_json = bool(getattr(args, "json", False))
        if emit_json:
            import json as _json
            payload = {
                "title": title,
                "checks": [
                    {
                        "name": c.name,
                        "status": c.status.value,
                        "message": c.message,
                        "fix": c.fix,
                        "severity": c.severity.value,
                    }
                    for c in checks
                ],
            }
            print(_json.dumps(payload, indent=2))
        else:
            print(format_report(checks, title=title))
        return overall_exit_code(checks)

    parser.print_help(sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
