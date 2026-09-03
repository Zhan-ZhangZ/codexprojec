#!/usr/bin/env python3
"""Generate the repo's star-history chart as committed SVGs.

Why this exists: the six entry documents used to embed
``api.star-history.com``. That service shares one pool of GitHub API
tokens across all its users, and when the pool is exhausted every chart
it serves 503s with ``All GitHub API tokens are rate-limited, try again
later`` — repo-independent, so ``facebook/react`` breaks at the same
moment this repo does. A README image that depends on someone else's
quota is not a dependency this repo can keep.

So the curve is built here from the GitHub stargazers API and committed
as two static SVGs (light + dark), which the ``<picture>`` blocks in the
entry documents reference locally. No third-party host, no runtime
fetch, no quota.

Refresh with::

    python3 scripts/build-star-history.py

Requires a GitHub token for the stargazer pages (``GITHUB_TOKEN``, or a
``gh auth token`` fallback). Anonymous requests get 60/hour, which is not
enough — this is exactly the limit that breaks the third-party service.

Deliberately NOT wired into ``make catalog``: its output depends on live
star counts rather than on repo contents, so it would make the catalog
generators non-deterministic. It is refreshed on a schedule instead
(``.github/workflows/refresh-star-history.yml``).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = "brycewang-stanford/Auto-Empirical-Research-Skills"
OUT_LIGHT = ROOT / "images" / "star-history.svg"
OUT_DARK = ROOT / "images" / "star-history-dark.svg"

PER_PAGE = 100
# The stargazers API refuses to paginate past 400 pages.
MAX_PAGES = 400

W, H = 800, 400
PAD_L, PAD_R, PAD_T, PAD_B = 70, 28, 46, 52

THEMES = {
    "light": {
        "fg": "#1f2328",
        "muted": "#59636e",
        "grid": "#d1d9e0",
        "axis": "#8c959f",
        "line": "#e3742f",
        "fill_a": "#e3742f",
        "path": OUT_LIGHT,
    },
    "dark": {
        "fg": "#f0f6fc",
        "muted": "#9198a1",
        "grid": "#3d444d",
        "axis": "#656c76",
        "line": "#f0883e",
        "fill_a": "#f0883e",
        "path": OUT_DARK,
    },
}


def _token() -> str | None:
    for var in ("GITHUB_TOKEN", "GH_TOKEN"):
        if os.environ.get(var):
            return os.environ[var]
    try:
        out = subprocess.run(
            ["gh", "auth", "token"], capture_output=True, text=True, timeout=15
        )
        if out.returncode == 0 and out.stdout.strip():
            return out.stdout.strip()
    except (OSError, subprocess.SubprocessError):
        pass
    return None


def fetch_starred_at(token: str | None) -> list[datetime]:
    """Return every stargazer's starred_at timestamp, oldest first."""
    stamps: list[datetime] = []
    headers = {
        # This Accept header is what makes the API return starred_at at all.
        "Accept": "application/vnd.github.star+json",
        "User-Agent": "AERS-star-history-builder",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    for page in range(1, MAX_PAGES + 1):
        url = (
            f"https://api.github.com/repos/{REPO}/stargazers"
            f"?per_page={PER_PAGE}&page={page}"
        )
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                batch = json.load(resp)
        except urllib.error.HTTPError as exc:
            if exc.code in (401, 403, 429):
                sys.exit(
                    f"FAIL: GitHub API returned {exc.code} on page {page}. "
                    "Set GITHUB_TOKEN (or run `gh auth login`) — anonymous "
                    "requests are capped at 60/hour."
                )
            raise
        if not batch:
            break
        for entry in batch:
            at = entry.get("starred_at") if isinstance(entry, dict) else None
            if at:
                stamps.append(
                    datetime.strptime(at, "%Y-%m-%dT%H:%M:%SZ").replace(
                        tzinfo=timezone.utc
                    )
                )
        print(f"  page {page:>3}: {len(stamps):>5} stargazers", file=sys.stderr)
        if len(batch) < PER_PAGE:
            break

    stamps.sort()
    return stamps


def _nice_ceiling(value: int) -> int:
    """Round a max star count up to a readable axis top."""
    if value <= 10:
        return 10
    # Multiples chosen so that top/4 stays a round number — the y axis is
    # labelled at quarters, and a 5000 ceiling would print "1.2k / 3.8k".
    step = 10 ** (len(str(value)) - 1)
    for mult in (1, 2, 4, 6, 8, 10):
        top = int(step * mult)
        if top >= value:
            return top
    return value


def _fmt(n: int) -> str:
    return f"{n / 1000:.1f}k".replace(".0k", "k") if n >= 1000 else str(n)


def render(stamps: list[datetime], theme: dict) -> str:
    t0, t1 = stamps[0], stamps[-1]
    span = max((t1 - t0).total_seconds(), 1.0)
    top = _nice_ceiling(len(stamps))

    plot_w = W - PAD_L - PAD_R
    plot_h = H - PAD_T - PAD_B

    def x_of(dt: datetime) -> float:
        return PAD_L + plot_w * ((dt - t0).total_seconds() / span)

    def y_of(count: int) -> float:
        return PAD_T + plot_h * (1 - count / top)

    # One point per pixel column is plenty; keeps the SVG small.
    step = max(1, len(stamps) // plot_w)
    pts = [(x_of(stamps[i]), y_of(i + 1)) for i in range(0, len(stamps), step)]
    if pts[-1] != (x_of(t1), y_of(len(stamps))):
        pts.append((x_of(t1), y_of(len(stamps))))
    line = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    area = (
        f"{PAD_L:.1f},{PAD_T + plot_h:.1f} "
        + line
        + f" {pts[-1][0]:.1f},{PAD_T + plot_h:.1f}"
    )

    # Horizontal grid + y labels.
    rows = []
    for i in range(5):
        v = round(top * i / 4)
        y = y_of(v)
        # Row 0 is the baseline, drawn transparent so it does not double up
        # with the x axis. Hoisted out of the f-string because an escaped
        # quote inside an f-string expression is a SyntaxError before 3.12,
        # and `make python-compat` runs on the 3.9/3.12 matrix in CI.
        opacity = "" if i else "stroke-opacity='0'"
        rows.append(
            f'<line x1="{PAD_L}" y1="{y:.1f}" x2="{W - PAD_R}" y2="{y:.1f}" '
            f'stroke="{theme["grid"]}" stroke-width="1" '
            f"{opacity} />"
        )
        rows.append(
            f'<text x="{PAD_L - 12}" y="{y + 4:.1f}" text-anchor="end" '
            f'font-size="12" fill="{theme["muted"]}">{_fmt(v)}</text>'
        )

    # Month ticks along x.
    ticks = []
    seen: set[tuple[int, int]] = set()
    for dt in stamps:
        key = (dt.year, dt.month)
        if key in seen:
            continue
        seen.add(key)
        x = x_of(dt)
        if x < PAD_L + 8 or x > W - PAD_R - 8:
            continue
        ticks.append(
            f'<text x="{x:.1f}" y="{H - PAD_B + 22}" text-anchor="middle" '
            f'font-size="12" fill="{theme["muted"]}">{dt.year}-{dt.month:02d}</text>'
        )

    font = (
        "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"
    )
    updated = t1.strftime("%Y-%m-%d")

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" \
viewBox="0 0 {W} {H}" font-family="{font}" role="img" \
aria-label="Star history: {len(stamps)} stars for {REPO}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{theme["fill_a"]}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="{theme["fill_a"]}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <text x="{PAD_L - 12}" y="26" font-size="15" font-weight="600" \
fill="{theme["fg"]}">Star History</text>
  <text x="{W - PAD_R}" y="26" text-anchor="end" font-size="12" \
fill="{theme["muted"]}">{len(stamps)} stars · updated {updated}</text>
  {"".join(rows)}
  <polygon points="{area}" fill="url(#g)"/>
  <polyline points="{line}" fill="none" stroke="{theme["line"]}" \
stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  <line x1="{PAD_L}" y1="{PAD_T + plot_h}" x2="{W - PAD_R}" \
y2="{PAD_T + plot_h}" stroke="{theme["axis"]}" stroke-width="1"/>
  {"".join(ticks)}
</svg>
"""


def main() -> int:
    token = _token()
    if not token:
        print(
            "WARN: no GITHUB_TOKEN and `gh auth token` unavailable — "
            "anonymous rate limit is 60/hour and will likely fail.",
            file=sys.stderr,
        )
    print(f"Fetching stargazers for {REPO} ...", file=sys.stderr)
    stamps = fetch_starred_at(token)
    if not stamps:
        sys.exit("FAIL: no stargazer timestamps returned.")

    for name, theme in THEMES.items():
        theme["path"].write_text(render(stamps, theme), encoding="utf-8")
        print(f"wrote {theme['path'].relative_to(ROOT)} ({name})")

    print(f"star history OK: {len(stamps)} stars, {stamps[0]:%Y-%m-%d} → {stamps[-1]:%Y-%m-%d}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
