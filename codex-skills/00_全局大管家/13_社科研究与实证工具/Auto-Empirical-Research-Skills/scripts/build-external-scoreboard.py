#!/usr/bin/env python3
"""Generate docs/EXTERNAL_SCOREBOARD.md — third-party agents on the shared exam.

[`BENCHMARK_SCOREBOARD.md`](../docs/BENCHMARK_SCOREBOARD.md) scores two
pipelines this repo wrote itself. That is a self-report. This board is for
everyone else: any agent, from any author, graded on the same seventeen tasks
by the same checker.

The one design decision that makes it worth reading: **submitted numbers are
never displayed.** Each submission ships its raw per-task candidate files, and
this generator regrades them from scratch with
`benchmark/check_benchmark.py` — the same code path CI uses, recomputing every
data-derived gold from the committed CSVs. The `summary` block a submitter
wrote is treated as a *claim* and compared against the regrade; a mismatch is a
hard build failure naming the task, not a footnote. So a submitter cannot post
a score they did not earn, and cannot earn one by fabricating numbers either
(that path fails the honest-* golds).

Submission layout, one directory per agent under `benchmark/external/`:

    benchmark/external/<slug>/
        submission.json          # metadata + claimed summary (aers-score submit)
        candidates/<task>.json   # the raw per-task results, regraded here

Rules for who may submit and how entries are ranked live in
[`docs/SCOREBOARD_RULES.md`](../docs/SCOREBOARD_RULES.md).

Zero third-party dependencies. Mirrors the build-*/--check pattern of the other
generators; wired into `make catalog` and `make validate`.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TASK_DIR = ROOT / "benchmark" / "tasks"
EXTERNAL_DIR = ROOT / "benchmark" / "external"
OUT = ROOT / "docs" / "EXTERNAL_SCOREBOARD.md"

sys.path.insert(0, str(ROOT / "scripts"))
import toml_compat  # noqa: E402

SCHEMA = "aers-external-scoreboard/1"
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9._-]*$")

# How an entry is presented. Only `external` entries are ranked; the other two
# exist so the board never has to pretend a first-party or illustrative row is
# an independent result.
ORIGINS = ("external", "first-party", "example")

REQUIRED_FIELDS = ("schema", "agent", "origin", "summary", "tasks")


class SubmissionError(Exception):
    """A submission that cannot be trusted enough to render."""


def _load_checker():
    spec = importlib.util.spec_from_file_location(
        "aers_check_benchmark", ROOT / "benchmark" / "check_benchmark.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def load_tasks() -> dict[str, dict]:
    out = {}
    for path in sorted(TASK_DIR.glob("*.toml")):
        with path.open("rb") as fh:
            task = toml_compat.load(fh)
        out[task["id"]] = task
    return out


def _read_json(path: Path) -> dict:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SubmissionError(f"{_rel(path)}: invalid JSON — {exc.msg} (line {exc.lineno})")
    if not isinstance(payload, dict):
        raise SubmissionError(f"{_rel(path)}: must contain a JSON object")
    return payload


def _rel(path: Path) -> str:
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:  # pragma: no cover - defensive
        return str(path)


def validate_metadata(meta: dict, path: Path) -> None:
    missing = [f for f in REQUIRED_FIELDS if f not in meta]
    if missing:
        raise SubmissionError(f"{_rel(path)}: missing field(s) {', '.join(missing)}")
    if meta["schema"] != SCHEMA:
        raise SubmissionError(
            f"{_rel(path)}: schema {meta['schema']!r}, expected {SCHEMA!r}. "
            "Regenerate with `aers-score submit`."
        )
    if not isinstance(meta["agent"], str) or not meta["agent"].strip():
        raise SubmissionError(f"{_rel(path)}: 'agent' must be a non-empty name")
    if meta["origin"] not in ORIGINS:
        raise SubmissionError(
            f"{_rel(path)}: origin {meta['origin']!r} must be one of {', '.join(ORIGINS)}"
        )
    if not isinstance(meta.get("summary"), dict):
        raise SubmissionError(f"{_rel(path)}: 'summary' must be an object")
    if not isinstance(meta.get("tasks"), dict) or not meta["tasks"]:
        raise SubmissionError(f"{_rel(path)}: 'tasks' must be a non-empty object")


def regrade(checker, tasks: dict[str, dict], directory: Path) -> dict[str, dict]:
    """Score every candidate file in ``<submission>/candidates/`` from scratch."""
    cand_dir = directory / "candidates"
    if not cand_dir.is_dir():
        raise SubmissionError(
            f"{_rel(directory)}: no candidates/ directory. A submission must ship the "
            "raw per-task results so the board can regrade them instead of trusting "
            "the summary."
        )
    files = sorted(cand_dir.glob("*.json"))
    if not files:
        raise SubmissionError(f"{_rel(cand_dir)}: no candidate *.json files")

    scored: dict[str, dict] = {}
    for file in files:
        payload = _read_json(file)
        task_id = payload.get("task")
        if not isinstance(task_id, str) or task_id not in tasks:
            raise SubmissionError(
                f"{_rel(file)}: 'task' must name a current benchmark task "
                f"(got {task_id!r})"
            )
        if task_id in scored:
            raise SubmissionError(f"{_rel(cand_dir)}: two files claim task {task_id!r}")
        task = tasks[task_id]
        problems = checker.validate_candidate(task, payload, file)
        if problems:
            raise SubmissionError(
                f"{_rel(file)}: malformed candidate\n"
                + "\n".join(f"    - {p}" for p in problems)
            )
        truth = checker.compute_truth(task)
        items = checker.grade(task, payload, truth)
        required = [i for i in items if i["required"]]
        scored[task_id] = {
            "earned": sum(i["weight"] for i in items if i["passed"]),
            "possible": sum(i["weight"] for i in items),
            "required_passed": sum(1 for i in required if i["passed"]),
            "required_total": len(required),
            "required_failures": [i["id"] for i in required if not i["passed"]],
        }
    return scored


def cross_check(meta: dict, scored: dict[str, dict], path: Path) -> None:
    """Fail loudly when a submitted claim disagrees with the regrade."""
    claimed_tasks = set(meta["tasks"])
    regraded_tasks = set(scored)
    only_claimed = sorted(claimed_tasks - regraded_tasks)
    if only_claimed:
        raise SubmissionError(
            f"{_rel(path)}: claims a score for {', '.join(only_claimed)} but ships no "
            "candidate file for it. Every claimed task must be regradable."
        )
    only_shipped = sorted(regraded_tasks - claimed_tasks)
    if only_shipped:
        raise SubmissionError(
            f"{_rel(path)}: ships candidates for {', '.join(only_shipped)} that the "
            "summary does not claim. Regenerate with `aers-score submit`."
        )

    mismatches = []
    for task_id in sorted(claimed_tasks):
        claim = meta["tasks"][task_id]
        actual = scored[task_id]
        if not isinstance(claim, dict):
            mismatches.append(f"{task_id}: claim is not an object")
            continue
        if claim.get("earned") != actual["earned"]:
            mismatches.append(
                f"{task_id}: claimed {claim.get('earned')} points, regrade says "
                f"{actual['earned']}"
            )
        claimed_failures = claim.get("required_failures")
        if claimed_failures is not None and sorted(claimed_failures) != sorted(
            actual["required_failures"]
        ):
            mismatches.append(
                f"{task_id}: claimed required failures {sorted(claimed_failures)}, "
                f"regrade says {actual['required_failures']}"
            )
    if mismatches:
        raise SubmissionError(
            f"{_rel(path)}: the submitted summary disagrees with the regrade:\n"
            + "\n".join(f"    - {m}" for m in mismatches)
            + "\n    Regenerate the submission with `aers-score submit`; the board "
            "publishes the regrade, never the claim."
        )


def load_submissions() -> list[dict]:
    """Every submission directory, regraded and cross-checked."""
    if not EXTERNAL_DIR.is_dir():
        return []
    checker = _load_checker()
    tasks = load_tasks()
    entries = []
    for directory in sorted(p for p in EXTERNAL_DIR.iterdir() if p.is_dir()):
        slug = directory.name
        if slug.startswith("."):
            continue
        if not SLUG_RE.match(slug):
            raise SubmissionError(
                f"{_rel(directory)}: directory name must be lowercase "
                "alphanumeric with . _ - (it becomes the board's row id)"
            )
        meta_path = directory / "submission.json"
        if not meta_path.exists():
            raise SubmissionError(
                f"{_rel(directory)}: no submission.json. Produce one with "
                "`aers-score submit <candidates-dir> --agent NAME`."
            )
        meta = _read_json(meta_path)
        validate_metadata(meta, meta_path)
        scored = regrade(checker, tasks, directory)
        cross_check(meta, scored, meta_path)
        entries.append(
            {
                "slug": slug,
                "agent": meta["agent"].strip(),
                "origin": meta["origin"],
                "url": (meta.get("agent_url") or "").strip(),
                "version": (meta.get("agent_version") or "").strip(),
                "notes": (meta.get("notes") or "").strip(),
                "produced_by": (meta.get("produced_by") or "").strip(),
                "exam_commit": (meta.get("exam_commit") or "").strip(),
                "scored": scored,
            }
        )
    return entries


def _totals(entry: dict, n_tasks: int) -> dict:
    scored = entry["scored"]
    clean = sum(1 for s in scored.values() if not s["required_failures"])
    return {
        "attempted": len(scored),
        "skipped": n_tasks - len(scored),
        "clean": clean,
        "earned": sum(s["earned"] for s in scored.values()),
        "possible": sum(s["possible"] for s in scored.values()),
    }


def _rank_key(entry: dict, n_tasks: int):
    t = _totals(entry, n_tasks)
    # Clean tasks first, then points, then coverage — so an agent cannot climb
    # by attempting only the tasks it is good at (see SCOREBOARD_RULES.md).
    return (-t["clean"], -t["earned"], -t["attempted"], entry["agent"].lower())


def _agent_cell(entry: dict) -> str:
    name = entry["agent"]
    label = f"[{name}]({entry['url']})" if entry["url"] else name
    return f"{label}{' ' + entry['version'] if entry['version'] else ''}"


def render(entries: list[dict], n_tasks: int) -> str:
    ranked = sorted(
        (e for e in entries if e["origin"] == "external"), key=lambda e: _rank_key(e, n_tasks)
    )
    reference = [e for e in entries if e["origin"] == "first-party"]
    examples = [e for e in entries if e["origin"] == "example"]

    out: list[str] = []
    out.append("<!-- GENERATED by scripts/build-external-scoreboard.py. Do not edit by hand;")
    out.append("     run `make catalog` to refresh. -->")
    out.append("")
    out.append("# External Scoreboard — other people's agents, on our exam")
    out.append("")
    out.append(
        "[`BENCHMARK_SCOREBOARD.md`](BENCHMARK_SCOREBOARD.md) scores two pipelines this "
        "repo wrote itself, which is a self-report. This board is for everyone else: any "
        f"agent, from any author, on the same **{n_tasks} deterministic tasks** in "
        "[`benchmark/tasks/`](../benchmark/tasks/)."
    )
    out.append("")
    out.append(
        "**Submitted numbers are never displayed.** Every entry ships its raw per-task "
        "candidate files, and this page is built by regrading them from scratch with "
        "[`benchmark/check_benchmark.py`](../benchmark/check_benchmark.py) — the same code "
        "path CI runs, recomputing each data-derived gold from the committed CSVs. The "
        "`summary` a submitter writes is treated as a claim and compared against that "
        "regrade; a disagreement fails the build. So the numbers below are ours, not "
        "theirs, and fabricated inputs fail the honest-* golds regardless."
    )
    out.append("")
    out.append(
        "How to get on the board: [`SCOREBOARD_RULES.md`](SCOREBOARD_RULES.md). "
        "The tooling is [`aers-score`](../aers_score/README.md)."
    )
    out.append("")

    out.append("## Ranked entries")
    out.append("")
    if ranked:
        out.append(
            "Ranked by tasks with **every required gold passing**, then by points, then "
            "by coverage — attempting fewer tasks can never improve a position."
        )
        out.append("")
        out.append("| # | Agent | Tasks clean | Points | Attempted | Notes |")
        out.append("|---:|---|---:|---:|---:|---|")
        for i, entry in enumerate(ranked, start=1):
            t = _totals(entry, n_tasks)
            out.append(
                f"| {i} | {_agent_cell(entry)} | **{t['clean']}/{t['attempted']}** | "
                f"{t['earned']}/{t['possible']} | {t['attempted']}/{n_tasks} | "
                f"{entry['notes'] or '—'} |"
            )
    else:
        out.append(
            "*No third-party submissions yet.* The board is open and the machinery below "
            "is live — the example row is regraded by CI on every build, so the first "
            "real submission renders the moment it lands."
        )
    out.append("")

    if reference:
        out.append("## First-party reference (not ranked)")
        out.append("")
        out.append(
            "AERS's own pipelines, shown for scale. They are excluded from the ranking "
            "because the exam's authors setting the top of their own leaderboard is not "
            "evidence of anything."
        )
        out.append("")
        out.append("| Pipeline | Tasks clean | Points | Attempted |")
        out.append("|---|---:|---:|---:|")
        for entry in sorted(reference, key=lambda e: e["agent"].lower()):
            t = _totals(entry, n_tasks)
            out.append(
                f"| {_agent_cell(entry)} | {t['clean']}/{t['attempted']} | "
                f"{t['earned']}/{t['possible']} | {t['attempted']}/{n_tasks} |"
            )
        out.append("")

    if examples:
        out.append("## Worked example (not a real agent)")
        out.append("")
        out.append(
            "A hand-written submission that exists to document the format and to keep the "
            "regrade path exercised in CI. It deliberately falls into one task's trap, so "
            "the board demonstrates a partial score rather than only perfect ones."
        )
        out.append("")
        for entry in sorted(examples, key=lambda e: e["slug"]):
            t = _totals(entry, n_tasks)
            out.append(
                f"- [`benchmark/external/{entry['slug']}/`](../benchmark/external/"
                f"{entry['slug']}/) — {t['clean']}/{t['attempted']} tasks clean, "
                f"{t['earned']}/{t['possible']} points"
            )
            for task_id in sorted(entry["scored"]):
                s = entry["scored"][task_id]
                mark = "clean" if not s["required_failures"] else (
                    "required failure: " + ", ".join(s["required_failures"])
                )
                out.append(
                    f"  - `{task_id}` — {s['required_passed']}/{s['required_total']} "
                    f"required golds, {s['earned']}/{s['possible']} points ({mark})"
                )
        out.append("")

    out.append("## Per-task detail")
    out.append("")
    detail = ranked + reference
    if detail:
        task_ids = sorted({t for e in detail for t in e["scored"]})
        header = "| Task | " + " | ".join(_agent_cell(e) for e in detail) + " |"
        sep = "|---|" + "---:|" * len(detail)
        out.append(header)
        out.append(sep)
        for task_id in task_ids:
            cells = []
            for entry in detail:
                s = entry["scored"].get(task_id)
                if s is None:
                    cells.append("—")
                elif s["required_failures"]:
                    cells.append(f"**{s['required_passed']}/{s['required_total']}** ❌")
                else:
                    cells.append(f"{s['required_passed']}/{s['required_total']} ✅")
            out.append(f"| `{task_id}` | " + " | ".join(cells) + " |")
    else:
        out.append("*Nothing ranked yet.*")
    out.append("")

    out.append("---")
    out.append("")
    n_external = len(ranked)
    out.append(
        f"_{n_external} third-party {'entry' if n_external == 1 else 'entries'} across "
        f"{n_tasks} benchmark tasks. Every score on this page was recomputed by "
        "`scripts/build-external-scoreboard.py`, not copied from a submission. "
        "Regenerate with `make catalog`._"
    )
    return "\n".join(out) + "\n"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument(
        "--check",
        action="store_true",
        help="verify the committed page matches a fresh build (no writes)",
    )
    args = ap.parse_args(argv)

    try:
        entries = load_submissions()
    except SubmissionError as exc:
        print(f"Invalid benchmark submission:\n  {exc}", file=sys.stderr)
        return 1

    rendered = render(entries, len(load_tasks()))
    if args.check:
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != rendered:
            print(
                f"{OUT.relative_to(ROOT)} is stale. Regenerate with:\n"
                "  python3 scripts/build-external-scoreboard.py",
                file=sys.stderr,
            )
            return 1
        print(f"{OUT.relative_to(ROOT)} is current.")
        return 0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(rendered, encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)} ({len(entries)} submission(s))")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
