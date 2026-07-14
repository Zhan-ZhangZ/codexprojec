# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 George Saliba <george.saliba@salitronic.com>
"""Verify MCP tool docstrings don't recommend tools that don't exist.

Lying-docstring bugs (caught in cron iteration #76) take this shape::

    @mcp.tool()
    async def proj_run_erc():
        '''Compile and run ERC.

        Use ``get_erc_violations()`` afterwards to read the results.
        '''

If ``get_erc_violations()`` isn't actually a registered MCP tool, the
agent reads that suggestion, dutifully tries to call it, and hits a
"no such tool" error. The bug stays silent because the tool's own
test suite never exercises the recommendation.

This test walks every MCP tool docstring across ``src/eda_agent/tools/``
and verifies that every backticked function-with-parens reference is
either a registered MCP tool, a Python stdlib / well-known helper name,
or in the explicit allowlist below.
"""

from __future__ import annotations

import ast
import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
TOOLS_DIR = REPO_ROOT / "src" / "eda_agent" / "tools"

# Backticked references that aren't MCP tools but appear in docstrings
# for legitimate reasons. Either Python stdlib, third-party libs, or
# generic verbs the docstring uses descriptively.
ALLOWED_NON_MCP_REFS = {
    # Generic / structural
    "main", "run", "init", "setup", "teardown",
    # Python builtins
    "len", "str", "int", "float", "list", "dict", "set", "tuple",
    "print", "open", "close", "range", "enumerate", "zip", "map", "filter",
    "isinstance", "hasattr", "getattr", "setattr",
    # asyncio / contextlib
    "await", "asyncio", "asynccontextmanager",
    # bridge / web stdlib
    "fetch", "WebFetch", "WebSearch", "send_command_async",
    "send_command", "bridge",
    # Altium / Pascal-side names users might reference
    "PreProcess", "PostProcess", "Begin", "End", "SchServer", "PCBServer",
    "GetCurrentPCBBoard", "GetCurrentSchDocument", "BoardIterator_Create",
    "SchIterator_Create", "GroupIterator_Create",
    # Common internal helpers that aren't @mcp.tool decorated
    "get_bridge", "tag_response", "_bundled_script_version",
    "_check_disconnected", "BulkHintTracker",
}


def _registered_mcp_tools() -> set[str]:
    """Names of every @mcp.tool()-decorated function across tools/."""
    names = set()
    for py_file in TOOLS_DIR.glob("*.py"):
        if py_file.name == "__init__.py" or ".tmp." in py_file.name:
            continue
        tree = ast.parse(py_file.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
                # Look for @mcp.tool() in the decorator list.
                for dec in node.decorator_list:
                    is_tool = False
                    if isinstance(dec, ast.Call):
                        if isinstance(dec.func, ast.Attribute) and \
                                dec.func.attr == "tool":
                            is_tool = True
                    elif isinstance(dec, ast.Attribute):
                        if dec.attr == "tool":
                            is_tool = True
                    if is_tool:
                        names.add(node.name)
                        break
    return names


def _docstring_refs_in_file(py_file: Path) -> list[tuple[str, str, int]]:
    """Find `name()` backticked references inside @mcp.tool docstrings.

    Returns a list of (tool_name, referenced_name, line_number).
    """
    refs: list[tuple[str, str, int]] = []
    tree = ast.parse(py_file.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if not isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
            continue
        # Must be @mcp.tool-decorated
        decorated = any(
            (isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute)
             and dec.func.attr == "tool")
            or (isinstance(dec, ast.Attribute) and dec.attr == "tool")
            for dec in node.decorator_list
        )
        if not decorated:
            continue
        ds = ast.get_docstring(node)
        if not ds:
            continue
        # Match ``name()`` or ``name`` inside double-backticks
        # specifically when followed by () so we only catch
        # "call this function" references, not arbitrary mentions.
        for m in re.finditer(r"``([a-z_][a-z0-9_]*)\(\)``", ds):
            refs.append((node.name, m.group(1), node.lineno))
        for m in re.finditer(r"`([a-z_][a-z0-9_]*)\(\)`", ds):
            refs.append((node.name, m.group(1), node.lineno))
    return refs


def test_no_lying_docstring_function_refs():
    """Every ``name()`` reference in an MCP tool docstring resolves to a
    real MCP tool, a builtin, or an explicit allowlisted name."""
    registered = _registered_mcp_tools()
    bad: list[str] = []
    for py_file in TOOLS_DIR.glob("*.py"):
        if py_file.name == "__init__.py" or ".tmp." in py_file.name:
            continue
        for tool_name, ref_name, lineno in _docstring_refs_in_file(py_file):
            if ref_name in registered:
                continue
            if ref_name in ALLOWED_NON_MCP_REFS:
                continue
            bad.append(
                f"  {py_file.name}:{lineno} {tool_name}() docstring references "
                f"`{ref_name}()` which is not a registered MCP tool "
                f"and not in ALLOWED_NON_MCP_REFS."
            )
    assert not bad, (
        "MCP tool docstrings reference functions that don't exist:\n"
        + "\n".join(bad)
        + "\n\nEither (a) ship the referenced tool, (b) rename the "
          "reference to a tool that does exist, or (c) add it to "
          "ALLOWED_NON_MCP_REFS if it's a stdlib / generic verb."
    )
