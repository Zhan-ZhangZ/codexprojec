#!/usr/bin/env python3
"""Fetch the latest commit SHA for each vendored upstream and write it into
``catalog/provenance.json`` under the ``vendored_commit`` field.

Why this exists
---------------
``catalog/provenance.json`` already carries a ``vendored_commit`` field, but
the build-provenance.py default value is ``null`` because we don't ship a
network call inside the catalog build. The next sync (week-of-2026-07-06
ROADMAP) wants this filled in so a researcher can read which upstream
commit a vendored mirror was actually taken from — critical for
reproducibility of any "I saw the same numbers in AERS last week" claim.

What this script does
--------------------
For every collection with a non-empty ``source_url`` pointing to
``https://github.com/<owner>/<repo>`` (optionally with a tree/branch
suffix like ``/tree/main``), it asks the GitHub REST API
``/repos/{owner}/{repo}/commits/{branch}`` for the latest commit SHA,
records both the SHA and the API-fetched-at timestamp, and writes the
updated ``provenance.json`` back. Network errors and rate-limit responses
leave the previous value in place (never overwrite good data with bad
data).

Stdlib only.

Usage
-----

    # Refresh every collection with a GitHub source_url
    python3 scripts/sync-vendored-commit.py

    # Dry-run (print plan + what would change, do not write)
    python3 scripts/sync-vendored-commit.py --dry-run

    # Only refresh a single collection
    python3 scripts/sync-vendored-commit.py --only 00-Full-empirical-analysis-skill_StatsPAI

    # Use a custom token (recommended: avoids the 60/hr anonymous rate limit)
    GITHUB_TOKEN=ghp_… python3 scripts/sync-vendored-commit.py

Exit codes
----------
0  success — at least one SHA was updated (or --dry-run printed the plan)
1  no updates — either nothing to do or all lookups failed (with reasons)
2  configuration error
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
PROVENANCE = ROOT / "catalog" / "provenance.json"

GITHUB_API_ROOT = "https://api.github.com"
DEFAULT_BRANCHES = ("main", "master")  # tried in order if no branch is in the URL
REQUEST_TIMEOUT_S = 10
USER_AGENT = "aers-sync-vendored-commit/1.0 (+https://github.com/brycewang-stanford/Auto-Empirical-Research-Skills)"


# ─────────────────────────── GitHub URL parsing ───────────────────────────
_GH_REPO_RE = re.compile(r"^https?://github\.com/([\w.\-]+)/([\w.\-]+?)(?:\.git)?(?:/(tree|blob|commits?)/([^/]+))?/?$")


def parse_source_url(url: str):
    """Return ``(owner, repo, branch_or_None)`` for a github.com URL, else
    ``None``. Branches in ``/tree/<branch>`` and ``/blob/<branch>`` paths
    are detected; otherwise the caller will try ``main`` then ``master``.
    """
    if not url:
        return None
    m = _GH_REPO_RE.match(url.strip())
    if not m:
        return None
    owner, repo, kind, branch = m.group(1), m.group(2), m.group(3), m.group(4)
    if kind in ("tree", "blob", "commits") and branch:
        return owner, repo, branch
    return owner, repo, None


# ─────────────────────────── HTTP ───────────────────────────
def _http_get(url: str, token: str | None):
    req = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": USER_AGENT,
        "X-GitHub-Api-Version": "2022-11-28",
    })
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_S) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace"), dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace") if e.fp else "", dict(e.headers or {})
    except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
        return 0, f"network-error: {e.__class__.__name__}: {e}", {}


def fetch_default_branch(owner: str, repo: str, token: str | None):
    status, body, headers = _http_get(
        f"{GITHUB_API_ROOT}/repos/{owner}/{repo}", token,
    )
    if status == 200:
        try:
            return json.loads(body).get("default_branch"), headers
        except json.JSONDecodeError:
            return None, headers
    return None, headers


def fetch_head_sha(owner: str, repo: str, branch: str, token: str | None):
    status, body, headers = _http_get(
        f"{GITHUB_API_ROOT}/repos/{owner}/{repo}/commits/{branch}", token,
    )
    if status != 200:
        return None, status, body, headers
    try:
        sha = json.loads(body).get("sha")
    except json.JSONDecodeError:
        return None, status, body, headers
    return sha, status, body, headers


# ─────────────────────────── business logic ───────────────────────────
def _resolve_commit(entry: dict, token: str | None):
    """Try to look up the latest commit SHA for a single provenance entry.
    Returns ``(sha_or_None, status_label, branch_used)`` — never raises so
    that one bad network call cannot break the whole sync.
    """
    parsed = parse_source_url(entry.get("source_url", ""))
    if not parsed:
        return None, "skip:not-a-github-url", None
    owner, repo, explicit_branch = parsed

    # 1. Pick the branch: explicit URL > default branch > main/master fallback.
    branch = explicit_branch
    branch_status = "ok"
    if not branch:
        branch, _ = fetch_default_branch(owner, repo, token)
        if not branch:
            branch = DEFAULT_BRANCHES[0]
            branch_status = "defaulted:main"

    sha, status, body, _headers = fetch_head_sha(owner, repo, branch, token)
    if sha:
        return sha, f"ok:{branch_status}", branch
    # Fallback to master if we tried main and got 404/empty.
    if not explicit_branch and branch == DEFAULT_BRANCHES[0]:
        sha, status, body, _ = fetch_head_sha(owner, repo, DEFAULT_BRANCHES[1], token)
        if sha:
            return sha, "fallback:master", DEFAULT_BRANCHES[1]

    # Friendly status code
    if status == 403:
        return None, "skip:rate-limited-or-forbidden", branch
    if status == 404:
        return None, "skip:repo-not-found-or-private", branch
    if status == 0:
        return None, f"skip:{body[:80]}", branch
    return None, f"skip:http-{status}", branch


def _load_provenance() -> tuple[dict, dict[str, dict]]:
    raw = json.loads(PROVENANCE.read_text(encoding="utf-8"))
    by_id = {}
    if isinstance(raw, dict) and isinstance(raw.get("collections"), list):
        for entry in raw["collections"]:
            if isinstance(entry, dict) and entry.get("id"):
                by_id[entry["id"]] = entry
        return raw, by_id
    raise SystemExit(
        "Unexpected provenance.json shape — expected dict with 'collections' list."
    )


def _write_provenance(raw: dict) -> None:
    PROVENANCE.write_text(
        json.dumps(raw, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dry-run", action="store_true",
                   help="Print what would change without writing provenance.json.")
    p.add_argument("--only", default=None,
                   help="Only refresh this collection ID (e.g. 00-Full-empirical-analysis-skill_StatsPAI).")
    args = p.parse_args(argv)

    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token:
        print("ℹ️  No GITHUB_TOKEN set — using anonymous GitHub API (60 req/hr).")

    raw, by_id = _load_provenance()
    plan: list[tuple[str, str | None, str | None, str]] = []  # (id, old, new, status)
    today = datetime.now(timezone.utc).isoformat(timespec="seconds")

    for cid, entry in by_id.items():
        if args.only and cid != args.only:
            continue
        # Only attempt GitHub URLs (not self-references or other hosts).
        if not parse_source_url(entry.get("source_url", "")):
            continue
        new_sha, status, branch = _resolve_commit(entry, token)
        old_sha = entry.get("vendored_commit")
        plan.append((cid, old_sha, new_sha, f"{status}" + (f"@branch={branch}" if branch else "")))

    # Summarise and write.
    updates = [(cid, old, new, status) for cid, old, new, status in plan
               if new and old != new]
    print(f"\nVendored-commit refresh — {len(plan)} GitHub upstream(s) checked, {len(updates)} update(s).")
    if not updates and not plan:
        print("  (no upstream with a github.com source_url)")
    for cid, old, new, status in plan:
        if new and old != new:
            print(f"  ✏️  {cid}: {old} → {new}  ({status})")
        elif new:
            print(f"  ✓  {cid}: already at {new}  ({status})")
        else:
            print(f"  ✗  {cid}: not updated ({status})")

    if args.dry_run:
        print("\n--dry-run: no writes performed.")
        return 0

    if updates:
        for cid, _old, new, _status in updates:
            entry = by_id[cid]
            entry["vendored_commit"] = new
            entry["vendored_commit_fetched_at"] = today
        _write_provenance(raw)
        print(f"\nWrote {PROVENANCE.relative_to(ROOT)} with {len(updates)} new SHA(s).")
    else:
        print("\nNothing to update.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())