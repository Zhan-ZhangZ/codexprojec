#!/usr/bin/env python3
"""Preflight the local environment before running the AERS gates.

Most of this repo is deliberately stdlib-only: `make test`, `make validate`,
the eval harness and the numeric benchmark all run on a bare interpreter. Two
things are *not* stdlib-only, and both fail late and cryptically when they are
missing:

1. ``skills/69-Paper-WorkFlow`` is a git submodule. An un-initialized checkout
   makes ``make paper-workflow-check`` die on a missing file.
2. That submodule's ``check_demo_execution.py`` gate actually executes
   ``did_demo.ipynb``, so it needs numpy/pandas/matplotlib/statsmodels. On an
   interpreter without them the gate reports ``RIGOR.md is STALE``, which
   points at a regeneration command that cannot possibly help.

``make doctor`` answers "why did the gate fail?" in one screen, and every
failing check prints the exact command that fixes it. It never mutates the
repo.

Zero third-party dependencies. Wired into `make doctor`; `make setup` builds
the virtualenv this script recommends.
"""

from __future__ import annotations

import argparse
import importlib.util
import platform
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIREMENTS = ROOT / "requirements.txt"
SUBMODULE = ROOT / "skills" / "69-Paper-WorkFlow"
SUBMODULE_SENTINEL = SUBMODULE / "validate_skill.py"
VENV = ROOT / ".venv"

# The floor the CI matrix tests. `make python-compat` runs on 3.9 and 3.12.
MIN_PYTHON = (3, 9)

# Needed only by the Paper-WorkFlow demo-execution gate (requirements.txt).
SCIENTIFIC_STACK = ("numpy", "pandas", "matplotlib", "statsmodels", "linearmodels")

OK = "ok"
WARN = "warn"
FAIL = "fail"

_MARK = {OK: "[ ok ]", WARN: "[warn]", FAIL: "[FAIL]"}


class Report:
    """Accumulates check results and renders them in a stable order."""

    def __init__(self) -> None:
        self.rows: list[tuple[str, str, str, str]] = []

    def add(self, status: str, name: str, detail: str, fix: str = "") -> None:
        self.rows.append((status, name, detail, fix))

    @property
    def failures(self) -> list[tuple[str, str, str, str]]:
        return [r for r in self.rows if r[0] == FAIL]

    @property
    def warnings(self) -> list[tuple[str, str, str, str]]:
        return [r for r in self.rows if r[0] == WARN]

    def render(self) -> str:
        width = max((len(r[1]) for r in self.rows), default=0)
        lines = []
        for status, name, detail, _fix in self.rows:
            lines.append(f"{_MARK[status]} {name.ljust(width)}  {detail}")
        return "\n".join(lines)

    def render_fixes(self) -> str:
        fixes = [(r[1], r[3]) for r in self.rows if r[0] in (FAIL, WARN) and r[3]]
        if not fixes:
            return ""
        lines = ["", "How to fix:"]
        for name, fix in fixes:
            lines.append(f"  {name}:")
            for command in fix.strip().splitlines():
                lines.append(f"      {command}")
        return "\n".join(lines)


def _module_available(name: str) -> bool:
    try:
        return importlib.util.find_spec(name) is not None
    except (ImportError, ValueError):
        # A half-installed distribution can raise rather than return None.
        return False


def check_python(report: Report) -> None:
    version = sys.version_info
    label = f"{version.major}.{version.minor}.{version.micro} ({sys.executable})"
    if version[:2] < MIN_PYTHON:
        report.add(
            FAIL,
            "python",
            f"{label} is below the {MIN_PYTHON[0]}.{MIN_PYTHON[1]} floor the CI matrix tests",
            "make setup   # builds .venv on a supported interpreter",
        )
    else:
        report.add(OK, "python", label)


def check_tooling(report: Report) -> None:
    for tool, why in (("git", "submodules and provenance"), ("make", "every gate target")):
        path = shutil.which(tool)
        if path:
            report.add(OK, tool, path)
        else:
            report.add(FAIL, tool, f"not on PATH; required for {why}", f"install {tool}")


