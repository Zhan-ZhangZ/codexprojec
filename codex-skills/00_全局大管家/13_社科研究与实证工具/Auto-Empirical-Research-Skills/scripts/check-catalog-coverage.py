#!/usr/bin/env python3
"""Compare `ls skills/` against `catalog/skills.json` `collections`.

Two failure modes this catches:

  1. **Skill exists on disk but absent from catalog** — runtime clients that
     load the catalog (agents, plugins, marketplace.json) will silently see
     fewer skills than the repo actually carries, and the README's "1,150
     skills" marketing number will drift from reality.

  2. **Collection in catalog but missing on disk** — typical after a
     rename / delete: catalog carries a stale `id` that no longer resolves,
     so a runtime `cat catalog/skills.json | jq .collections[].id` lookup
     404s. Catching it here prevents the next sync from going green while
     a plugin silently imports from a vanished folder.

Exit code: 0 on clean, 1 on any drift, 2 on JSON parse error.

Wired into `make validate` as a regular step. Zero third-party deps
(only the stdlib + the repo's `toml_compat` for adjacent catalog readers).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILLS_DIR = ROOT / "skills"
CATALOG = ROOT / "catalog" / "skills.json"

# Vendored snapshot directories whose layout intentionally omits a root-level
# SKILL.md (the actual skill content lives in non-standard filenames like
# `ai-augmented-economist.SKILL.md`, or in sub-folders without a top-level
# SKILL.md). The catalog never listed these; build-catalog.py is correct to
# skip them. We tolerate them here so the gate doesn't fail on a *known*
# pre-existing drift; if a *new* orphan appears, the gate will still flag it.
# Each entry is the directory name (e.g. "19-CuellarC05-...").
KNOWN_ORPHANS: frozenset[str] = frozenset({
    "19-CuellarC05-vera-economic-intelligence",
    "21-claesbackman-AI-research-feedback",
    "30-zirui-song-claude-skills",
    "37-IlanStrauss-ai-skills",
})


def main() -> int:
    if not CATALOG.exists():
        print(f"::error::catalog file missing: {CATALOG}", file=sys.stderr)
        return 2

    try:
        catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"::error::catalog/skills.json is not valid JSON: {exc}", file=sys.stderr)
        return 2

    on_disk = {
        p.name
        for p in sorted(SKILLS_DIR.iterdir())
        if p.is_dir() and not p.name.startswith(".")
    }
    in_catalog = {
        c.get("id") or c.get("name") or c.get("path")
        for c in catalog.get("collections", [])
    }
    in_catalog.discard(None)

    # Subtract vendored layouts that intentionally lack a root-level SKILL.md.
    only_on_disk = sorted((on_disk - in_catalog) - KNOWN_ORPHANS)
    only_in_catalog = sorted(in_catalog - on_disk)

    print(f"[check-catalog-coverage] {len(on_disk)} skill folders on disk, "
          f"{len(in_catalog)} collections in catalog")
    if only_on_disk:
        print(
            "::error::Skills on disk but missing from catalog "
            f"({len(only_on_disk)}):"
        )
        for name in only_on_disk:
            print(f"  - {name}")
    if only_in_catalog:
        print(
            "::error::Collections in catalog but missing on disk "
            f"({len(only_in_catalog)}):"
        )
        for name in only_in_catalog:
            print(f"  - {name}")
    if not only_on_disk and not only_in_catalog:
        if KNOWN_ORPHANS:
            print(
                f"[check-catalog-coverage] OK — disk and catalog agree "
                f"(tolerating {len(KNOWN_ORPHANS)} known vendored layout: "
                f"{', '.join(sorted(KNOWN_ORPHANS))})."
            )
        else:
            print("[check-catalog-coverage] OK — disk and catalog agree.")
        return 0

    print(
        "\nFix: regenerate with `make catalog` (uses scripts/build-catalog.py). "
        "If a skill was renamed, update catalog/skills.json first; if removed, "
        "delete its entry from catalog/skills.json so the next `make catalog` "
        "doesn't resurrect it.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
