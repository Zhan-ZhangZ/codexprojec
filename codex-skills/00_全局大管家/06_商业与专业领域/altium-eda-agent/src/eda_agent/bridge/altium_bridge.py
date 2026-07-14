# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 George Saliba <george.saliba@salitronic.com>
"""Communication bridge between Python and Altium Designer via file-based IPC.

Per-request file scheme: Python writes ``request_<id>.json``, Altium scans the
workspace, processes it, and writes ``response_<id>.json``. Each side polls
only for files matching its own request ID, eliminating the stale-response
race that the older single-file scheme had when keep-alive pings overlapped
user tool calls.
"""

import json
import logging
import os
import sys
import time
import uuid
import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor

from pathlib import Path
from typing import Any, Optional
from dataclasses import dataclass, field

# NOTE: no cross-process or publish lock is needed here. Each caller writes
# its own request_<id>.json (staged to .json.tmp, then atomically renamed)
# and polls its own response_<id>.json, so concurrent publishers -- threads
# or separate processes -- never share a filename. A file-locking primitive
# that once guarded a single shared pointer file was removed with that
# design.

from ..config import get_config
from .process_manager import AltiumProcessManager
from .exceptions import (
    AltiumNotRunningError,
    AltiumTimeoutError,
    AltiumCommandError,
    AltiumProtocolError,
    ScriptNotLoadedError,
    raise_for_code,
)

logger = logging.getLogger("eda_agent.bridge")

# Wire protocol version. Must match scripts/altium/Main.pas:PROTOCOL_VERSION.
# Bump together; mismatch raises AltiumProtocolError on either side.
PROTOCOL_VERSION = 2

# Heartbeat-aware deadline extension cap. The Pascal dispatcher writes a
# progress_<id>.json marker while a handler runs; Python's poll loop extends
# the per-call deadline by another `timeout` window each time it observes
# fresh progress, up to this many extensions. With the default 10 s timeout
# this gives a 300 s ceiling per command -- plenty for heavy emit / compile
# passes while still catching runaway handlers.
_MAX_HEARTBEAT_EXTENSIONS = 30

# Thread pool for blocking I/O
_executor = ThreadPoolExecutor(max_workers=1)


def _trace_log(workspace_dir: Path, msg: str) -> None:
    """Append a line to workspace/bridge_trace.log. Never raises."""
    try:
        path = workspace_dir / "bridge_trace.log"
        with open(path, "a", encoding="utf-8") as f:
            f.write(f"{time.time():.3f} {msg}\n")
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Event-driven response pickup (Windows).
#
# The response-poll loop used to sleep a fixed poll_interval between checks,
# adding up to that interval of latency to every call. FindFirstChangeNotification
# lets us BLOCK until the workspace directory changes, so the instant Pascal
# writes response_<id>.json we wake and read it -- the Python half of the
# round-trip drops to ~0. Pascal still has to poll (it can't block without
# freezing Altium's UI), but this removes our side of the latency.
#
# All of this degrades gracefully: if kernel32 isn't available the helpers
# return None / False and the caller falls back to time.sleep.
# ---------------------------------------------------------------------------

_FILE_NOTIFY_CHANGE_FILE_NAME = 0x00000001
_WAIT_OBJECT_0 = 0x00000000

_kernel32 = None
if sys.platform == "win32":
    try:
        import ctypes
        from ctypes import wintypes

        _kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        _kernel32.FindFirstChangeNotificationW.restype = wintypes.HANDLE
        _kernel32.FindFirstChangeNotificationW.argtypes = [
            wintypes.LPCWSTR, wintypes.BOOL, wintypes.DWORD]
        _kernel32.FindNextChangeNotification.restype = wintypes.BOOL
        _kernel32.FindNextChangeNotification.argtypes = [wintypes.HANDLE]
        _kernel32.FindCloseChangeNotification.restype = wintypes.BOOL
        _kernel32.FindCloseChangeNotification.argtypes = [wintypes.HANDLE]
        _kernel32.WaitForSingleObject.restype = wintypes.DWORD
        _kernel32.WaitForSingleObject.argtypes = [
            wintypes.HANDLE, wintypes.DWORD]
    except Exception as _e:  # pragma: no cover - platform dependent
        _kernel32 = None
        logger.debug("directory-watch unavailable, falling back to sleep: %s", _e)

_INVALID_HANDLE = ctypes.c_void_p(-1).value if _kernel32 is not None else None


