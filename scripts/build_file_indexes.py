#!/usr/bin/env python3
"""Build immutable per-skill file indexes from the Git staging area.

Stage skill changes and manifest edits before running --write. Only generated
file_index metadata may differ between the working manifest and staged manifest.
This command never reads skill contents, follows skill symlinks, or scans caches.
Old catalog hashes are retained for clients that still use an older manifest.
"""

from __future__ import annotations

import argparse
import bisect
import copy
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from typing import Any

LIBRARY = "codex-skills"
MANIFEST = f"{LIBRARY}/skills_manifest.json"
MODES = {"100644", "100755", "120000"}
TREE_CACHE_FILE = ".codex-skills.tree.json"
SHA1 = re.compile(r"[0-9a-f]{40}\Z")


class IndexBuildError(Exception):
    """An input or repository state cannot produce a trustworthy catalog."""


@dataclass(frozen=True)
class GitFile:
    path: str
    sha: str
    mode: str


@dataclass(frozen=True)
class Catalog:
    path: str
    data: bytes
    file_count: int
    total_bytes: int
    symlink_count: int


@dataclass
class BuildPlan:
    manifest: bytes
    catalogs: list[Catalog]
    root_routers: int


def git(repo: Path, *args: str, input_bytes: bytes | None = None) -> bytes:
    result = subprocess.run(
        ["git", "-C", str(repo), *args], input=input_bytes,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
    )
    if result.returncode:
        raise IndexBuildError(f"git {args[0]} failed: {result.stderr.decode('utf-8', 'replace').strip()}")
    return result.stdout


def relative_path(value: Any, *, allow_root: bool = False) -> str:
    if not isinstance(value, str):
        raise IndexBuildError("Paths must be UTF-8 strings")
    if allow_root and value == "./":
        return ""
    path = value[2:] if value.startswith("./") else value
    if (not path or "\\" in path or any(ord(char) < 32 for char in path)
            or PurePosixPath(path).is_absolute() or re.match(r"^[a-zA-Z]:", path)
            or any(part in {"", ".", ".."} for part in path.split("/"))):
        raise IndexBuildError(f"Invalid relative path: {value!r}")
    return path


def load_manifest(raw: bytes) -> list[dict[str, Any]]:
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise IndexBuildError(f"Invalid manifest JSON: {error}") from error
    if not isinstance(value, list) or not value:
        raise IndexBuildError("Manifest must be a nonempty array")
    names: set[str] = set()
    for entry in value:
        if not isinstance(entry, dict) or not isinstance(entry.get("name"), str) or not entry["name"].strip():
            raise IndexBuildError("Each manifest entry needs a nonempty name")
        for field in ("description", "category", "folder"):
            if not isinstance(entry.get(field), str) or not entry[field].strip():
                raise IndexBuildError(f"Manifest entry {entry.get('name', '<unknown>')} needs a nonempty {field}")
        if entry["name"].casefold() in names:
            raise IndexBuildError(f"Duplicate skill name: {entry['name']}")
        names.add(entry["name"].casefold())
        path = entry.get("relative_path")
        relative_path(path, allow_root=True)
        if not path.startswith("./"):
            raise IndexBuildError(f"Manifest relative_path must start with ./ : {path!r}")
        if path.startswith("./.catalog/") or path == "./.catalog":
            raise IndexBuildError("The generated .catalog directory cannot be a skill")
    return value


def without_indexes(manifest: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{key: value for key, value in entry.items() if key != "file_index"} for entry in manifest]


