# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 George Saliba <george.saliba@salitronic.com>
"""Fast offline health checks.

These never touch Altium. Use them as a quick precheck in scripts.
"""

from __future__ import annotations

import os
from pathlib import Path

from eda_agent.config import (
    WORKSPACE_POINTER_FILE,
    get_config,
)
from eda_agent.diag.checks import Check, Severity, Status


def _check_workspace_dir() -> Check:
    cfg = get_config()
    ws = cfg.workspace_dir
    if not ws.exists():
        return Check(
            name="workspace dir exists",
            status=Status.FAIL,
            message=f"{ws} does not exist",
            fix=(
                "Run `eda-agent install-scripts` to create it, or set "
                "EDA_AGENT_WORKSPACE to an existing path."
            ),
        )
    if not os.access(ws, os.W_OK):
        return Check(
            name="workspace dir writable",
            status=Status.FAIL,
            message=f"{ws} not writable",
            fix="Check the directory permissions.",
        )
    return Check(
        name="workspace dir",
        status=Status.PASS,
        message=str(ws),
    )


def _check_pointer_file() -> Check:
    if not WORKSPACE_POINTER_FILE.exists():
        return Check(
            name="workspace pointer file",
            status=Status.FAIL,
            message=f"{WORKSPACE_POINTER_FILE} missing",
            fix=(
                "Run `eda-agent install-scripts` to create the pointer "
                "file. DelphiScript reads it to find the IPC workspace."
            ),
        )
    try:
        contents = WORKSPACE_POINTER_FILE.read_text(encoding="ascii").strip()
    except OSError as exc:
        return Check(
            name="workspace pointer file readable",
            status=Status.FAIL,
            message=f"could not read pointer file: {exc}",
            fix="Check file permissions or recreate via `install-scripts`.",
        )

    cfg_path = str(get_config().workspace_dir)
    pointer_path = contents.rstrip("\\")
    cfg_path_norm = cfg_path.rstrip("\\")
    if Path(pointer_path).resolve() != Path(cfg_path_norm).resolve():
        return Check(
            name="workspace pointer matches config",
            status=Status.FAIL,
            message=(
                f"pointer={pointer_path!r} but config={cfg_path_norm!r}, "
                "Python and Pascal will write to different directories"
            ),
            fix="Re-run `eda-agent install-scripts` to refresh the pointer.",
        )
    return Check(
        name="workspace pointer",
        status=Status.PASS,
        message=str(WORKSPACE_POINTER_FILE),
    )


def _check_bundled_scripts() -> Check:
    from eda_agent.cli import get_bundled_scripts_path

    scripts = get_bundled_scripts_path()
    prj = scripts / "Altium_API.PrjScr"
    if not prj.exists():
        return Check(
            name="bundled DelphiScript project",
            status=Status.FAIL,
            message=f"{prj} not found",
            fix="Reinstall the package: `pip install --force-reinstall eda-agent`.",
        )
    return Check(
        name="bundled DelphiScript project",
        status=Status.PASS,
        message=str(prj),
    )


def _check_bridge_constructable() -> Check:
    """Construct the bridge object without sending a request.

    A failure here usually means a missing dependency (psutil, pywin32).
    """
    try:
        from eda_agent.bridge import get_bridge
        get_bridge()
    except Exception as exc:
        return Check(
            name="bridge constructable",
            status=Status.FAIL,
            message=f"bridge import/construct failed: {exc}",
            fix="Reinstall with `pip install --force-reinstall eda-agent`.",
        )
    return Check(name="bridge constructable", status=Status.PASS)


def run_health_checks() -> list[Check]:
    """Order matters, earlier failures often explain later ones."""
    return [
        _check_workspace_dir(),
        _check_pointer_file(),
        _check_bundled_scripts(),
        _check_bridge_constructable(),
    ]
