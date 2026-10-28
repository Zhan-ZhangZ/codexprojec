#!/usr/bin/env python3
"""Count Unicode characters in listing copy, including spaces and newlines."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--text", help="Text to count")
    source.add_argument("--file", type=Path, help="UTF-8 text file to count")
    parser.add_argument(
        "--strip-final-newline",
        action="store_true",
        help="Ignore line endings added only by saving the text file",
    )
    args = parser.parse_args()

    if args.text is not None:
        value = args.text
    elif args.file is not None:
        value = args.file.read_text(encoding="utf-8")
    else:
        value = sys.stdin.read()

    if args.strip_final_newline:
        value = value.rstrip("\r\n")

    print(len(value))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

