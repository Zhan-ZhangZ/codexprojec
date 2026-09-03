#!/usr/bin/env python3
"""Check that the stats in every locale README match the repo's reality.

Three families of drift are linted, across every stat-bearing entry document
(`README.md`, the five locale READMEs, and `docs/CONTENT_ZH.md`):

1. **Rigor stats** — the trust-surface rows for numeric benchmark tasks and
   eval scenarios / rubric items. This checker keys on the locale-invariant
   link targets inside each row — ``[`benchmark/`](benchmark/)`` and
   ``[`eval-harness/`](eval-harness/)`` (or their ``../``-prefixed forms in
   docs/) — and verifies the bolded counts against the committed TOMLs.

2. **Collection coverage** — every collection id in ``catalog/skills.json``
   must be linked (as ``skills/<id>/``) from each document that carries the
   collection table, and no document may link a collection id that is no
   longer in the catalog. This is what makes "74 collections" claims
   structural instead of hand-maintained: adding or removing a collection
   without updating every locale table fails ``make validate``.

   The formatted total-skills number (e.g. ``1,093``) is also linted: on any
   line that cites ``catalog/skills.json`` as its source, a comma-formatted
   number that differs from the current catalog total is a stale copy.

3. **Landing-page numbers** — [`index.html`](../index.html) is served on GitHub
   Pages and is the first thing many readers see. It fills its stat tiles from
   `catalog/skills.json` at runtime, but its ``<meta name="description">`` and
   its JS fallbacks are static text — exactly the place a copied number rots
   unseen. Any comma-formatted integer in the meta description is linted
   against the catalog total, and the rigor-badge fallback is required not to
   carry a number at all (a stale fallback is worse than a dash: it only shows
   when the fetch fails, so nobody watches it go wrong).

4. **Upstream source links** — every row of the all-collections table carries
   a localized "source" column linking back to the original author's
   repository. Those URLs are copies of ``catalog/provenance.json``, so they
   are linted against it: a collection whose upstream moves (or whose upstream
   URL is corrected) must be updated in all six tables, not just one. The
   check is locale-agnostic — it finds the widest collection table in the
   document rather than matching a translated column header.

History: until 2026-07-22 only ``README-en.md`` was linted (the P2.2 plan
made the other files "entry-banner only", an assumption the 2026-07-19
restructure invalidated) — which is exactly how 70-vs-74 / 1,151-vs-actual
drift shipped. Do not narrow the scope again.

Zero third-party dependencies (TOML via scripts/toml_compat.py). Wired into
`make validate`.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import toml_compat

ROOT = Path(__file__).resolve().parents[1]
SCENARIO_DIR = ROOT / "eval-harness" / "scenarios"
TASK_DIR = ROOT / "benchmark" / "tasks"
CATALOG = ROOT / "catalog" / "skills.json"
PROVENANCE = ROOT / "catalog" / "provenance.json"

# Every document that carries the trust-surface rigor rows.
READMES = (
    "README.md",
    "README-en.md",
    "README-ja.md",
    "README-ko.md",
    "README-zh-CN.md",
    "README-zh-TW.md",
    "docs/CONTENT_ZH.md",
)

# Every document that carries the full collection table. README-zh-CN.md is a
# deprecated redirect stub without a table, so it is exempt here.
COLLECTION_TABLE_DOCS = (
    "README.md",
    "README-en.md",
    "README-ja.md",
    "README-ko.md",
    "README-zh-TW.md",
    "docs/CONTENT_ZH.md",
)

BENCH_LINK_RE = re.compile(r"\]\((?:\.\./)?benchmark/\)")
EVAL_LINK_RE = re.compile(r"\]\((?:\.\./)?eval-harness/\)")
# The discrimination row: how many scenarios ship a pass/fail fixture pair. Keyed
# on the fixtures link so the check stays locale-agnostic like the others.
FIXTURE_LINK_RE = re.compile(r"\]\((?:\.\./)?eval-harness/fixtures/\)")
FIXTURE_DIR = ROOT / "eval-harness" / "fixtures"
COLLECTION_LINK_RE = re.compile(r"\]\((?:\.\./)?skills/([^/)#\s]+)/")
# Comma-formatted integers on lines that cite catalog/skills.json as their
# source are treated as claims about the catalog total. (An unrestricted
# document-wide sweep false-positives on ecosystem-repo skill counts such as
# 1,548 or 1,790, so the check is scoped to catalog-sourced lines.)
SKILLTOTAL_RE = re.compile(r"\b(\d),(\d{3})\b")
CATALOG_LINE_MARKER = "catalog/skills.json"
# A markdown table delimiter row, e.g. `|:--|:--|--:|` or `|---|---|`.
TABLE_SEP_RE = re.compile(r"^\|[\s:|-]+\|$")


def expected_counts() -> tuple[int, int, int, int]:
    n_tasks = len(list(TASK_DIR.glob("*.toml")))
    n_scenarios = 0
    n_rubric = 0
    n_fixtures = 0
    for path in sorted(SCENARIO_DIR.glob("*.toml")):
        with path.open("rb") as fh:
            s = toml_compat.load(fh)
        n_scenarios += 1
        n_rubric += len(s.get("rubric", []))
        directory = FIXTURE_DIR / s.get("id", path.stem)
        if (directory / "pass.md").exists() and (directory / "fail.md").exists():
            n_fixtures += 1
    return n_tasks, n_scenarios, n_rubric, n_fixtures


def catalog_facts() -> tuple[set[str], int]:
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    ids = {c["id"] for c in data["collections"]}
    return ids, int(data["summary"]["skill_files"])


def provenance_sources() -> dict[str, str]:
    """Map collection id -> upstream source URL (the one source of truth)."""
    data = json.loads(PROVENANCE.read_text(encoding="utf-8"))
    return {
        c["id"]: c["source_url"] for c in data["collections"] if c.get("source_url")
    }


def widest_collection_table(text: str) -> list[str]:
    """Return the rows of the table that links the most distinct collections.

    Entry documents carry several tables that link ``skills/<id>/`` — the
    all-collections table plus the smaller by-theme groupings. Only the widest
    one carries the source column, and picking it structurally (rather than by
    a translated header) keeps this check locale-agnostic.
    """
    lines = text.splitlines()
    best: list[str] = []
    best_ids = 0
    for i, line in enumerate(lines):
        if not TABLE_SEP_RE.match(line) or i == 0 or not lines[i - 1].startswith("|"):
            continue
        rows: list[str] = []
        j = i + 1
        while j < len(lines) and lines[j].startswith("|"):
            rows.append(lines[j])
            j += 1
        n_ids = len({m for row in rows for m in COLLECTION_LINK_RE.findall(row)})
        if n_ids > best_ids:
            best, best_ids = rows, n_ids
    return best


def check_source_links(path: Path, sources: dict[str, str]) -> list[str]:
    """Every row of the all-collections table must link its upstream repo."""
    problems: list[str] = []
    text = path.read_text(encoding="utf-8")
    try:
        rel = path.relative_to(ROOT).as_posix()
    except ValueError:
        rel = path.name

    rows = widest_collection_table(text)
    if not rows:
        return [f"{rel}: no collection table found"]

    for row in rows:
        ids = COLLECTION_LINK_RE.findall(row)
        if not ids:
            continue
        cid = ids[0]
        expected = sources.get(cid)
        if expected is None:
            problems.append(f"{rel}: {cid} has no source_url in catalog/provenance.json")
            continue
        if f"]({expected})" not in row:
            problems.append(
                f"{rel}: {cid} row does not link its upstream source {expected} "
                f"(catalog/provenance.json is the source of truth)"
            )
    return problems


def check_readme(
    path: Path, n_tasks: int, n_scenarios: int, n_rubric: int, n_fixtures: int
) -> list[str]:
    problems: list[str] = []
    text = path.read_text(encoding="utf-8")
    rel = path.name

    bench_rows = [
        ln for ln in text.splitlines() if BENCH_LINK_RE.search(ln) and ln.lstrip().startswith("|")
    ]
    eval_rows = [
        ln for ln in text.splitlines() if EVAL_LINK_RE.search(ln) and ln.lstrip().startswith("|")
    ]

    # Two row styles exist: the numbers table (`| **13** | [link] |`) and the
    # trust-surface table (`| ... | [link] · 13 tasks |`). Accept either.
    if not bench_rows:
        problems.append(f"{rel}: no stats-table row links to benchmark/")
    for row in bench_rows:
        m = re.search(r"\*\*(\d+)\*\*", row) or re.search(r"\]\((?:\.\./)?benchmark/\)\s*·\s*(\d+)", row)
        if not m:
            problems.append(f"{rel}: benchmark row has no recognizable count: {row.strip()}")
        elif int(m.group(1)) != n_tasks:
            problems.append(
                f"{rel}: benchmark row says {m.group(1)} but benchmark/tasks has {n_tasks} tasks"
            )

    fixture_rows = [
        ln
        for ln in text.splitlines()
        if FIXTURE_LINK_RE.search(ln) and ln.lstrip().startswith("|")
    ]
    if not fixture_rows:
        problems.append(
            f"{rel}: no stats-table row links to eval-harness/fixtures/ "
            "(the discrimination count)"
        )
    for row in fixture_rows:
        m = re.search(r"\*\*(\d+)\*\*", row)
        if not m:
            problems.append(
                f"{rel}: fixtures row has no recognizable count: {row.strip()}"
            )
        elif int(m.group(1)) != n_fixtures:
            problems.append(
                f"{rel}: fixtures row says {m.group(1)} but "
                f"{n_fixtures} scenario(s) ship a pass/fail pair"
            )

    if not eval_rows:
        problems.append(f"{rel}: no stats-table row links to eval-harness/")
    for row in eval_rows:
        m = re.search(r"\*\*(\d+)\s*/\s*(\d+)\*\*", row) or re.search(
            r"\]\((?:\.\./)?eval-harness/\)\s*·\s*(\d+)\D+?(\d+)", row
        )
        if not m:
            problems.append(f"{rel}: eval-harness row has no recognizable 'scenarios / rubric' pair: {row.strip()}")
        elif (int(m.group(1)), int(m.group(2))) != (n_scenarios, n_rubric):
            problems.append(
                f"{rel}: eval-harness row says {m.group(1)} / {m.group(2)} but "
                f"eval-harness/scenarios has {n_scenarios} scenarios / {n_rubric} rubric items"
            )
    return problems


def check_collections(path: Path, catalog_ids: set[str], total_skills: int) -> list[str]:
    problems: list[str] = []
    text = path.read_text(encoding="utf-8")
    try:
        rel = path.relative_to(ROOT).as_posix()
    except ValueError:
        rel = path.name

    linked = set(COLLECTION_LINK_RE.findall(text))
    missing = sorted(catalog_ids - linked)
    unknown = sorted(linked - catalog_ids)
    if missing:
        problems.append(
            f"{rel}: collection table is missing {len(missing)} cataloged collection(s): "
            + ", ".join(missing[:6])
            + (", ..." if len(missing) > 6 else "")
        )
    if unknown:
        problems.append(
            f"{rel}: links {len(unknown)} collection dir(s) not in catalog/skills.json: "
            + ", ".join(unknown[:6])
            + (", ..." if len(unknown) > 6 else "")
        )

    formatted_total = f"{total_skills:,}"
    for line in text.splitlines():
        if CATALOG_LINE_MARKER not in line:
            continue
        for m in SKILLTOTAL_RE.finditer(line):
            token = f"{m.group(1)},{m.group(2)}"
            if token != formatted_total:
                problems.append(
                    f"{rel}: line citing catalog/skills.json says '{token}' but the "
                    f"catalog total is {formatted_total}"
                )
    return problems


LANDING = ROOT / "index.html"
META_DESCRIPTION_RE = re.compile(
    r'<meta\s+name="description"\s+content="([^"]*)"', re.IGNORECASE
)
# The rigor fallback must not hardcode a count; see the module docstring.
RIGOR_FALLBACK_RE = re.compile(
    r'getElementById\("n-rigor"\)\.textContent\s*=\s*"([^"]*)"'
)


def check_landing_page(path: Path, total_skills: int) -> list[str]:
    """Lint the static numbers on the GitHub Pages landing page."""
    if not path.exists():
        return [f"{path.name}: file missing"]
    text = path.read_text(encoding="utf-8")
    problems: list[str] = []

    match = META_DESCRIPTION_RE.search(text)
    if not match:
        problems.append(f"{path.name}: no <meta name=\"description\"> to lint")
    else:
        for group in SKILLTOTAL_RE.finditer(match.group(1)):
            claimed = int(group.group(1) + group.group(2))
            if claimed != total_skills:
                problems.append(
                    f"{path.name}: meta description says {claimed:,} skills but "
                    f"catalog/skills.json has {total_skills:,}"
                )

    for fallback in RIGOR_FALLBACK_RE.finditer(text):
        value = fallback.group(1)
        if any(ch.isdigit() for ch in value):
            problems.append(
                f"{path.name}: the n-rigor fallback hardcodes {value!r}. It renders "
                "only when the badge fetch fails, so a number there goes stale "
                "unwatched — point at RIGOR_COVERAGE instead."
            )
    return problems


def main() -> int:
    n_tasks, n_scenarios, n_rubric, n_fixtures = expected_counts()
    catalog_ids, total_skills = catalog_facts()
    sources = provenance_sources()
    problems: list[str] = []
    for name in READMES:
        path = ROOT / name
        if not path.exists():
            problems.append(f"{name}: file missing")
            continue
        problems.extend(check_readme(path, n_tasks, n_scenarios, n_rubric, n_fixtures))
    for name in COLLECTION_TABLE_DOCS:
        path = ROOT / name
        if path.exists():
            problems.extend(check_collections(path, catalog_ids, total_skills))
            problems.extend(check_source_links(path, sources))
    problems.extend(check_landing_page(LANDING, total_skills))
    if problems:
        print("README stats are stale:", file=sys.stderr)
        for p in problems:
            print(f"  {p}", file=sys.stderr)
        print(
            f"Reality: {n_tasks} benchmark tasks, {n_scenarios} / {n_rubric} eval "
            f"scenarios/rubric items ({n_fixtures} with discrimination fixtures), "
            f"{len(catalog_ids)} collections, "
            f"{total_skills:,} skills (catalog/skills.json).",
            file=sys.stderr,
        )
        return 1
    print(
        f"README stats OK across {len(READMES)} documents: "
        f"{n_tasks} benchmark tasks, {n_scenarios} / {n_rubric} eval scenarios/rubric items "
        f"({n_fixtures} proven to discriminate), "
        f"{len(catalog_ids)} collections / {total_skills:,} skills linked in "
        f"{len(COLLECTION_TABLE_DOCS)} collection tables, "
        f"{len(sources)} upstream source links matching catalog/provenance.json, "
        f"and index.html carrying no stale numbers."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