def _make_dir_watcher(directory: Path):
    """Open a change-notification handle for ``directory``.

    Returns the handle, or None if change-notification is unavailable
    (the caller then falls back to time.sleep polling).
    """
    if _kernel32 is None:
        return None
    try:
        handle = _kernel32.FindFirstChangeNotificationW(
            str(directory), False, _FILE_NOTIFY_CHANGE_FILE_NAME)
        if not handle or handle == _INVALID_HANDLE:
            return None
        return handle
    except Exception:
        return None


def _wait_dir_change(handle, timeout_ms: float) -> bool:
    """Block until the watched directory changes or the timeout elapses.

    Re-arms the notification on a real change. Returns True on a change,
    False on timeout or error. A False return is harmless -- the caller's
    loop just re-checks the response file and waits again.
    """
    if _kernel32 is None or handle is None:
        return False
    try:
        res = _kernel32.WaitForSingleObject(handle, int(timeout_ms))
        if res == _WAIT_OBJECT_0:
            _kernel32.FindNextChangeNotification(handle)
            return True
        return False
    except Exception:
        return False


def _close_dir_watcher(handle) -> None:
    if _kernel32 is None or handle is None:
        return
    try:
        _kernel32.FindCloseChangeNotification(handle)
    except Exception:
        pass


def _short_id() -> str:
    """Compact ID safe for filenames: 32 hex chars, no hyphens."""
    return uuid.uuid4().hex


@dataclass
class CommandRequest:
    """A command request to be sent to Altium."""

    command: str
    params: dict[str, Any] = field(default_factory=dict)
    id: str = field(default_factory=_short_id)

    def to_dict(self) -> dict:
        return {
            "protocol_version": PROTOCOL_VERSION,
            "id": self.id,
            "command": self.command,
            "params": self.params,
        }


@dataclass
class CommandResponse:
    """A response from Altium."""

    id: str
    success: bool
    protocol_version: int = 0
    data: Any = None
    error: Optional[dict] = None

    @classmethod
    def from_dict(cls, data: dict) -> "CommandResponse":
        return cls(
            id=data.get("id", ""),
            success=data.get("success", False),
            protocol_version=data.get("protocol_version", 0),
            data=data.get("data"),
            error=data.get("error"),
        )