def tracked_files(repo: Path) -> list[GitFile]:
    files: list[GitFile] = []
    raw = git(repo, "ls-files", "--stage", "-z", "--", f"{LIBRARY}/")
    for record in raw.split(b"\0"):
        if not record:
            continue
        try:
            metadata, path_bytes = record.split(b"\t", 1)
            mode, sha, stage = metadata.decode("ascii").split()
            path = path_bytes.decode("utf-8")
        except (ValueError, UnicodeDecodeError) as error:
            raise IndexBuildError("Git index has a malformed or non-UTF-8 path") from error
        if stage != "0":
            raise IndexBuildError(f"Resolve the staged merge conflict first: {path}")
        if path == MANIFEST or path.startswith(f"{LIBRARY}/.catalog/"):
            continue
        relative_path(path)
        if mode not in MODES:
            raise IndexBuildError(f"Unsupported Git mode {mode} at {path}; nested gitlinks need explicit integration")
        if not SHA1.fullmatch(sha):
            raise IndexBuildError(f"Expected a Git SHA-1 blob at {path}")
        files.append(GitFile(path, sha, mode))
    return sorted(files, key=lambda item: item.path)


def blob_sizes(repo: Path, files: list[GitFile]) -> dict[str, int]:
    hashes = sorted({file.sha for file in files})
    if not hashes:
        return {}
    raw = git(repo, "cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)",
              input_bytes=("\n".join(hashes) + "\n").encode("ascii"))
    sizes: dict[str, int] = {}
    for line in raw.decode("ascii").splitlines():
        parts = line.split()
        if len(parts) != 3 or parts[1] != "blob" or not parts[2].isdigit():
            raise IndexBuildError(f"Invalid Git blob metadata: {line}")
        sizes[parts[0]] = int(parts[2])
    if set(sizes) != set(hashes):
        raise IndexBuildError("Git did not return every requested blob size")
    return sizes


def check_unstaged(repo: Path, manifest: list[dict[str, Any]]) -> None:
    staged = load_manifest(git(repo, "show", f":{MANIFEST}"))
    if without_indexes(staged) != without_indexes(manifest):
        raise IndexBuildError("Stage manifest content changes first; only generated file_index edits may be unstaged")
    prefixes = tuple(f"{LIBRARY}/{relative_path(entry['relative_path'])}/"
                     for entry in manifest if entry["relative_path"] != "./")
    dirty = git(repo, "diff-files", "--name-only", "-z", "--", f"{LIBRARY}/")
    changed = [path.decode("utf-8") for path in dirty.split(b"\0") if path]
    relevant = [path for path in changed if path.startswith(prefixes)]
    if relevant:
        preview = ", ".join(relevant[:5])
        raise IndexBuildError(f"Stage tracked skill changes first ({len(relevant)} unstaged): {preview}")


