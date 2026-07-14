# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 George Saliba <george.saliba@salitronic.com>
"""Application-level tools for Altium Designer MCP Server."""

import re
from typing import Any, Optional
from .. import __version__ as _mcp_server_version
from ..bridge import get_bridge, AltiumNotRunningError
from ..cli import get_bundled_scripts_path
from .datasheet_hints import DATASHEET_RULES


_VERSION_RE = re.compile(r"SCRIPT_VERSION\s*=\s*'([^']+)'")

_SESSION_REMINDER = {
    "__DATASHEET_FIRST__": (
        "MANDATORY for this whole session: every device-related "
        "claim (pin function, pin number, rating, package, "
        "polarity, register, timing, threshold, behaviour, "
        "footprint pad map) requires the manufacturer datasheet, "
        "fetched and cited, BEFORE the answer. No exceptions. No "
        "'I'll assume'. No leaning on Comment / Description / "
        "Value, distributor copy, or prior-turn memory. WebSearch "
        "+ WebFetch the manufacturer PDF first, then answer with "
        "a section/page citation."
    ),
    "title": "Datasheet discipline, mandatory before every device-related claim",
    "rule": (
        "For ANY question that touches a real device (IC, sensor, "
        "regulator, MOSFET, connector, passive, anything), the "
        "manufacturer datasheet is the only authoritative source. "
        "Symbol metadata can be wrong, distributor pages can be "
        "wrong, your own prior-turn memory can be wrong. The "
        "datasheet is ground truth. Tool responses that surface "
        "component information carry a `_datasheet_guidance` "
        "block, treat it as a checklist, not an FYI."
    ),
    "datasheet_rules": DATASHEET_RULES,
}


def _bundled_script_version() -> Optional[str]:
    """Read SCRIPT_VERSION from the bundled Main.pas.

    Deliberately NOT cached: install-scripts can replace the bundle while
    this server keeps running, and a cached value then reports a false
    version mismatch (or false match) until the server restarts. The read
    is one small file on demand.

    Returns None if the file can't be found or parsed, in which case we
    skip the stale-cache comparison and just report whatever Altium
    reported.
    """
    try:
        main_pas = get_bundled_scripts_path() / "Main.pas"
        text = main_pas.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return None
    m = _VERSION_RE.search(text)
    return m.group(1) if m else None


