"""Locate the AERS exam and drive its graders.

"The exam" is three things that must agree: the task specs in
``benchmark/tasks/*.toml``, the datasets in ``benchmark/data/*.csv``, and the
graders in ``benchmark/check_benchmark.py``. They only mean anything together —
the golds are *recomputed from the data* at grading time, so a task spec paired
with someone else's CSV grades nothing.

That is why this module resolves a whole checkout rather than bundling a copy
of the exam inside the wheel. A second copy of the datasets would be a silent
drift surface with no upside: you cannot produce a candidate without the
datasets in the first place, so anyone scoring themselves already has the
checkout.

Resolution order, first hit wins:

1. an explicit ``--repo`` / ``repo_root=`` argument;
2. ``$AERS_REPO``;
3. the nearest ancestor of the current directory that looks like a checkout;
4. the checkout this package was installed from (``pip install -e .``).
"""

from __future__ import annotations

import importlib.util
import json
import os
import sys
from pathlib import Path
from typing import Any, Iterator

ENV_VAR = "AERS_REPO"

# A checkout is identified by the three parts of the exam, not by a name — a
# renamed or vendored copy still grades correctly.
# For an editable or source install, the package sits inside the checkout.
_INSTALL_ROOT = Path(__file__).resolve().parents[1]

_MARKERS = (
    Path("benchmark") / "check_benchmark.py",
    Path("benchmark") / "tasks",
    Path("benchmark") / "data",
)


class ExamNotFound(RuntimeError):
    """Raised when no AERS checkout could be resolved."""


class ExamError(RuntimeError):
    """Raised when a resolved checkout is present but unusable."""


def looks_like_checkout(path: Path) -> bool:
    return all((path / marker).exists() for marker in _MARKERS)


def _candidate_roots(explicit: str | Path | None) -> Iterator[tuple[Path, str]]:
    if explicit:
        yield Path(explicit).expanduser().resolve(), "--repo"
    env = os.environ.get(ENV_VAR)
    if env:
        yield Path(env).expanduser().resolve(), f"${ENV_VAR}"
    here = Path.cwd().resolve()
    for parent in (here, *here.parents):
        yield parent, "current directory"
    # For an editable/source install this is the checkout itself.
    yield _INSTALL_ROOT, "install location"


def find_repo(explicit: str | Path | None = None) -> tuple[Path, str]:
    """Return ``(repo_root, how_it_was_found)`` or raise :class:`ExamNotFound`.

    An explicitly named checkout is authoritative: if ``--repo`` or ``$AERS_REPO``
    points somewhere without an exam, that is an error to report, not a reason
    to quietly grade against a different checkout that happens to be nearby.
    Only the implicit sources (the working directory, the install location) fall
    through to each other.
    """
    tried: list[str] = []
    seen: set[Path] = set()
    for root, source in _candidate_roots(explicit):
        if root in seen:
            continue
        seen.add(root)
        explicitly_named = source in ("--repo", f"${ENV_VAR}")
        if looks_like_checkout(root):
            return root, source
        if explicitly_named:
            raise ExamNotFound(
                f"{source} points at {root}, which has no benchmark/ exam "
                "(expected benchmark/check_benchmark.py, benchmark/tasks and "
                "benchmark/data).\n"
                "Point it at an AERS checkout, or drop the setting to search "
                "from the current directory."
            )
    hint = "\n".join(f"  {line}" for line in tried)
    raise ExamNotFound(
        "Could not find an AERS checkout containing benchmark/tasks, "
        "benchmark/data and benchmark/check_benchmark.py.\n"
        + (hint + "\n" if hint else "")
        + "\nGet one, then point the CLI at it:\n"
        "  git clone https://github.com/brycewang-stanford/Auto-Empirical-Research-Skills\n"
        f"  export {ENV_VAR}=$PWD/Auto-Empirical-Research-Skills\n"
        "  aers-score tasks\n"
        "\nOr pass it per-invocation with --repo PATH."
    )


