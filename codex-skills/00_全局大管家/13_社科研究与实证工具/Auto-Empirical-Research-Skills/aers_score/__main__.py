"""Allow ``python3 -m aers_score`` alongside the ``aers-score`` console script."""

from __future__ import annotations

from .cli import main

if __name__ == "__main__":
    raise SystemExit(main())