def register_application_tools(mcp):
    """Register application tools with the MCP server."""

    @mcp.tool()
    async def app_get_status() -> dict[str, Any]:
        """Check if Altium Designer is running and get status information.

        Returns information about the Altium Designer process including:
        - Whether Altium is running
        - Process ID
        - Executable path
        - Whether the MCP bridge is attached

        Returns:
            Dictionary with status information
        """
        bridge = get_bridge()
        return bridge.get_altium_status()

    @mcp.tool()
    async def app_attach() -> dict[str, Any]:
        """Connect to a running Altium Designer instance.

        This verifies Altium is running and the polling script is responding.
        The Altium_API.PrjScr script must be running (StartMCPServer) in Altium.

        Returns:
            Dictionary with attachment status
        """
        bridge = get_bridge()
        try:
            bridge.attach()
            script_loaded = bridge.ping()
            return {
                "attached": True,
                "script_loaded": script_loaded,
                "message": "Connected to Altium Designer, script is responding"
                if script_loaded
                else "Altium is running but script is not responding. Run StartMCPServer in Altium_API.PrjScr.",
                "_system_reminder": _SESSION_REMINDER,
            }
        except AltiumNotRunningError as e:
            return {
                "attached": False,
                "script_loaded": False,
                "message": str(e),
                "_system_reminder": _SESSION_REMINDER,
            }

    @mcp.tool()
    async def app_save_all() -> dict[str, Any]:
        """Flush every dirty Altium document to disk.

        Mutation tools (pcb_place_tracks, move_component, modify_objects, ...)
        now mark documents as modified in-memory only. Changes stay fast
        because they skip per-operation disk writes. Call save_all at logical
        checkpoints, after a routing pass, before running DRC, or before
        closing, to persist everything.

        Detach also triggers save_all automatically, so you don't need this
        as the very last step.

        Returns:
            Dictionary confirming save
        """
        bridge = get_bridge()
        result = await bridge.send_command_async(
            "application.save_all", timeout=60.0
        )
        return result

    @mcp.tool()
    async def app_detach() -> dict[str, Any]:
        """Stop the Altium MCP polling loop. CALL THIS WHEN YOU'RE FINISHED.

        While the eda-agent MCP server is connected, a keep-alive thread pings
        Altium every 30 s, which keeps Altium's scripting engine held by the
        polling loop, Altium's own script-backed UI commands (some ribbon
        buttons, Parameter Manager actions, etc.) may be unresponsive until the
        loop is released.

        Call this tool once you've finished your Altium work for the session.
        It flushes every dirty document via save_all, then sends
        application.stop_server so the DelphiScript loop exits cleanly
        within ~500 ms and stops the Python keep-alive. Altium becomes
        immediately fully responsive.

        NOTE: After detach, the Altium script has fully stopped. To run more
        MCP tools later in the same Altium session the user must re-launch
        StartMCPServer via File -> Run Script. Don't detach until you're
        confident you're done.

        Returns:
            Dictionary confirming detachment
        """
        bridge = get_bridge()
        try:
            await bridge.send_command_async("application.stop_server", timeout=60.0)
        except Exception:
            pass  # Server may already be stopped
        bridge.detach()
        return {
            "attached": False,
            "message": "Detached from Altium Designer and stopped MCP server",
        }

    @mcp.tool()
    async def app_ping() -> dict[str, Any]:
        """Test if the Altium script is responding and report script version.

        Verifies that:
        1. Altium Designer is running
        2. The Altium_API.PrjScr script is running (StartMCPServer)
        3. File-based communication is working

        Also reads SCRIPT_VERSION from the .pas that Altium has compiled
        and compares it to the version in the bundled on-disk Main.pas.
        A mismatch means Altium is running a stale cached script, close
        and reopen Altium_API.PrjScr (or restart Altium) to recompile.

        Returns:
            Dictionary with:
            - success: True if Altium responded
            - mcp_server_version: version of this eda-agent Python package
              (from `eda_agent.__version__`), identifies the MCP server
              process currently handling tool calls
            - altium_script_version: version the running script reports
              (empty string if the script is too old to report it)
            - bundled_script_version: version of the on-disk Main.pas
            - version_match: True if Altium matches bundled script version
            - message: human-readable status (flags stale cache if detected)
        """
        bridge = get_bridge()
        if not bridge.is_altium_running():
            return {
                "success": False,
                "mcp_server_version": _mcp_server_version,
                "altium_script_version": None,
                "bundled_script_version": _bundled_script_version(),
                "version_match": False,
                "message": "Altium Designer is not running",
            }

        result = bridge.ping_with_version()
        bundled = _bundled_script_version()
        if result is None:
            return {
                "success": False,
                "mcp_server_version": _mcp_server_version,
                "altium_script_version": None,
                "bundled_script_version": bundled,
                "version_match": False,
                "message": "Altium script is not responding. Run StartMCPServer in Altium_API.PrjScr.",
            }

        altium_ver = result.get("script_version") or ""
        if bundled is None:
            match = False
            msg = "Altium script is responding (bundled version unknown)."
        elif altium_ver == "":
            match = False
            msg = (
                "Altium script is responding but predates version reporting. "
                "Close and reopen Altium_API.PrjScr to pick up the new code."
            )
        elif altium_ver == bundled:
            match = True
            msg = f"Altium script is responding (version {altium_ver})."
        else:
            match = False
            msg = (
                f"STALE SCRIPT CACHE: Altium is running version {altium_ver}, "
                f"but the on-disk bundle is {bundled}. Close and reopen "
                f"Altium_API.PrjScr (or restart Altium) to recompile."
            )

        return {
            "success": True,
            "mcp_server_version": _mcp_server_version,
            "altium_script_version": altium_ver,
            "bundled_script_version": bundled,
            "version_match": match,
            "message": msg,
            "_system_reminder": _SESSION_REMINDER,
        }

    @mcp.tool()
    async def app_get_report() -> dict[str, Any]:
        """Report the health of the MCP bridge, workspace, and Altium link.

        One call to diagnose the plumbing without touching the design:
        package version, the script version on disk vs. what Altium has
        compiled, whether Altium is up, the live IPC round-trip time, the
        workspace location, and how many request/response/stop files are
        sitting in it (a backlog of stale request_*.json usually means a
        dead or wedged poller).

        Returns:
            Dictionary with mcp_server_version, bundled_script_version,
            altium_running, altium_script_version, version_match,
            round_trip_ms (None if Altium is down), workspace_dir,
            workspace_exists, and a file_counts breakdown.
        """
        import time
        from ..config import get_config

        bridge = get_bridge()
        ws = get_config().workspace_dir
        ws_exists = ws.exists()

        counts = {"request": 0, "response": 0, "progress": 0, "stop": 0, "other": 0}
        if ws_exists:
            try:
                for entry in ws.iterdir():
                    if not entry.is_file():
                        continue
                    n = entry.name
                    if n.startswith("request_"):
                        counts["request"] += 1
                    elif n.startswith("response_"):
                        counts["response"] += 1
                    elif n.startswith("progress_"):
                        counts["progress"] += 1
                    elif n == "stop":
                        counts["stop"] += 1
                    else:
                        counts["other"] += 1
            except OSError:
                pass

        bundled = _bundled_script_version()
        running = bridge.is_altium_running()
        altium_ver: Optional[str] = None
        match = False
        round_trip_ms: Optional[float] = None
        if running:
            start = time.perf_counter()
            ping = bridge.ping_with_version()
            if ping is not None:
                round_trip_ms = round((time.perf_counter() - start) * 1000.0, 1)
                altium_ver = ping.get("script_version") or ""
                match = bundled is not None and altium_ver == bundled

        return {
            "mcp_server_version": _mcp_server_version,
            "bundled_script_version": bundled,
            "altium_running": running,
            "altium_script_version": altium_ver,
            "version_match": match,
            "round_trip_ms": round_trip_ms,
            "workspace_dir": str(ws),
            "workspace_exists": ws_exists,
            "file_counts": counts,
        }

    @mcp.tool()
    async def app_create_document(
        kind: str,
        file_path: str,
        name: Optional[str] = None,
        add_to_project: bool = True,
    ) -> dict[str, Any]:
        """Create a new blank document of a given kind and save it to disk.

        Wraps IClient.OpenNewDocument + DoFileSave. The new document is
        written to `file_path` and, by default, attached to the currently
        focused project. Use this to create a .PcbDoc before running
        update_pcb, to spin up a fresh .SchDoc, library, OutJob, etc.

        Args:
            kind: Document kind, 'PCB', 'SCH', 'PCBLIB', 'SCHLIB',
                'OUTPUTJOB', or any other kind Altium's server module
                registers under.
            file_path: Absolute path where the new document should live.
                Use Windows backslashes.
            name: Optional display name. Defaults to the filename.
            add_to_project: Attach the new file to the focused project.
                Default True. Set False to leave it as a free document.

        Returns:
            Dictionary with kind, file_path, saved, added_to_project.
        """
        bridge = get_bridge()
        params: dict[str, Any] = {
            "kind": kind,
            "file_path": file_path,
            "add_to_project": "true" if add_to_project else "false",
        }
        if name:
            params["name"] = name
        result = await bridge.send_command_async(
            "application.create_document", params
        )
        return result

    @mcp.tool()
    async def app_list_documents() -> list[dict[str, Any]]:
        """List all documents known to the current Altium workspace.

        Returns both project members and any free documents. Each entry
        carries a `loaded` flag that distinguishes "listed as project
        member on disk" from "actually resident in the editor".
        Project-scope queries (query_objects, batch_modify, ...) only
        iterate loaded sheets, if `loaded` is false for sheets you need
        to hit, call load_project_sheets first.

        Returns:
            List of document information dictionaries containing:
            - file_name: Document file name
            - file_path: Full file path
            - document_kind: Type of document (SCH, PCB, etc.)
            - loaded: True if the doc is resident in the editor server.
              False means it's a project member on disk whose editor
              state hasn't been opened yet.
        """
        bridge = get_bridge()
        result = await bridge.send_command_async("application.get_open_documents")
        return result

    @mcp.tool()
    async def app_diag_workspace(pattern: str = "request_*.json") -> dict[str, Any]:
        """Diagnostic: enumerate workspace files via Altium's FindFiles helper.

        Reports workspace_dir, the pattern used, match_count and the first
        10 matching filenames. Used to validate the per-request file
        enumeration that the dispatcher relies on.
        """
        bridge = get_bridge()
        return await bridge.send_command_async(
            "application.diag_workspace",
            {"pattern": pattern},
            timeout=10.0,
        )

    @mcp.tool()
    async def app_get_active_document() -> dict[str, Any]:
        """Get information about the currently active (focused) document.

        Returns:
            Dictionary with active document information:
            - file_name: Document file name
            - file_path: Full file path
            - document_kind: Type of document (SchDoc, PcbDoc, etc.)
            - modified: Whether the document has unsaved changes
            Returns empty dict if no document is active.
        """
        bridge = get_bridge()
        result = await bridge.send_command_async("application.get_active_document")
        return result

    @mcp.tool()
    async def app_set_active_document(file_path: str) -> dict[str, Any]:
        """Set a specific document as the active (focused) document.

        Args:
            file_path: Full path to the document to activate

        Returns:
            Dictionary with result of the operation
        """
        bridge = get_bridge()
        result = await bridge.send_command_async(
            "application.set_active_document", {"file_path": file_path}
        )
        if isinstance(result, dict):
            return {"success": True, "file_path": file_path, **result}
        elif result:
            return {"success": True, "file_path": file_path, "data": result}
        else:
            return {"success": True, "file_path": file_path}

    @mcp.tool()
    async def app_get_version() -> dict[str, Any]:
        """Get the version of Altium Designer.

        Uses Client.GetProductVersion internally. If that API is unavailable
        (older builds or restricted script context), the returned dictionary
        will omit "version" and include a "note" field instead.

        Returns:
            Dictionary with product_name and either:
            - version: Full version string (when Client.GetProductVersion works)
            - note: Explanation when the version API is unavailable
        """
        bridge = get_bridge()
        result = await bridge.send_command_async("application.get_version")
        return result

    # ------------------------------------------------------------------
    # Preferences, menu execution, clipboard
    # ------------------------------------------------------------------

    @mcp.tool()
    async def app_get_preferences() -> dict[str, Any]:
        """Get key Altium Designer preferences.

        Returns PCB preferences (snap grid, display unit) from the active board
        and schematic preferences (visible/snap grid) from the active schematic.
        Values are null if no PCB or schematic is currently open.

        Returns:
            Dictionary with "pcb" and "schematic" sub-objects containing
            grid and unit settings
        """
        bridge = get_bridge()
        result = await bridge.send_command_async("application.get_preferences")
        return result

    @mcp.tool()
    async def app_run_menu(menu_path: str) -> dict[str, Any]:
        """Execute a menu command by its path.

        Supports common menu paths which are mapped to internal processes:
        - "File|Save All"
        - "Tools|Design Rule Check"
        - "Tools|Electrical Rules Check"
        - "Project|Compile"
        - "Edit|Select All" / "Edit|Deselect All"
        - "View|Zoom Fit"
        - "Tools|Preferences"
        - "Tools|Extensions and Updates"

        Unknown paths are attempted via Client.SendMessage.

        Args:
            menu_path: Menu path using pipe separators (e.g., "File|Save All")

        Returns:
            Dictionary with success status, menu_path, and process used
        """
        bridge = get_bridge()
        result = await bridge.send_command_async(
            "application.execute_menu", {"menu_path": menu_path}
        )
        if isinstance(result, dict):
            return {"success": True, **result}
        return result or {"success": True, "menu_path": menu_path}

    @mcp.tool()
    async def app_set_intent(intent: str) -> dict[str, Any]:
        """Tell the dashboard what high-level task the agent is working on.

        The text is written to ``workspace/intent.txt`` where the web
        dashboard polls it and shows a banner. Purely informational --
        does not affect tool dispatch in any way. Call this once at the
        start of a long task ("reviewing buck-converter feedback divider",
        "auto-placing the analog front-end on sheet B") so the user
        watching the dashboard knows what's happening between IPC
        events. Pass an empty string to clear the banner.

        Args:
            intent: Short human-readable description (one line, <=240 chars).

        Returns:
            ``{"ok": true, "intent": "<truncated text>"}``.
        """
        from ..config import get_config
        text = (intent or "").strip()
        if len(text) > 240:
            text = text[:240]
        path = get_config().workspace_dir / "intent.txt"
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            if text:
                # Atomic write (temp + os.replace) so the Altium polling
                # loop only ever opens a complete, CLOSED file. A plain
                # write_text holds intent.txt open for write; if the loop
                # reads it in that window it hits a sharing violation that
                # the script engine surfaces as a modal. Invariant: every
                # workspace file the Pascal side reads MUST be written this
                # way (see request files, dashboard.heartbeat).
                import os as _os
                tmp = path.with_suffix(".txt.tmp")
                tmp.write_text(text, encoding="utf-8")
                _os.replace(tmp, path)
            elif path.exists():
                path.unlink()
        except OSError as e:
            return {"ok": False, "error": str(e)}
        return {"ok": True, "intent": text}

    @mcp.tool()
    async def app_get_clipboard() -> dict[str, Any]:
        """Get text content from the Windows clipboard.

        Returns whatever text is currently on the clipboard, which can be
        useful for reading data copied from Altium dialogs or reports.

        Returns:
            Dictionary with "text" containing the clipboard content.
            Returns empty string if clipboard is empty or non-text.
        """
        bridge = get_bridge()
        result = await bridge.send_command_async("application.get_clipboard_text")
        return result