def strip_unfilled(candidate: dict) -> tuple[dict, list[str]]:
    """Drop scaffold leftovers, returning ``(payload, unfilled_field_names)``.

    ``aers-score init`` writes every gradeable field as ``null`` so the shape of
    the answer is visible before any numbers exist. Passing those nulls to the
    checker would produce "field must be numeric" type errors, which reads as a
    malformed submission rather than an unfinished one. Removing them instead
    lets the graders report the honest thing — "missing <field>" — and lets a
    half-finished candidate score the half that is finished.

    Keys beginning with ``_`` are scaffold annotations and are dropped too.
    """
    payload, unfilled = {}, []
    for key, value in candidate.items():
        if key.startswith("_"):
            continue
        if value is None:
            unfilled.append(key)
            continue
        payload[key] = value
    return payload, sorted(unfilled)


class Exam:
    """A resolved checkout: its tasks, its data, and its graders."""

    def __init__(self, root: Path, source: str = "explicit") -> None:
        self.root = root
        self.source = source
        self._checker: Any | None = None
        self._tasks: dict[str, dict] | None = None

    # -- plumbing ---------------------------------------------------------
    @property
    def tasks_dir(self) -> Path:
        return self.root / "benchmark" / "tasks"

    @property
    def checker(self) -> Any:
        """The repo's own grader module, loaded by path.

        ``check_benchmark.py`` is a script, not an installed module, and it
        resolves datasets relative to its module-level ``ROOT``. Loading it here
        (and re-pointing ``ROOT`` at the resolved checkout) is what keeps this
        CLI a front end rather than a fork: every gold, tolerance and
        anti-fabrication cross-check stays defined in exactly one place.
        """
        if self._checker is not None:
            return self._checker
        path = self.root / "benchmark" / "check_benchmark.py"
        if not path.exists():  # pragma: no cover - guarded by looks_like_checkout
            raise ExamError(f"missing grader: {path}")
        # check_benchmark.py imports its own siblings (lalonde, card, ...) and
        # scripts/toml_compat by bare name, so both directories must be on the
        # path before the module body executes.
        for extra in (self.root / "scripts", path.parent / "lib", path.parent):
            entry = str(extra)
            if entry not in sys.path:
                sys.path.insert(0, entry)
        spec = importlib.util.spec_from_file_location("aers_score._checker", path)
        if spec is None or spec.loader is None:  # pragma: no cover - defensive
            raise ExamError(f"cannot load grader: {path}")
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        module.ROOT = self.root
        self._checker = module
        return module

    # -- tasks ------------------------------------------------------------
    def tasks(self) -> dict[str, dict]:
        """Every task spec in the checkout, keyed by id, validated on load."""
        if self._tasks is not None:
            return self._tasks
        toml = self.checker.tomllib
        out: dict[str, dict] = {}
        for path in sorted(self.tasks_dir.glob("*.toml")):
            with path.open("rb") as fh:
                spec = toml.load(fh)
            problems = self.checker.validate_task(spec, path)
            if problems:
                raise ExamError(
                    f"invalid task spec {path.name}:\n"
                    + "\n".join(f"  - {p}" for p in problems)
                )
            out[spec["id"]] = spec
        if not out:
            raise ExamError(f"no benchmark tasks found in {self.tasks_dir}")
        self._tasks = out
        return out

    def task(self, task_id: str) -> dict:
        tasks = self.tasks()
        if task_id not in tasks:
            known = ", ".join(sorted(tasks))
            raise ExamError(f"no such task {task_id!r}. Known tasks: {known}")
        return tasks[task_id]

    # -- candidate shape --------------------------------------------------
    def candidate_fields(self, task_id: str) -> tuple[list[str], list[str]]:
        """Return ``(numeric_fields, map_fields)`` a candidate may report.

        Read straight off the grader's own declarations so a scaffold can never
        advertise a field the checker does not know about.
        """
        checker = self.checker
        numeric = list(checker.CANDIDATE_NUMERIC_FIELDS.get(task_id, ()))
        maps = list(checker.CANDIDATE_NUMERIC_MAP_FIELDS.get(task_id, ()))
        # Some golds address fields by name in the spec (``field``,
        # ``near_field``, ``far_field``) that are not in the declared tuple.
        spec = self.task(task_id)
        for gold in spec.get("gold", []):
            for key in ("field", "near_field", "far_field"):
                name = gold.get(key)
                if isinstance(name, str) and name and name not in numeric and name not in maps:
                    numeric.append(name)
        return numeric, maps

    def gold_summary(self, task_id: str) -> list[dict]:
        """One row per gold item: what it demands and how much it is worth."""
        spec = self.task(task_id)
        rows = []
        for gold in spec.get("gold", []):
            rows.append(
                {
                    "id": gold.get("id", ""),
                    "required": bool(gold.get("required", False)),
                    "weight": int(gold.get("weight", 1)),
                    "check": gold.get("check", ""),
                    "description": gold.get("description", ""),
                }
            )
        return rows

    # -- grading ----------------------------------------------------------
    def grade_candidate(self, task_id: str, candidate: dict, source: Path | None = None) -> dict:
        """Score one candidate payload against one task.

        Returns a scorecard dict. Validation problems are returned rather than
        raised so a batch run can report every task instead of dying on the
        first malformed file.
        """
        spec = self.task(task_id)
        label = source if source is not None else Path(f"<{task_id}>")
        payload, unfilled = strip_unfilled(candidate)
        problems = self.checker.validate_candidate(spec, payload, label)
        if problems:
            return {
                "task": task_id,
                "graded": False,
                "problems": problems,
                "unfilled": unfilled,
                "earned": 0,
                "possible": sum(int(g.get("weight", 1)) for g in spec.get("gold", [])),
                "required_failures": [],
                "optional_failures": [],
                "items": [],
            }
        truth = self.checker.compute_truth(spec)
        items = self.checker.grade(spec, payload, truth)
        earned = sum(i["weight"] for i in items if i["passed"])
        possible = sum(i["weight"] for i in items)
        return {
            "task": task_id,
            "graded": True,
            "problems": [],
            "unfilled": unfilled,
            "n": truth.get("n"),
            "earned": earned,
            "possible": possible,
            "required_failures": [i["id"] for i in items if i["required"] and not i["passed"]],
            "optional_failures": [
                i["id"] for i in items if not i["required"] and not i["passed"]
            ],
            "items": items,
        }

    def reference_candidate(self, task_id: str) -> dict | None:
        """The committed reference ``results.json`` for a task, if present."""
        spec = self.task(task_id)
        name = spec.get("reference_candidate")
        if not name:
            return None
        path = self.root / "benchmark" / "candidates" / name / "results.json"
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))


