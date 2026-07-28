#!/usr/bin/env python3
"""Validate that every entry in `.claude-plugin/marketplace.json` points to
the right side of the repo.

Two-source convention (enforced by this script):

  1. `aer-skills`           -- lives under  `./skills/<dir>`   (mirrored weekly
                                from upstream; a vendored repo, not a
                                generated plugin).
  2. `empirical-analysis-*` -- lives under  `./plugins/<dir>`  (projected by
                                `plugins/build_plugins.py` from `skills/00.x`
                                into install-ready plugin shape).

Anything else needs an explicit addition to the rules below. The point is
not to forbid new conventions but to keep them on file: silent drift here
turns into a marketplace that installs the wrong path on user machines.

Exit code: 0 on clean, 1 on any violation, 2 on JSON parse error.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARKETPLACE = ROOT / ".claude-plugin" / "marketplace.json"

# Convention table. Keys are the only plugin `name`s the project ships today;
# adding a new plugin? Add a rule here too.
ALLOWED_RULES: dict[str, str] = {
    "aer-skills": r"^\./skills/[A-Za-z0-9._\-]+$",
    "empirical-analysis-python": r"^\./plugins/empirical-analysis-python$",
    "empirical-analysis-r": r"^\./plugins/empirical-analysis-r$",
    "empirical-analysis-stata": r"^\./plugins/empirical-analysis-stata$",
}


def main() -> int:
    if not MARKETPLACE.exists():
        print(f"::error::marketplace file missing: {MARKETPLACE}", file=sys.stderr)
        return 2

    try:
        mp = json.loads(MARKETPLACE.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"::error::marketplace.json is not valid JSON: {exc}", file=sys.stderr)
        return 2

    plugins = mp.get("plugins", [])
    if not plugins:
        print("::error::marketplace.json has no `plugins` array.", file=sys.stderr)
        return 2

    failures: list[str] = []
    for plugin in plugins:
        name = plugin.get("name", "<unnamed>")
        source = plugin.get("source", "")
        rule = ALLOWED_RULES.get(name)
        if rule is None:
            failures.append(
                f"{name}: no rule registered in check-plugin-source-location.py — "
                "either add one or document the new convention."
            )
            continue
        if not re.match(rule, source):
            failures.append(
                f"{name}: source {source!r} does not match rule {rule!r}"
            )
            continue
        # Verify the path actually resolves.
        target = (ROOT / source.lstrip("./")).resolve()
        if not target.exists():
            failures.append(
                f"{name}: source {source!r} resolves to {target} which does not exist on disk"
            )

    if failures:
        print("::error::Plugin source-location violations:", file=sys.stderr)
        for f in failures:
            print(f"  - {f}", file=sys.stderr)
        return 1
    print(
        f"[check-plugin-source-location] OK — {len(plugins)} plugins match the "
        f"convention table ({len(ALLOWED_RULES)} rules)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
