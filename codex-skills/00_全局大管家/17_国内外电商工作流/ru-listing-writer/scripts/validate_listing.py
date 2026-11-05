#!/usr/bin/env python3
"""Validate deterministic Russian listing constraints."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re


UPPER_CYRILLIC = re.compile(r"[А-ЯЁ]")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--title-file", required=True, type=Path)
    parser.add_argument("--description-file", required=True, type=Path)
    parser.add_argument("--title-limit", type=int, default=60)
    parser.add_argument("--description-limit", type=int, default=2000)
    parser.add_argument("--expected-bullets", type=int)
    parser.add_argument("--require-lowercase", action="store_true")
    parser.add_argument("--require-black-dots", action="store_true")
    args = parser.parse_args()

    title = read_text(args.title_file).rstrip("\r\n")
    description = read_text(args.description_file).rstrip("\r\n")
    nonempty_lines = [line for line in description.splitlines() if line.strip()]
    bullets = [line for line in nonempty_lines if re.match(r"^\s*(?:[-•]|\d+[.)])\s+", line)]

    checks = {
        "title_characters": len(title),
        "title_within_limit": len(title) <= args.title_limit,
        "description_characters": len(description),
        "description_within_limit": len(description) <= args.description_limit,
        "bullet_count": len(bullets),
        "bullet_count_matches": args.expected_bullets is None or len(bullets) == args.expected_bullets,
        "black_dot_format_ok": not args.require_black_dots or all(line.startswith("• ") for line in nonempty_lines),
        "lowercase_cyrillic_ok": not args.require_lowercase or UPPER_CYRILLIC.search(description) is None,
    }
    print(json.dumps(checks, ensure_ascii=False, indent=2))
    boolean_checks = [value for value in checks.values() if isinstance(value, bool)]
    return 0 if all(boolean_checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())

