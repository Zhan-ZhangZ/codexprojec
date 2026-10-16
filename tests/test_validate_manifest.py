"""Offline metadata/catalog validation against disposable Git repositories."""

import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from build_file_indexes import IndexBuildError, load_manifest
from validate_manifest import validate, validate_metadata


class ManifestValidationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="codex-manifest-test-")
        self.addCleanup(self.temporary.cleanup)
        self.repo = Path(self.temporary.name)
        self.library = self.repo / "codex-skills"
        (self.library / ".catalog").mkdir(parents=True)
        self.git("init", "--quiet")
        self.entry = {
            "name": "demo", "description": "Fixture 技能", "category": "category",
            "folder": "demo", "relative_path": "./category/demo",
            "aliases": ["示例", "Demo"], "tags": ["test", "测试"],
        }
        self.files = [self.record("SKILL.md", b"fixture instructions")]

    def git(self, *args, data=None):
        return subprocess.run(["git", "-C", str(self.repo), *args], input=data,
                              capture_output=True, check=True).stdout

    def record(self, path, data, mode="100644"):
        sha = self.git("hash-object", "-w", "--stdin", data=data).decode().strip()
        return {"path": path, "size": len(data), "sha": sha, "mode": mode}

    def publish(self, files=None, entry=None, body_update=None, index_update=None):
        selected = copy.deepcopy(entry or self.entry)
        records = copy.deepcopy(self.files if files is None else files)
        records.sort(key=lambda record: record["path"].encode("utf-8"))
        body = {"version": 1, "skill_path": selected["relative_path"], "files": records}
        if body_update:
            body.update(body_update)
        raw = (json.dumps(body, ensure_ascii=False, separators=(",", ":")) + "\n").encode()
        digest = hashlib.sha256(raw).hexdigest()
        target = self.library / ".catalog" / f"{digest}.json"
        target.write_bytes(raw)
        selected["file_index"] = {"path": f".catalog/{digest}.json", "sha256": digest,
                                  "file_count": len(records), "total_bytes": sum(record["size"] for record in records)}
        if index_update:
            selected["file_index"].update(index_update)
        (self.library / "skills_manifest.json").write_text(json.dumps([selected]), encoding="utf-8")
        return target

    def test_valid_metadata_and_catalog(self):
        self.publish()
        report = validate(self.repo)
        self.assertEqual(report["entries"], 1)
        self.assertEqual(report["catalogs"], 1)
        self.assertEqual(report["files"], 1)
        self.assertEqual(report["warnings"], [])

    def test_reserved_mcp_marker_is_rejected(self):
        for path in [".codex-skills.tree.json", ".codex-skills.tree.json/payload"]:
            with self.subTest(path=path):
                self.publish([*self.files, self.record(path, b"{}")])
                with self.assertRaisesRegex(IndexBuildError, "reserved MCP cache path"):
                    validate(self.repo)

    def test_optional_metadata_types_and_duplicates(self):
        for field, value in [("aliases", "bad"), ("tags", [42]), ("dependencies", [""]),
                             ("aliases", ["same", "same"]), ("language", None),
                             ("stars", True), ("stars", -1), ("updated_at", "not a date")]:
            with self.subTest(field=field, value=value):
                with self.assertRaises(IndexBuildError):
                    validate_metadata([{**self.entry, field: value}])
        validate_metadata([{**self.entry, "updated_at": "2026-10-16", "stars": 0, "language": "zh"}])

    def test_duplicate_names_and_paths(self):
        with self.assertRaisesRegex(IndexBuildError, "Duplicate skill name"):
            load_manifest(json.dumps([self.entry, {**self.entry, "name": "DEMO"}]).encode())
        with self.assertRaisesRegex(IndexBuildError, "Duplicate skill path"):
            validate_metadata([self.entry, {**self.entry, "name": "another"}])

    def test_root_router_exclusion(self):
        router = {"name": "00_codex_skills", "description": "Router", "folder": "category",
                  "category": "category", "relative_path": "./"}
        validate_metadata([router])
        with self.assertRaisesRegex(IndexBuildError, "whole-library"):
            validate_metadata([{**router, "file_index": {}}])
        with self.assertRaisesRegex(IndexBuildError, "Only 00_codex_skills"):
            validate_metadata([{**router, "name": "another-router"}])

    def test_required_path_prefix_and_containment(self):
        for path in ["category/demo", "./../outside", "./category/../demo", "/outside", "./C:/outside", "./bad\\name"]:
            with self.subTest(path=path), self.assertRaises(IndexBuildError):
                load_manifest(json.dumps([{**self.entry, "relative_path": path}]).encode())

    def test_catalog_digest_and_required_file_index(self):
        target = self.publish()
        target.write_bytes(target.read_bytes() + b" ")
        with self.assertRaisesRegex(IndexBuildError, "SHA-256 mismatch"):
            validate(self.repo)
        (self.library / "skills_manifest.json").write_text(json.dumps([self.entry]))
        with self.assertRaisesRegex(IndexBuildError, "file_index requires"):
            validate(self.repo)

    def test_catalog_pointer_and_counts(self):
        for update in [{"path": "../outside.json"}, {"file_count": True}, {"file_count": 10}, {"total_bytes": 999}]:
            with self.subTest(update=update):
                self.publish(index_update=update)
                with self.assertRaises(IndexBuildError):
                    validate(self.repo)

    def test_catalog_body_identity_and_modes(self):
        for update in [{"version": True}, {"version": 2}, {"skill_path": "./category/other"}]:
            with self.subTest(update=update):
                self.publish(body_update=update)
                with self.assertRaises(IndexBuildError):
                    validate(self.repo)
        for mode in ["160000", [], None]:
            with self.subTest(mode=mode):
                self.publish(files=[{**self.files[0], "mode": mode}])
                with self.assertRaises(IndexBuildError):
                    validate(self.repo)

    def test_catalog_rejects_missing_entry_duplicate_or_traversal_paths(self):
        for records in [[], [self.record("README.md", b"missing entry")],
                        [*self.files, self.files[0]],
                        [*self.files, self.record("../escape", b"bad")],
                        [*self.files, self.record("./extra", b"bad")],
                        [*self.files, self.record("directory", b"file"), self.record("directory/child", b"collision")]]:
            with self.subTest(records=records):
                self.publish(files=records)
                with self.assertRaises(IndexBuildError):
                    validate(self.repo)

    def test_symlinked_catalog_is_rejected(self):
        target = self.publish()
        real = self.repo / "catalog-copy.json"
        target.rename(real)
        target.symlink_to(real)
        with self.assertRaisesRegex(IndexBuildError, "must not be a symlink"):
            validate(self.repo)

    def test_internal_file_directory_and_chained_symlinks(self):
        files = [*self.files, self.record("docs/readme.md", b"documentation"),
                 self.record("reference", b"docs", "120000"),
                 self.record("nested/shortcut", b"../reference/readme.md", "120000")]
        self.publish(files=files)
        self.assertEqual(validate(self.repo)["warnings"], [])

    def test_symlink_escapes_and_cycles_fail_without_following_worktree(self):
        for target in [b"../outside", b"/etc/passwd", b"C:/outside", b"bad\\path", b"link", b"bad\0path"]:
            with self.subTest(target=target):
                self.publish(files=[*self.files, self.record("link", target, "120000")])
                with self.assertRaises(IndexBuildError):
                    validate(self.repo)
        self.publish(files=[*self.files, self.record("a", b"b", "120000"), self.record("b", b"a", "120000")])
        with self.assertRaisesRegex(IndexBuildError, "cycle"):
            validate(self.repo)

    def test_dangling_link_is_reported_not_silently_accepted(self):
        self.publish(files=[*self.files, self.record("link", b"upstream-missing.md", "120000")])
        report = validate(self.repo)
        self.assertEqual(len(report["warnings"]), 1)
        self.assertIn("dangling symlink link -> upstream-missing.md", report["warnings"][0])


if __name__ == "__main__":
    unittest.main()
