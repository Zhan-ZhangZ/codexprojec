"""Command line front end for the AERS numeric benchmark.

    aers-score tasks                 what is on the exam
    aers-score describe <task>       what one task grades, and the trap it sets
    aers-score init <dir>            scaffold candidate files with the right fields
    aers-score grade <dir>           score them, with a reference comparison
    aers-score submit <dir>          package a scorecard for the public scoreboard
    aers-score where                 which checkout is being used, and why

Every command accepts ``--repo PATH`` and honours ``$AERS_REPO``; inside a
checkout neither is needed.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from . import __version__
from .exam import ENV_VAR, Exam, ExamError, ExamNotFound, find_repo, load_candidate_dir

SUBMISSION_SCHEMA = "aers-external-scoreboard/1"
SUBMISSION_FILENAME = "submission.json"


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def _open_exam(args: argparse.Namespace) -> Exam:
    root, source = find_repo(getattr(args, "repo", None))
    return Exam(root, source)


def _emit(payload: object, as_json: bool, human: str) -> None:
    if as_json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(human)


def _bar(earned: int, possible: int, width: int = 18) -> str:
    if possible <= 0:
        return " " * width
    filled = round(width * earned / possible)
    return "#" * filled + "." * (width - filled)


def _git_commit(root: Path) -> str | None:
    """The checkout's HEAD, so a scorecard names the exam it was taken on."""
    try:
        proc = subprocess.run(
            ["git", "-C", str(root), "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return proc.stdout.strip() or None if proc.returncode == 0 else None


def _scaffold(exam: Exam, task_id: str) -> dict:
    """A candidate skeleton carrying every field this task grades, unfilled.

    ``null`` rather than ``0.0``: a missing number must read as missing. The
    graders treat absent fields as failures with a "missing <field>" detail,
    which is the honest outcome for a pipeline that did not compute it —
    whereas a placeholder zero silently becomes a wrong answer.
    """
    numeric, maps = exam.candidate_fields(task_id)
    spec = exam.task(task_id)
    payload: dict[str, object] = {
        "task": task_id,
        "method": f"TODO: one line naming the estimator you ran for {task_id}",
    }
    for field in numeric:
        payload[field] = None
    for field in maps:
        payload[field] = {}
    payload["_readme"] = (
        f"Fill every numeric field from your own run over {spec['data']}. "
        "Golds are recomputed from that CSV at grading time, so fabricated "
        "numbers fail the honest-* cross-checks. Delete this key when done."
    )
    return payload


# --------------------------------------------------------------------------
# commands
# --------------------------------------------------------------------------
def cmd_where(args: argparse.Namespace) -> int:
    exam = _open_exam(args)
    tasks = exam.tasks()
    commit = _git_commit(exam.root)
    payload = {
        "repo": str(exam.root),
        "resolved_via": exam.source,
        "commit": commit,
        "tasks": len(tasks),
        "cli_version": __version__,
    }
    human = "\n".join(
        [
            f"exam repo    {exam.root}",
            f"resolved via {exam.source}",
            f"commit       {commit or '(not a git checkout)'}",
            f"tasks        {len(tasks)}",
            f"aers-score   {__version__}",
        ]
    )
    _emit(payload, args.json, human)
    return 0


def cmd_tasks(args: argparse.Namespace) -> int:
    exam = _open_exam(args)
    rows = []
    for task_id, spec in exam.tasks().items():
        golds = spec.get("gold", [])
        rows.append(
            {
                "id": task_id,
                "data": spec.get("data", ""),
                "gold_items": len(golds),
                "required_items": sum(1 for g in golds if g.get("required")),
                "points": sum(int(g.get("weight", 1)) for g in golds),
                "title": spec.get("title", ""),
            }
        )
    if args.json:
        print(json.dumps(rows, indent=2, sort_keys=True))
        return 0

    width = max(len(r["id"]) for r in rows)
    print(f"{len(rows)} benchmark tasks in {exam.root}\n")
    print(f"{'task'.ljust(width)}  gold  req  pts  dataset")
    print(f"{'-' * width}  ----  ---  ---  -------")
    for row in rows:
        print(
            f"{row['id'].ljust(width)}  {row['gold_items']:>4}  {row['required_items']:>3}"
            f"  {row['points']:>3}  {row['data']}"
        )
    print("\nDetail for one task:  aers-score describe <task>")
    return 0


def cmd_describe(args: argparse.Namespace) -> int:
    exam = _open_exam(args)
    spec = exam.task(args.task)
    numeric, maps = exam.candidate_fields(args.task)
    golds = exam.gold_summary(args.task)

    if args.json:
        print(
            json.dumps(
                {
                    "id": args.task,
                    "title": spec.get("title", ""),
                    "description": spec.get("description", "").strip(),
                    "data": spec.get("data", ""),
                    "candidate_fields": {"numeric": numeric, "maps": maps},
                    "gold": golds,
                },
                indent=2,
                sort_keys=True,
            )
        )
        return 0

    print(f"{args.task}\n{'=' * len(args.task)}\n")
    print(spec.get("title", "").strip() + "\n")
    description = spec.get("description", "").strip()
    if description:
        print(description + "\n")
    print(f"dataset: {spec.get('data', '')}")
    print(f"report:  {', '.join(numeric) or '(none)'}")
    if maps:
        print(f"         {', '.join(maps)} (object of numeric values)")
    print()
    width = max((len(g["id"]) for g in golds), default=0)
    print(f"{'gold item'.ljust(width)}  req  pts  what it demands")
    print(f"{'-' * width}  ---  ---  ---------------")
    for gold in golds:
        mark = " * " if gold["required"] else "   "
        print(f"{gold['id'].ljust(width)}  {mark}  {gold['weight']:>3}  {gold['description']}")
    print(f"\nScaffold a candidate:  aers-score init ./my-run --task {args.task}")
    return 0


def cmd_init(args: argparse.Namespace) -> int:
    exam = _open_exam(args)
    task_ids = [args.task] if args.task else list(exam.tasks())
    for task_id in task_ids:
        exam.task(task_id)  # raises ExamError on an unknown id, before writing

    out_dir = Path(args.directory).expanduser()
    out_dir.mkdir(parents=True, exist_ok=True)
    written, skipped = [], []
    for task_id in task_ids:
        target = out_dir / f"{task_id}.json"
        if target.exists() and not args.force:
            skipped.append(target.name)
            continue
        target.write_text(
            json.dumps(_scaffold(exam, task_id), indent=2) + "\n", encoding="utf-8"
        )
        written.append(target.name)

    if args.json:
        print(json.dumps({"directory": str(out_dir), "written": written, "skipped": skipped},
                         indent=2, sort_keys=True))
        return 0
    print(f"Wrote {len(written)} candidate skeleton(s) to {out_dir}")
    if skipped:
        print(f"Kept {len(skipped)} existing file(s) (pass --force to overwrite): "
              + ", ".join(skipped))
    print("\nFill in the numbers your pipeline produced, then:")
    print(f"  aers-score grade {out_dir}")
    return 0


def _score_directory(exam: Exam, path: Path) -> list[dict]:
    loaded = load_candidate_dir(path)
    known = exam.tasks()
    cards = []
    for task_id, (file, payload) in sorted(loaded.items()):
        if task_id not in known:
            cards.append(
                {
                    "task": task_id,
                    "graded": False,
                    "problems": ["unknown benchmark task (see `aers-score tasks`)"],
                    "unfilled": [],
                    "source": file.name,
                    "earned": 0,
                    "possible": 0,
                    "required_failures": [],
                    "optional_failures": [],
                    "items": [],
                }
            )
            continue
        card = exam.grade_candidate(task_id, payload, source=file)
        card["source"] = file.name
        cards.append(card)
    return cards


def cmd_grade(args: argparse.Namespace) -> int:
    exam = _open_exam(args)
    cards = _score_directory(exam, Path(args.directory))
    if args.task:
        cards = [c for c in cards if c["task"] == args.task]
        if not cards:
            raise ExamError(f"no candidate file for task {args.task!r} in {args.directory}")

    earned = sum(c["earned"] for c in cards)
    possible = sum(c["possible"] for c in cards)
    clean = [c for c in cards if c["graded"] and not c["required_failures"]]
    summary = {
        "tasks_attempted": len(cards),
        "tasks_all_required_passing": len(clean),
        "earned": earned,
        "possible": possible,
    }

    if args.json:
        print(json.dumps({"summary": summary, "tasks": cards}, indent=2, sort_keys=True))
    else:
        _print_scorecards(exam, cards, summary, verbose=args.verbose)

    # A candidate that fails to load at all is always an error; required-gold
    # failures are only an error under --strict, because "you fell into the
    # trap" is a legitimate, informative result to print and keep going.
    if any(not c["graded"] for c in cards):
        return 1
    if args.strict and any(c["required_failures"] for c in cards):
        return 1
    return 0


def _print_scorecards(exam: Exam, cards: list[dict], summary: dict, verbose: bool) -> None:
    width = max((len(c["task"]) for c in cards), default=0)
    for card in cards:
        task_id = card["task"]
        if not card["graded"]:
            print(f"[{task_id}] not graded ({card.get('source', '?')})")
            for problem in card["problems"]:
                print(f"    - {problem}")
            print()
            continue
        unfilled = card.get("unfilled") or []
        if unfilled:
            print(
                f"[    ] {task_id}  {len(unfilled)} field(s) still unfilled: "
                + ", ".join(unfilled)
            )
        head = f"{task_id.ljust(width)}  {card['earned']:>3}/{card['possible']:<3}"
        status = "PASS" if not card["required_failures"] else "FAIL"
        print(f"[{status}] {head}  {_bar(card['earned'], card['possible'])}")
        if verbose:
            for item in card["items"]:
                mark = "PASS" if item["passed"] else "FAIL"
                req = "*" if item["required"] else " "
                print(f"          [{mark}]{req} {item['id']:32s} {item['detail']}")
        else:
            for item in card["items"]:
                if not item["passed"]:
                    req = "required" if item["required"] else "optional"
                    print(f"          {req}: {item['id']} — {item['detail']}")
    print()
    print(
        f"{summary['tasks_all_required_passing']}/{summary['tasks_attempted']} tasks with every "
        f"required gold passing   ({summary['earned']}/{summary['possible']} points)"
    )
    if summary["tasks_all_required_passing"] < summary["tasks_attempted"]:
        print("Re-run with --verbose to see every gold item, or `aers-score describe <task>`.")


def cmd_submit(args: argparse.Namespace) -> int:
    exam = _open_exam(args)
    directory = Path(args.directory).expanduser()
    cards = _score_directory(exam, directory)
    ungraded = [c["task"] for c in cards if not c["graded"]]
    if ungraded:
        raise ExamError(
            "these candidates do not grade, so they cannot be submitted: "
            + ", ".join(ungraded)
            + f"\nRun `aers-score grade {directory}` to see why."
        )
    unfinished = [c["task"] for c in cards if c.get("unfilled")]
    if unfinished:
        raise ExamError(
            "these candidates still carry unfilled scaffold fields: "
            + ", ".join(unfinished)
            + "\nA submitted scorecard should reflect a real run, so fill them in "
            "(or delete the keys your pipeline genuinely does not produce)."
        )

    tasks = {
        c["task"]: {
            "earned": c["earned"],
            "possible": c["possible"],
            "required_failures": c["required_failures"],
            "optional_failures": c["optional_failures"],
        }
        for c in cards
    }
    submission = {
        "schema": SUBMISSION_SCHEMA,
        "agent": args.agent,
        "origin": args.origin,
        "agent_url": args.url or "",
        "agent_version": args.agent_version or "",
        "notes": args.notes or "",
        "produced_by": f"aers-score {__version__}",
        "exam_commit": _git_commit(exam.root) or "",
        "summary": {
            "tasks_attempted": len(cards),
            "tasks_all_required_passing": sum(1 for c in cards if not c["required_failures"]),
            "earned": sum(c["earned"] for c in cards),
            "possible": sum(c["possible"] for c in cards),
        },
        "tasks": tasks,
    }

    target = Path(args.output) if args.output else directory / SUBMISSION_FILENAME
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(submission, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    if args.json:
        print(json.dumps(submission, indent=2, sort_keys=True))
        return 0
    s = submission["summary"]
    print(f"Wrote {target}")
    print(
        f"  {args.agent}: {s['tasks_all_required_passing']}/{s['tasks_attempted']} tasks clean, "
        f"{s['earned']}/{s['possible']} points"
    )
    print(
        "\nThe scoreboard regrades your raw candidate files rather than trusting these\n"
        "numbers, so submit the candidates alongside the submission. See\n"
        "docs/SCOREBOARD_RULES.md for where to put them."
    )
    return 0


# --------------------------------------------------------------------------
# entry point
# --------------------------------------------------------------------------
def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="aers-score",
        description="Take the AERS numeric benchmark and score yourself against it.",
        epilog=(
            "The exam (task specs + datasets + graders) lives in an AERS checkout. "
            f"Pass --repo, set ${ENV_VAR}, or run from inside one."
        ),
    )
    parser.add_argument("--version", action="version", version=f"aers-score {__version__}")
    parser.add_argument(
        "--repo",
        metavar="PATH",
        help=f"AERS checkout to grade against (default: ${ENV_VAR}, then the current directory)",
    )
    parser.add_argument("--json", action="store_true", help="machine-readable output")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("where", help="show which checkout the CLI resolved, and how")
    p.set_defaults(func=cmd_where)

    p = sub.add_parser("tasks", help="list the benchmark tasks")
    p.set_defaults(func=cmd_tasks)

    p = sub.add_parser("describe", help="show one task's golds and required fields")
    p.add_argument("task")
    p.set_defaults(func=cmd_describe)

    p = sub.add_parser("init", help="scaffold candidate files with the fields each task grades")
    p.add_argument("directory")
    p.add_argument("--task", help="scaffold a single task (default: all of them)")
    p.add_argument("--force", action="store_true", help="overwrite existing candidate files")
    p.set_defaults(func=cmd_init)

    p = sub.add_parser("grade", help="score a candidate directory")
    p.add_argument("directory")
    p.add_argument("--task", help="grade a single task")
    p.add_argument("--verbose", action="store_true", help="print every gold item, not just failures")
    p.add_argument(
        "--strict",
        action="store_true",
        help="exit non-zero when any required gold fails (default: report and exit 0)",
    )
    p.set_defaults(func=cmd_grade)

    p = sub.add_parser("submit", help="package a scorecard for the public scoreboard")
    p.add_argument("directory")
    p.add_argument("--agent", required=True, help="name of the agent or pipeline being scored")
    p.add_argument(
        "--origin",
        default="external",
        choices=("external", "first-party", "example"),
        help="how the board should present the entry (default: external — only these are ranked)",
    )
    p.add_argument("--url", help="link to the agent's repo or docs")
    p.add_argument("--agent-version", help="version of the agent that produced these results")
    p.add_argument("--notes", help="one line on how the run was produced")
    p.add_argument("--output", help=f"write here instead of <directory>/{SUBMISSION_FILENAME}")
    p.set_defaults(func=cmd_submit)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return args.func(args)
    except ExamNotFound as exc:
        print(str(exc), file=sys.stderr)
        return 2
    except ExamError as exc:
        print(f"aers-score: {exc}", file=sys.stderr)
        return 2
    except BrokenPipeError:  # pragma: no cover - `aers-score tasks | head`
        return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
