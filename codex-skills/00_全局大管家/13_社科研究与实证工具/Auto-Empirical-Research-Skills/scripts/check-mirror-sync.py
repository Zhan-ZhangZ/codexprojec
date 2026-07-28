#!/usr/bin/env python3
"""Fail when a distribution mirror of a first-party flagship skill drifts.

The flagship pipelines under ``skills/00.x`` are the single source of truth,
but they ship through two extra channels that are committed to this repo:

1. ``plugins/empirical-analysis-{python,stata,r}/skills/pipeline/`` —
   projected by ``plugins/build_plugins.py`` (SKILL.md + references/).
2. ``stata-skills/00.2-Full-empirical-analysis-skill_Stata/`` — a
   hand-maintained copy inside the Stata-focused view. NOTE: ``stata-skills/``
   is **gitignored** (a maintainer-local view), so this pair is checked only
   when the directory exists — locally it gates drift; on CI it is skipped.

Historically these mirrors silently drifted (e.g. the 2026-06-22 SkillOpt
execution-gate section reached ``skills/00.x`` but none of the mirrors until
2026-07-22). This check makes that class of drift a validate-gate failure.

Only content files are compared (SKILL.md + references/*); plugin metadata
(README.md, .claude-plugin/) is generated with plugin-specific content and is
not expected to match the source folder.

Exit code 0 when all mirrors match, 1 otherwise.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# (source dir, mirror dir) pairs; every SKILL.md and references/* file in the
# source must be byte-identical in the mirror.
# Pairs whose mirror dir may legitimately be absent (gitignored local views).
OPTIONAL_MIRROR_DIRS = {"stata-skills/00.2-Full-empirical-analysis-skill_Stata"}

MIRROR_PAIRS: list[tuple[str, str]] = [
    (
        "skills/00.1-Full-empirical-analysis-skill_Python",
        "plugins/empirical-analysis-python/skills/pipeline",
    ),
    (
        "skills/00.2-Full-empirical-analysis-skill_Stata",
        "plugins/empirical-analysis-stata/skills/pipeline",
    ),
    (
        "skills/00.3-Full-empirical-analysis-skill_R",
        "plugins/empirical-analysis-r/skills/pipeline",
    ),
    (
        "skills/00.2-Full-empirical-analysis-skill_Stata",
        "stata-skills/00.2-Full-empirical-analysis-skill_Stata",
    ),
]


def content_files(source: Path) -> list[Path]:
    files = [source / "SKILL.md"]
    references = source / "references"
    if references.is_dir():
        files.extend(sorted(references.rglob("*")))
    return [path for path in files if path.is_file()]


def main() -> int:
    failures: list[str] = []
    skipped: list[str] = []
    for source_rel, mirror_rel in MIRROR_PAIRS:
        source = ROOT / source_rel
        mirror = ROOT / mirror_rel
        if not source.is_dir():
            failures.append(f"missing source dir: {source_rel}")
            continue
        if not mirror.is_dir():
            if mirror_rel in OPTIONAL_MIRROR_DIRS:
                skipped.append(mirror_rel)
                continue
            failures.append(f"missing mirror dir: {mirror_rel}")
            continue
        for path in content_files(source):
            rel = path.relative_to(source)
            mirrored = mirror / rel
            if not mirrored.is_file():
                failures.append(f"{mirror_rel}/{rel}: missing (source has it)")
            elif mirrored.read_bytes() != path.read_bytes():
                failures.append(f"{mirror_rel}/{rel}: differs from {source_rel}/{rel}")

    if failures:
        print("Mirror drift detected:", file=sys.stderr)
        for failure in failures:
            print(f"  - {failure}", file=sys.stderr)
        print(
            "\nFix: edit only the skills/00.x source, then run\n"
            "  python3 plugins/build_plugins.py\n"
            "  cp skills/00.2-Full-empirical-analysis-skill_Stata/SKILL.md "
            "stata-skills/00.2-Full-empirical-analysis-skill_Stata/SKILL.md",
            file=sys.stderr,
        )
        return 1

    active = [(src, dst) for src, dst in MIRROR_PAIRS if dst not in skipped]
    checked = sum(len(content_files(ROOT / src)) for src, _ in active)
    note = f" ({len(skipped)} local-only mirror(s) absent, skipped)" if skipped else ""
    print(f"mirror sync OK: {len(active)} mirror(s), {checked} file comparison(s){note}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
