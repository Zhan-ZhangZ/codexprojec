#!/usr/bin/env python3
"""Validate skill metadata and immutable file catalogs without rewriting them.

The manifest schema covers discovery metadata. Catalog hashes bind the exact
published bytes; the catalog builder separately checks those bytes against Git.
Symlink blobs are fetched from the local object database, never followed.
"""

from __future__ import annotations

import argparse
from datetime import datetime
import hashlib
import json
from pathlib import Path
import posixpath
import re
import sys
from typing import Any

from build_file_indexes import (
    IndexBuildError, LIBRARY, MANIFEST, MODES, SHA1, TREE_CACHE_FILE, git, load_manifest,
    relative_path,
)

SHA256 = re.compile(r"[0-9a-f]{64}\Z")
OPTIONAL_ARRAYS = ("aliases", "tags", "dependencies")


def fail(message: str) -> None:
    raise IndexBuildError(message)


def nonnegative_integer(value: Any, label: str) -> int:
    if type(value) is not int or value < 0:
        fail(f"{label} must be a nonnegative integer")
    return value


def validate_metadata(entries: list[dict[str, Any]]) -> None:
    """Validate optional fields as well as cross-entry identity and layout."""
    paths: set[str] = set()
    for entry in entries:
        name = entry["name"]
        path = relative_path(entry["relative_path"], allow_root=True)
        if path in paths:
            fail(f"Duplicate skill path: {entry['relative_path']}")
        paths.add(path)
        if not path:
            if name != "00_codex_skills":
                fail("Only 00_codex_skills may use the library root")
            if "file_index" in entry:
                fail("The root router must not publish a whole-library file_index")
        else:
            parts = path.split("/")
            if entry["folder"] != parts[-1]:
                fail(f"{name}: folder must match the final relative_path component")
            if entry["category"] not in parts[:-1]:
                fail(f"{name}: category must be a relative_path ancestor")
        for field in OPTIONAL_ARRAYS:
            if field not in entry:
                continue
            values = entry[field]
            if not isinstance(values, list) or any(not isinstance(value, str) or not value.strip() for value in values):
                fail(f"{name}: {field} must be an array of nonblank strings")
            if len(values) != len(set(values)):
                fail(f"{name}: {field} contains an exact duplicate")
        if "language" in entry and (not isinstance(entry["language"], str) or not entry["language"].strip()):
            fail(f"{name}: language must be a nonblank string")
        if "updated_at" in entry:
            value = entry["updated_at"]
            if not isinstance(value, str):
                fail(f"{name}: updated_at must be an ISO date or timestamp")
            try:
                datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                fail(f"{name}: updated_at must be an ISO date or timestamp")
        if "stars" in entry:
            nonnegative_integer(entry["stars"], f"{name}: stars")


def plain_file(library: Path, relative: str) -> Path:
    """Reject symlink output components, even when the final target is missing."""
    current = library
    if current.is_symlink():
        fail(f"Library root must not be a symlink: {library}")
    for component in relative.split("/"):
        current /= component
        if current.is_symlink():
            fail(f"Catalog output must not be a symlink: {current}")
    if not current.is_file():
        fail(f"Catalog is missing: {relative}")
    return current


def check_symlinks(repo: Path, entry: dict[str, Any], files: list[dict[str, Any]]) -> list[str]:
    """Reject escaping/cyclic links; report missing upstream targets separately."""
    names = {record["path"] for record in files}
    directories = {""}
    for name in names:
        parent = posixpath.dirname(name)
        while parent:
            directories.add(parent)
            parent = posixpath.dirname(parent)
    links: dict[str, str] = {}
    for record in files:
        if record["mode"] != "120000":
            continue
        raw = git(repo, "cat-file", "blob", record["sha"])
        blob_sha = hashlib.sha1(f"blob {len(raw)}\0".encode() + raw).hexdigest()
        if len(raw) != record["size"] or blob_sha != record["sha"]:
            fail(f"{entry['name']}: invalid symlink blob metadata: {record['path']}")
        target = raw.decode("utf-8")
        if (not target or target.startswith("/") or "\\" in target
                or re.match(r"^[a-zA-Z]:", target) or any(ord(char) < 32 for char in target)):
            fail(f"{entry['name']}: invalid symlink target: {record['path']}")
        links[record["path"]] = target

    def destination(path: str) -> str:
        remaining = path.split("/")
        resolved: list[str] = []
        followed: set[str] = set()
        while remaining:
            component = remaining.pop(0)
            if component in {"", "."}:
                continue
            if component == "..":
                if not resolved:
                    fail(f"{entry['name']}: symlink leaves the skill directory: {path}")
                resolved.pop()
                continue
            candidate = "/".join([*resolved, component])
            if candidate in links:
                if candidate in followed:
                    fail(f"{entry['name']}: symlink cycle: {path}")
                followed.add(candidate)
                remaining = links[candidate].split("/") + remaining
            else:
                resolved.append(component)
        return "/".join(resolved)

    warnings = []
    for path in sorted(links):
        target = destination(path)
        if target not in names and target not in directories:
            warnings.append(f"{entry['name']}: dangling symlink {path} -> {links[path]}")
    return warnings