def build_plan(repo: Path) -> BuildPlan:
    manifest = load_manifest((repo / MANIFEST).read_bytes())
    check_unstaged(repo, manifest)
    files = tracked_files(repo)
    paths = [file.path for file in files]
    selected: list[tuple[dict[str, Any], str, list[GitFile]]] = []
    all_selected: list[GitFile] = []
    root_routers = 0
    for entry in manifest:
        path = relative_path(entry["relative_path"], allow_root=True)
        if not path:
            root_routers += 1
            continue
        prefix = f"{LIBRARY}/{path}/"
        start = bisect.bisect_left(paths, prefix)
        end = start
        while end < len(files) and files[end].path.startswith(prefix):
            end += 1
        skill_files = files[start:end]
        if any(file.path == prefix + TREE_CACHE_FILE or file.path.startswith(prefix + TREE_CACHE_FILE + "/")
               for file in skill_files):
            raise IndexBuildError(f"Skill contains reserved MCP cache path {TREE_CACHE_FILE}: {entry['relative_path']}")
        if not skill_files:
            raise IndexBuildError(f"Skill has no staged files: {entry['relative_path']}")
        if not any(file.path == prefix + "SKILL.md" for file in skill_files):
            raise IndexBuildError(f"Skill has no staged SKILL.md: {entry['relative_path']}")
        selected.append((entry, prefix, skill_files))
        all_selected.extend(skill_files)
    selected_paths = {file.path for file in all_selected}
    orphaned = [file.path for file in files
                if file.path[len(LIBRARY) + 1:].count("/") >= 3 and file.path not in selected_paths]
    if orphaned:
        preview = ", ".join(orphaned[:5])
        raise IndexBuildError(f"Tracked skill files are absent from the manifest ({len(orphaned)}): {preview}")
    sizes = blob_sizes(repo, all_selected)
    updated = copy.deepcopy(manifest)
    by_name = {entry["name"]: entry for entry in updated}
    for entry in updated:
        if entry["relative_path"] == "./":
            entry.pop("file_index", None)
    catalogs: list[Catalog] = []
    for entry, prefix, skill_files in selected:
        records = [{"path": file.path[len(prefix):], "size": sizes[file.sha],
                    "sha": file.sha, "mode": file.mode} for file in skill_files]
        records.sort(key=lambda record: record["path"].encode("utf-8"))
        body = {"version": 1, "skill_path": entry["relative_path"], "files": records}
        data = (json.dumps(body, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
        digest = hashlib.sha256(data).hexdigest()
        path = f".catalog/{digest}.json"
        total = sum(record["size"] for record in records)
        by_name[entry["name"]]["file_index"] = {
            "path": path, "sha256": digest, "file_count": len(records), "total_bytes": total,
        }
        catalogs.append(Catalog(path, data, len(records), total, sum(file.mode == "120000" for file in skill_files)))
    encoded = (json.dumps(updated, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    return BuildPlan(encoded, catalogs, root_routers)


def assert_plain_path(path: Path) -> None:
    if path.is_symlink():
        raise IndexBuildError(f"Generated output must not be a symlink: {path}")


def atomic_write(path: Path, data: bytes) -> None:
    assert_plain_path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    temporary = Path(name)
    try:
        with os.fdopen(descriptor, "wb") as output:
            output.write(data)
            output.flush()
            os.fsync(output.fileno())
        os.chmod(temporary, 0o644)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def apply_plan(repo: Path, plan: BuildPlan, *, write: bool) -> tuple[int, bool]:
    library = repo / LIBRARY
    assert_plain_path(library)
    assert_plain_path(library / ".catalog")
    assert_plain_path(repo / MANIFEST)
    pending: list[tuple[Path, bytes]] = []
    for catalog in plan.catalogs:
        target = library / catalog.path
        assert_plain_path(target)
        if not target.is_file() or target.read_bytes() != catalog.data:
            pending.append((target, catalog.data))
    manifest_changed = (repo / MANIFEST).read_bytes() != plan.manifest
    if write:
        # Publish immutable bodies before manifest references, so interruption
        # cannot leave the manifest pointing to a partially written catalog.
        for target, data in pending:
            atomic_write(target, data)
        if manifest_changed:
            atomic_write(repo / MANIFEST, plan.manifest)
    return len(pending), manifest_changed


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="Compare generated bytes without writing")
    mode.add_argument("--write", action="store_true", help="Atomically write changed catalogs and manifest metadata")
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1], help="Git repository root")
    args = parser.parse_args(argv)
    try:
        repo = args.repo.resolve()
        root = Path(git(repo, "rev-parse", "--show-toplevel").decode("utf-8").strip()).resolve()
        if root != repo:
            raise IndexBuildError("--repo must identify the Git repository root")
        plan = build_plan(repo)
        changed, manifest_changed = apply_plan(repo, plan, write=args.write)
        report = {
            "mode": "write" if args.write else "check",
            "skills": len(plan.catalogs), "root_routers_skipped": plan.root_routers,
            "files": sum(catalog.file_count for catalog in plan.catalogs),
            "total_bytes": sum(catalog.total_bytes for catalog in plan.catalogs),
            "catalog_bytes": sum(len(catalog.data) for catalog in plan.catalogs),
            "symlink_blobs": sum(catalog.symlink_count for catalog in plan.catalogs),
            "catalogs_changed": changed, "manifest_changed": manifest_changed,
        }
        print(json.dumps(report, ensure_ascii=False, sort_keys=True))
        return 1 if args.check and (changed or manifest_changed) else 0
    except (IndexBuildError, OSError, UnicodeError) as error:
        print(f"File index build failed: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
