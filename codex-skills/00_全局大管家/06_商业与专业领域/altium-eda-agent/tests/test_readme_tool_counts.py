# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 George Saliba <george.saliba@salitronic.com>
"""Pin the README's per-section tool counts to the actual @mcp.tool count.

The catalog headers say things like ``### PCB (69 tools)``. When new
tools land, those counts go stale (last iteration: Library was
"22 tools" while pcb.py actually had 31, PCB was "55 tools" while
pcb.py actually had 69). The drift is silent because no one runs grep
against the README during development.

This test reads the actual @mcp.tool decorator count per file via AST
and verifies the README header matches. The mapping is explicit since
some sections cover multiple files (e.g. "Schematic and general"
spans generic.py).
"""

from __future__ import annotations

import ast
import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
TOOLS_DIR = REPO_ROOT / "src" / "eda_agent" / "tools"
README = REPO_ROOT / "README.md"


# README section name -> tool source files that feed it. Order matters
# for the assertion message but not for the count.
SECTION_FILES: dict[str, tuple[str, ...]] = {
    "Application":            ("application.py",),
    "Project":                ("project.py",),
    "Library":                ("library.py",),
    # The README section's table includes the audit_* design-lint checks,
    # so its header count covers both source files.
    "Schematic and general":  ("generic.py", "audit.py"),
    "PCB":                    ("pcb.py",),
    "Design agent":           ("design.py",),
    "Routing":                ("route.py",),
}


def _count_mcp_tools(filename: str) -> int:
    """Count @mcp.tool() decorators on async functions in a file."""
    path = TOOLS_DIR / filename
    tree = ast.parse(path.read_text(encoding="utf-8"))
    count = 0
    for node in ast.walk(tree):
        if isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
            for dec in node.decorator_list:
                if isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute):
                    if dec.func.attr == "tool":
                        count += 1
                        break
                elif isinstance(dec, ast.Attribute) and dec.attr == "tool":
                    count += 1
                    break
    return count


def _readme_section_counts() -> dict[str, int]:
    """Parse README section headers of the form ``### Name (N tools)``."""
    text = README.read_text(encoding="utf-8")
    out: dict[str, int] = {}
    for m in re.finditer(r"^### ([A-Za-z][A-Za-z\s]*?) \((\d+) tools\)",
                         text, re.MULTILINE):
        name = m.group(1).strip()
        out[name] = int(m.group(2))
    return out


def test_readme_section_counts_match_code():
    """Every ``### Name (N tools)`` header in the README matches the
    actual @mcp.tool count across its source files. Failure means
    someone added a tool but didn't bump the header count."""
    readme_counts = _readme_section_counts()
    mismatches: list[str] = []
    for section, files in SECTION_FILES.items():
        actual = sum(_count_mcp_tools(f) for f in files)
        readme = readme_counts.get(section)
        if readme is None:
            mismatches.append(
                f"  README has no '### {section} (N tools)' header (expected "
                f"{actual})."
            )
        elif readme != actual:
            mismatches.append(
                f"  '### {section}' README says {readme} but "
                f"{'+'.join(files)} has {actual} @mcp.tool decorators."
            )
    assert not mismatches, (
        "README per-section tool counts disagree with the code:\n"
        + "\n".join(mismatches)
        + "\n\nBump the header counts (or add the missing tools to "
          "SECTION_FILES if you added a new tool module)."
    )