def check_submodule(report: Report) -> None:
    if SUBMODULE_SENTINEL.exists():
        report.add(OK, "submodule", f"{SUBMODULE.name} checked out")
        return
    report.add(
        FAIL,
        "submodule",
        f"{SUBMODULE.name} is not checked out (make paper-workflow-check will fail)",
        "git submodule update --init --recursive",
    )


def check_scientific_stack(report: Report) -> None:
    missing = [name for name in SCIENTIFIC_STACK if not _module_available(name)]
    if not missing:
        report.add(OK, "sci-stack", "numpy/pandas/matplotlib/statsmodels/linearmodels importable")
        return
    # This is only a hard failure for the Paper-WorkFlow demo gate, which
    # `make validate` runs. Everything else in the repo is stdlib-only, so a
    # contributor touching only scripts/ or tests/ can work without it.
    report.add(
        FAIL,
        "sci-stack",
        "missing " + ", ".join(missing) + " — the Paper-WorkFlow demo gate "
        "(make validate) will report RIGOR.md as STALE",
        "make setup\n"
        "source .venv/bin/activate   # or: PATH=$PWD/.venv/bin:$PATH make check",
    )


def check_venv_in_use(report: Report) -> None:
    """Warn when a repo .venv exists but the running interpreter is not it."""
    if not VENV.exists():
        return
    try:
        running_in_venv = Path(sys.prefix).resolve() == VENV.resolve()
    except OSError:
        running_in_venv = False
    if running_in_venv:
        report.add(OK, "venv", f"active ({VENV.name})")
    else:
        report.add(
            WARN,
            "venv",
            f"{VENV.name}/ exists but this interpreter is {sys.prefix} — "
            "gates may not see its packages",
            "source .venv/bin/activate",
        )


def check_generated_artifacts(report: Report) -> None:
    """Cheap staleness probe: are the generated catalogs current?

    Full freshness is `make validate`'s job; this just catches the common
    "edited skills/ but forgot make catalog" state without paying for the
    whole gate.
    """
    script = ROOT / "scripts" / "build-catalog.py"
    if not script.exists():
        report.add(FAIL, "catalog", "scripts/build-catalog.py is missing", "")
        return
    proc = subprocess.run(
        [sys.executable, str(script), "--check"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if proc.returncode == 0:
        report.add(OK, "catalog", "catalog/skills.json is current")
    else:
        report.add(
            WARN,
            "catalog",
            "generated catalog is stale (make validate will fail)",
            "make catalog",
        )


def check_git_state(report: Report) -> None:
    if not shutil.which("git"):
        return
    proc = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        report.add(WARN, "repo", "not a git checkout", "")
        return
    branch = proc.stdout.strip()
    dirty = subprocess.run(
        ["git", "status", "--porcelain"], cwd=ROOT, capture_output=True, text=True
    ).stdout.strip()
    changed = len(dirty.splitlines()) if dirty else 0
    suffix = f", {changed} uncommitted change(s)" if changed else ", clean"
    report.add(OK, "repo", f"on {branch}{suffix}")


def build_report(*, skip_slow: bool = False) -> Report:
    report = Report()
    check_python(report)
    check_venv_in_use(report)
    check_tooling(report)
    check_submodule(report)
    check_scientific_stack(report)
    if not skip_slow:
        check_generated_artifacts(report)
    check_git_state(report)
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Preflight the local environment for the AERS gates."
    )
    parser.add_argument(
        "--quick",
        action="store_true",
        help="skip the catalog-freshness probe (which shells out to a generator)",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="exit non-zero on warnings as well as failures",
    )
    args = parser.parse_args(argv)

    print(f"AERS environment doctor — {platform.platform()}")
    print(f"repo: {ROOT}")
    print()
    report = build_report(skip_slow=args.quick)
    print(report.render())
    fixes = report.render_fixes()
    if fixes:
        print(fixes)

    print()
    if report.failures:
        print(
            f"{len(report.failures)} blocking issue(s). "
            "`make check` will fail until they are fixed."
        )
        return 1
    if report.warnings and args.strict:
        print(f"{len(report.warnings)} warning(s) and --strict was passed.")
        return 1
    if report.warnings:
        print(f"Ready to run `make check` ({len(report.warnings)} warning(s), non-blocking).")
        return 0
    print("Ready to run `make check`.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