class AltiumBridge:
    """Handles communication with Altium Designer via file-based IPC.

    Flow:
        1. Python writes ``request_<id>.json`` (atomic via tmp + rename)
        2. Altium's polling script picks it up, deletes it, processes it
        3. Altium writes ``response_<id>.json`` (atomic via tmp + rename)
        4. Python polls for ``response_<id>.json`` and reads it

    With per-request files there is no shared file across callers, so
    concurrent calls (keep-alive ping + user tool) do not collide.
    """

    KEEPALIVE_INTERVAL = 30  # seconds
    DETACH_HINT_AFTER = 600  # seconds

    def __init__(self):
        self.config = get_config()
        self.process_manager = AltiumProcessManager()
        self._attached = False
        self._keepalive_thread: Optional[threading.Thread] = None
        self._keepalive_stop = threading.Event()
        self._attach_time: Optional[float] = None
        self._detach_hint_shown = False
        # The heavy workspace prep -- pointer file, runtime config, and the
        # Pydantic-schema export -- only needs to run once. Doing it on every
        # _publish_request added 1s+ of disk I/O per IPC call. This flag
        # gates it to a single run; per-request we only ensure the dir.
        self._workspace_prepared = False

    def ensure_workspace(self) -> None:
        self.config.ensure_workspace()
        self._sweep_orphan_responses()
        self._workspace_prepared = True

    def _ensure_workspace_fast(self) -> None:
        """Per-request workspace guard. Cheap by design.

        The full ``ensure_workspace`` re-exports JSON schemas and rewrites
        the pointer/config files -- ~1s of disk I/O. That belongs at attach
        time, not on every IPC call. Here we only guarantee the directory
        exists; the one-time heavy prep runs lazily on the first request if
        ``attach()`` somehow hasn't run yet.
        """
        if not self._workspace_prepared:
            try:
                self.ensure_workspace()
            except Exception as e:
                logger.debug("one-time workspace prep failed: %s", e)
                # Fall through to the cheap mkdir so the request can still go.
            self._workspace_prepared = True
        try:
            self.config.workspace_dir.mkdir(parents=True, exist_ok=True)
        except OSError as e:
            logger.debug("workspace mkdir failed: %s", e)

    def _sweep_orphan_responses(self, max_age_seconds: float = 60.0) -> None:
        """Delete response_*.json files older than ``max_age_seconds``.

        Pascal's CleanupOrphanResponses can't enumerate the workspace
        (DelphiScript's FindFirst is broken), so the orphan-response
        sweep lives here. Python has reliable globbing and runs this on
        every ensure_workspace, typically once per attach + once per
        request. The age filter avoids racing with concurrent in-flight
        callers whose response is being polled right now.
        """
        cutoff = time.time() - max_age_seconds
        try:
            workspace = self.config.workspace_dir
            if not workspace.exists():
                return
            for path in workspace.glob("response_*.json"):
                try:
                    if path.stat().st_mtime < cutoff:
                        path.unlink()
                except OSError:
                    pass
            # Stray .tmp files from older builds that did atomic rename
            for path in workspace.glob("response_*.json.tmp"):
                try:
                    path.unlink()
                except OSError:
                    pass
        except OSError:
            pass

    def is_altium_running(self) -> bool:
        return self.process_manager.is_altium_running()

    def get_altium_status(self) -> dict:
        process = self.process_manager.get_altium_info()
        if process:
            return {
                "running": True,
                "pid": process.pid,
                "exe_path": process.exe_path,
                "attached": self._attached,
            }
        return {
            "running": False,
            "pid": None,
            "exe_path": None,
            "attached": False,
        }

    def attach(self) -> bool:
        if not self.is_altium_running():
            raise AltiumNotRunningError()
        self.ensure_workspace()
        self._attached = True
        self._attach_time = time.monotonic()
        self._start_keepalive()
        logger.info("Attached to Altium Designer (file-based IPC, protocol v%d)", PROTOCOL_VERSION)
        return True

    def detach(self) -> None:
        self._stop_keepalive()
        self._attached = False
        self._attach_time = None
        self._detach_hint_shown = False

    def _ensure_keepalive(self) -> None:
        if self._attached and self._keepalive_thread and self._keepalive_thread.is_alive():
            return
        self._attached = True
        self._attach_time = time.monotonic()
        self._start_keepalive()

    def attach_duration(self) -> float:
        if self._attach_time is None:
            return 0.0
        return time.monotonic() - self._attach_time

    def _maybe_attach_detach_hint(self, command: str, data: Any) -> Any:
        if command in ("application.ping", "application.stop_server"):
            return data
        if self._detach_hint_shown:
            return data
        if self.attach_duration() < self.DETACH_HINT_AFTER:
            return data
        if not isinstance(data, dict):
            return data
        self._detach_hint_shown = True
        data = dict(data)
        data["_hint_detach"] = (
            "This MCP server has been holding Altium's scripting engine for "
            "over 10 minutes. When your Altium work is done, call "
            "detach_from_altium so Altium's own UI commands become responsive "
            "again. The user will have to re-launch StartMCPServer in Altium "
            "to run more MCP tools afterwards."
        )
        return data

    def _start_keepalive(self) -> None:
        self._stop_keepalive()
        # A keep-alive (re)start is also the natural moment to clear orphaned
        # response files: it runs on attach AND whenever a dead thread is
        # revived by the next tool call, so debris from a crashed call gets
        # cleaned without waiting for a full re-attach.
        try:
            self._sweep_orphan_responses()
        except Exception:
            pass
        self._keepalive_stop.clear()
        self._keepalive_thread = threading.Thread(
            target=self._keepalive_loop, daemon=True, name="altium-keepalive"
        )
        self._keepalive_thread.start()
        logger.debug("Keep-alive thread started (interval=%ds)", self.KEEPALIVE_INTERVAL)

    def _stop_keepalive(self) -> None:
        if self._keepalive_thread and self._keepalive_thread.is_alive():
            self._keepalive_stop.set()
            self._keepalive_thread.join(timeout=5)
            logger.debug("Keep-alive thread stopped")
        self._keepalive_thread = None

    def _keepalive_loop(self) -> None:
        # The keep-alive thread also drives the "Open Dashboard" sentinel:
        # the in-Altium status form drops workspace/open_dashboard.url whose
        # contents are a URL, and we open it in the user's default browser.
        # Sentinel checks run on a faster cadence than the 30s keep-alive
        # ping so the button feels responsive (~1s to react).
        sentinel_interval = 1.0
        ticks_per_ping = max(1, int(self.KEEPALIVE_INTERVAL / sentinel_interval))
        tick = 0
        # One slow/failed ping must not kill the keep-alive: a long tool call
        # holds the serialized bridge past the 5s ping timeout, and a dead
        # keep-alive lets Altium's 60s idle auto-shutdown stop the polling
        # loop. Only give up after several consecutive failures, and say so
        # loudly -- a silently dead keep-alive looks like a transport drop.
        consecutive_failures = 0
        max_failures = 3
        while not self._keepalive_stop.wait(sentinel_interval):
            if not self._attached:
                break
            self._maybe_open_dashboard_sentinel()
            tick += 1
            if tick >= ticks_per_ping:
                tick = 0
                try:
                    self.send_command("application.ping", timeout=5.0)
                    consecutive_failures = 0
                except Exception:
                    consecutive_failures += 1
                    logger.debug(
                        "Keep-alive ping failed (%d/%d)",
                        consecutive_failures, max_failures)
                    if consecutive_failures >= max_failures:
                        logger.warning(
                            "Keep-alive exiting after %d consecutive failed "
                            "pings -- Altium polling loop is likely stopped. "
                            "It restarts on the next tool call.", max_failures)
                        break

    def _maybe_open_dashboard_sentinel(self) -> None:
        """If the Altium status form dropped open_dashboard.url, open it.

        The sentinel file's content is a URL (anything starting with http:// or
        https:// is accepted). The file is removed after the open call so the
        same trigger doesn't fire twice. Any error is logged and swallowed --
        a missing sentinel is the common case on every tick.
        """
        sentinel = self.config.workspace_dir / "open_dashboard.url"
        if not sentinel.exists():
            return
        try:
            url = sentinel.read_text(encoding="utf-8", errors="replace").strip()
        except OSError:
            return
        try:
            sentinel.unlink()
        except OSError:
            pass
        if not url.startswith("http://") and not url.startswith("https://"):
            logger.debug("dashboard sentinel had bad URL: %r", url[:80])
            return
        try:
            import webbrowser
            webbrowser.open(url)
            logger.info("opened dashboard URL: %s", url)
        except Exception as e:
            logger.debug("webbrowser.open failed: %s", e)

    def _response_path(self, request_id: str) -> Path:
        return self.config.workspace_dir / f"response_{request_id}.json"

    def _request_path(self, request_id: str) -> Path:
        return self.config.workspace_dir / f"request_{request_id}.json"

    def _progress_path(self, request_id: str) -> Path:
        return self.config.workspace_dir / f"progress_{request_id}.json"

    def _publish_request(self, request: CommandRequest) -> None:
        """Publish a request to its own per-request file.

        Per-request request files (request_<id>.json) plus per-request
        response files (response_<id>.json) eliminate cross-caller races
        entirely; each caller has private filenames on both sides.
        Pascal enumerates request_*.json via FindFiles (the documented
        Altium DelphiScript helper). No lock needed: concurrent publishers
        write to different filenames.

        Atomic write: stage the body to ``.json.tmp`` (which Pascal's
        FindFiles glob ignores) then rename to the final filename. Without
        this, Pascal could pick up a half-written file and hit a sharing
        violation when its Reset() collides with Python's still-open
        write handle.
        """
        self._ensure_workspace_fast()
        request_path = self._request_path(request.id)
        tmp_path = request_path.with_suffix(".json.tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(request.to_dict(), f, indent=2)
        tmp_path.replace(request_path)
        logger.debug("Published request %s: %s", request.id, request.command)

    def _poll_response(self, request_id: str, timeout: float) -> CommandResponse:
        """Poll for response_<id>.json. Returns when it appears, raises on
        timeout.

        Heartbeat-aware. The Pascal dispatcher writes progress_<id>.json
        before invoking a handler and deletes it after the response is
        written. While progress_<id>.json exists, the polling loop is
        actively working on this request -- a legitimately slow handler is
        not a "polling loop dead" signal. We extend the deadline by another
        ``timeout`` window each time the heartbeat is still ticking, up to
        ``_MAX_HEARTBEAT_EXTENSIONS`` extensions before declaring the
        operation truly stuck. Default ceiling: 30 * 10 s = 5 minutes per
        command, which covers heavy emits / compiles without losing the
        early failure detection of the original 10 s timeout.

        Race window: Pascal writes the response THEN deletes the progress
        file, so at no instant are both absent. When the per-window
        deadline fires we re-check the response one more time after the
        progress check, in case the heartbeat was cleared between the two
        observations.
        """
        response_path = self._response_path(request_id)
        progress_path = self._progress_path(request_id)
        workspace_dir = self.config.workspace_dir
        poll_interval = self.config.poll_interval
        deadline = time.monotonic() + timeout
        start = time.monotonic()

        _trace_log(
            workspace_dir,
            f"POLL_START id={request_id[:8]} timeout={timeout}s "
            f"interval={poll_interval}s",
        )

        # Event-driven wait: wake the instant Pascal writes our response
        # file instead of sleeping a fixed poll_interval. The watcher is
        # closed in the finally below; if it couldn't be created the loop
        # falls back to time.sleep transparently.
        watcher = _make_dir_watcher(workspace_dir)
        try:
            return self._poll_loop(
                request_id, response_path, progress_path, workspace_dir,
                poll_interval, deadline, timeout, start, watcher,
            )
        finally:
            _close_dir_watcher(watcher)

    def _poll_loop(self, request_id, response_path, progress_path,
                   workspace_dir, poll_interval, deadline, timeout,
                   start, watcher) -> CommandResponse:
        """Inner poll loop for _poll_response. Split out so the watcher
        handle can be closed via a single try/finally regardless of which
        exit path (match / timeout / break) the loop takes."""
        extensions = 0
        poll_count = 0
        first_appearance: Optional[float] = None
        parse_errors = 0

        while True:
            poll_count += 1
            if response_path.exists():
                if first_appearance is None:
                    first_appearance = time.monotonic() - start
                    _trace_log(
                        workspace_dir,
                        f"POLL_SEEN id={request_id[:8]} "
                        f"after={first_appearance*1000:.0f}ms polls={poll_count}",
                    )
                try:
                    with open(response_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                except (json.JSONDecodeError, IOError, UnicodeDecodeError) as e:
                    parse_errors += 1
                    if parse_errors <= 3 or parse_errors % 50 == 0:
                        _trace_log(
                            workspace_dir,
                            f"POLL_PARSE_ERR id={request_id[:8]} "
                            f"err={type(e).__name__} count={parse_errors}",
                        )
                    # A handful of parse errors is normal while Pascal is
                    # mid-write; hundreds means the file is permanently
                    # corrupt (Pascal died mid-write). Fail fast with an
                    # accurate diagnosis instead of burning the rest of the
                    # deadline and reporting "loop not running".
                    if parse_errors >= 200:
                        try:
                            response_path.unlink()
                        except OSError:
                            pass
                        raise AltiumCommandError(
                            f"Response file for request {request_id[:8]} was "
                            f"present but unparseable after {parse_errors} "
                            f"attempts -- Altium likely crashed mid-write. "
                            f"The corrupt file was removed; retry the call."
                        )
                    # Fall through to the deadline check so a permanently
                    # corrupt file cannot wedge us in an infinite parse loop.
                else:
                    try:
                        response_path.unlink()
                    except OSError:
                        pass

                    elapsed = (time.monotonic() - start) * 1000
                    _trace_log(
                        workspace_dir,
                        f"POLL_MATCH id={request_id[:8]} elapsed={elapsed:.0f}ms "
                        f"polls={poll_count} parse_errs={parse_errors} "
                        f"extensions={extensions}",
                    )
                    return CommandResponse.from_dict(data)

            if time.monotonic() >= deadline:
                # Window expired. Heartbeat still ticking? extend.
                if progress_path.exists() and extensions < _MAX_HEARTBEAT_EXTENSIONS:
                    extensions += 1
                    elapsed = (time.monotonic() - start) * 1000
                    _trace_log(
                        workspace_dir,
                        f"POLL_EXTEND id={request_id[:8]} "
                        f"extensions={extensions}/{_MAX_HEARTBEAT_EXTENSIONS} "
                        f"elapsed={elapsed:.0f}ms",
                    )
                    deadline = time.monotonic() + timeout
                    continue
                # Race window: progress was cleared between deletion and
                # our check. Take one more response peek before giving up,
                # but ONLY if we have not already been parsing the file --
                # otherwise a permanently-corrupt response would loop here
                # forever. ``first_appearance`` being non-None means we've
                # already opened the file at least once and the top-of-
                # loop parse check is doing its job; no need to re-enter.
                if first_appearance is None and response_path.exists():
                    continue
                break

            # Wait for the workspace directory to change (Pascal writing
            # our response file is exactly such a change) -- wakes us
            # immediately instead of after a fixed poll_interval. Falls
            # back to a plain sleep when the watcher is unavailable.
            if watcher is not None:
                _wait_dir_change(watcher, poll_interval * 1000.0)
            else:
                time.sleep(poll_interval)

        elapsed = (time.monotonic() - start) * 1000
        _trace_log(
            workspace_dir,
            f"POLL_TIMEOUT id={request_id[:8]} elapsed={elapsed:.0f}ms "
            f"polls={poll_count} parse_errs={parse_errors} "
            f"extensions={extensions} "
            f"first_seen_ms={first_appearance*1000 if first_appearance else -1}",
        )
        if extensions >= _MAX_HEARTBEAT_EXTENSIONS:
            raise AltiumTimeoutError(
                f"Handler exceeded {_MAX_HEARTBEAT_EXTENSIONS} heartbeat "
                f"extensions ({_MAX_HEARTBEAT_EXTENSIONS * timeout:.0f}s "
                f"total); Altium is responding to keepalives but the command "
                f"never returned. The handler is likely stuck in an infinite "
                f"loop."
            )
        raise AltiumTimeoutError(
            f"No response within {timeout}s and no progress heartbeat. The "
            f"Altium polling loop is probably not running -- relaunch "
            f"StartMCPServer."
        )

    def _execute_command(self, command: str, params: dict[str, Any], timeout: float) -> Any:
        """Execute a command synchronously (blocking)."""
        request = CommandRequest(command=command, params=params)
        workspace_dir = self.config.workspace_dir

        _trace_log(workspace_dir, f"SEND cmd={command} id={request.id[:8]}")
        self._publish_request(request)
        logger.info("Sent command: %s (id=%s)", command, request.id[:8])

        response_path = self._response_path(request.id)
        try:
            response = self._poll_response(request.id, timeout)
        finally:
            # Always sweep our own response file on the way out,_poll_response
            # already deletes it on success, but a timeout or a late-arriving
            # response would otherwise be orphaned forever.
            try:
                if response_path.exists():
                    response_path.unlink()
            except OSError:
                pass

        if response.protocol_version and response.protocol_version != PROTOCOL_VERSION:
            raise AltiumProtocolError(
                client_version=PROTOCOL_VERSION,
                server_version=response.protocol_version,
            )

        if response.success:
            logger.info("Command %s succeeded", command)
            return self._maybe_attach_detach_hint(command, response.data)

        error = response.error or {}
        code = error.get("code", "UNKNOWN_ERROR")
        message = error.get("message", "Unknown error")
        details = error.get("details")
        logger.warning("Command %s failed: %s - %s", command, code, message)
        raise_for_code(code, message, details)

    def send_command(
        self,
        command: str,
        params: Optional[dict[str, Any]] = None,
        timeout: Optional[float] = None,
    ) -> Any:
        if not self.is_altium_running():
            raise AltiumNotRunningError()
        if timeout is None:
            timeout = self.config.poll_timeout
        self._ensure_keepalive()
        return self._execute_command(command, params or {}, timeout)

    async def send_command_async(
        self,
        command: str,
        params: Optional[dict[str, Any]] = None,
        timeout: Optional[float] = None,
    ) -> Any:
        if not self.is_altium_running():
            raise AltiumNotRunningError()
        if timeout is None:
            timeout = self.config.poll_timeout
        self._ensure_keepalive()
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            _executor,
            self._execute_command,
            command,
            params or {},
            timeout,
        )

    def ping(self) -> bool:
        try:
            self.send_command("application.ping", timeout=3.0)
            return True
        except (AltiumTimeoutError, AltiumCommandError, Exception):
            return False

    def ping_with_version(self) -> Optional[dict[str, Any]]:
        try:
            result = self.send_command("application.ping", timeout=3.0)
        except (AltiumTimeoutError, AltiumCommandError, Exception):
            return None
        if isinstance(result, dict):
            return result
        if result == "pong":
            return {"pong": True, "script_version": ""}
        return None


_bridge: Optional[AltiumBridge] = None


def get_bridge() -> AltiumBridge:
    global _bridge
    if _bridge is None:
        _bridge = AltiumBridge()
    return _bridge


def reset_bridge() -> None:
    global _bridge
    _bridge = None