def load_candidate_dir(path: Path) -> dict[str, tuple[Path, dict]]:
    """Read a candidate directory into ``{task_id: (path, payload)}``.

    Accepts either a directory of ``<task-id>.json`` files, a directory holding
    a single ``results.json``, or a single JSON file. Every payload must name
    its own task, which is what lets one directory hold a whole exam.
    """
    path = Path(path).expanduser()
    if path.is_file():
        files = [path]
    elif path.is_dir():
        files = sorted(p for p in path.glob("*.json") if p.name != "submission.json")
        if not files:
            raise ExamError(f"no *.json candidate files in {path}")
    else:
        raise ExamError(f"no such candidate path: {path}")

    out: dict[str, tuple[Path, dict]] = {}
    for file in files:
        try:
            payload = json.loads(file.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ExamError(f"{file}: invalid JSON — {exc.msg} (line {exc.lineno})") from exc
        if not isinstance(payload, dict):
            raise ExamError(f"{file}: must contain a JSON object")
        task_id = payload.get("task")
        if not isinstance(task_id, str) or not task_id:
            raise ExamError(
                f"{file}: missing a non-empty \"task\" field naming the benchmark task"
            )
        if task_id in out:
            raise ExamError(
                f"two files claim task {task_id!r}: {out[task_id][0].name} and {file.name}"
            )
        out[task_id] = (file, payload)
    return out