def validate_catalog(repo: Path, entry: dict[str, Any]) -> tuple[int, int, list[str]]:
    name = entry["name"]
    index = entry.get("file_index")
    if not isinstance(index, dict) or set(index) != {"path", "sha256", "file_count", "total_bytes"}:
        fail(f"{name}: file_index requires path, sha256, file_count and total_bytes")
    digest = index["sha256"]
    if not isinstance(digest, str) or not SHA256.fullmatch(digest):
        fail(f"{name}: invalid file_index.sha256")
    if index["path"] != f".catalog/{digest}.json":
        fail(f"{name}: catalog path must match its SHA-256")
    count = nonnegative_integer(index["file_count"], f"{name}: file_count")
    total = nonnegative_integer(index["total_bytes"], f"{name}: total_bytes")
    raw = plain_file(repo / LIBRARY, index["path"]).read_bytes()
    if hashlib.sha256(raw).hexdigest() != digest:
        fail(f"{name}: catalog SHA-256 mismatch")
    data = json.loads(raw.decode("utf-8"))
    if (not isinstance(data, dict) or set(data) != {"version", "skill_path", "files"}
            or type(data.get("version")) is not int or data["version"] != 1
            or data["skill_path"] != entry["relative_path"]):
        fail(f"{name}: invalid catalog version or skill_path")
    files = data["files"]
    if not isinstance(files, list) or not files:
        fail(f"{name}: catalog files must be a nonempty array")
    paths = []
    measured_bytes = 0
    for record in files:
        if not isinstance(record, dict) or set(record) != {"path", "size", "sha", "mode"}:
            fail(f"{name}: malformed catalog file record")
        path = relative_path(record["path"])
        if path.split("/")[0] == TREE_CACHE_FILE:
            fail(f"{name}: reserved MCP cache path: {path}")
        if path != record["path"]:
            fail(f"{name}: catalog file paths must not start with ./")
        paths.append(path)
        measured_bytes += nonnegative_integer(record["size"], f"{name}: file size")
        if not isinstance(record["sha"], str) or not SHA1.fullmatch(record["sha"]):
            fail(f"{name}: invalid Git blob SHA")
        if not isinstance(record["mode"], str) or record["mode"] not in MODES:
            fail(f"{name}: unsupported Git mode")
    if len(paths) != len(set(paths)) or paths != sorted(paths, key=lambda value: value.encode("utf-8")):
        fail(f"{name}: catalog paths must be unique and sorted by UTF-8 bytes")
    path_set = set(paths)
    for path in paths:
        parent = posixpath.dirname(path)
        while parent:
            if parent in path_set:
                fail(f"{name}: file/directory path collision: {parent}")
            parent = posixpath.dirname(parent)
    if "SKILL.md" not in path_set:
        fail(f"{name}: catalog is missing SKILL.md")
    if len(files) != count or measured_bytes != total:
        fail(f"{name}: catalog count or byte total mismatch")
    return count, total, check_symlinks(repo, entry, files)


def validate(repo: Path) -> dict[str, Any]:
    entries = load_manifest((repo / MANIFEST).read_bytes())
    validate_metadata(entries)
    warnings: list[str] = []
    files = total = catalogs = 0
    for entry in entries:
        if entry["relative_path"] == "./":
            continue
        count, size, notices = validate_catalog(repo, entry)
        files += count
        total += size
        catalogs += 1
        warnings.extend(notices)
    return {"entries": len(entries), "catalogs": catalogs, "files": files,
            "total_bytes": total, "warnings": warnings}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args(argv)
    try:
        report = validate(args.repo.resolve())
        print(json.dumps(report, ensure_ascii=False, sort_keys=True))
        return 0
    except (IndexBuildError, OSError, UnicodeError, json.JSONDecodeError) as error:
        print(f"Manifest validation failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
