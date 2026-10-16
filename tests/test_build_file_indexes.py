"""Catalog generation from a disposable staged Git tree, without network access."""

import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from build_file_indexes import IndexBuildError, apply_plan, build_plan


class FileIndexBuildTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="codex-index-test-")
        self.addCleanup(self.temporary.cleanup)
        self.repo = Path(self.temporary.name)
        self.library = self.repo / "codex-skills"
        self.skill = self.library / "00_library" / "category" / "demo"
        self.skill.mkdir(parents=True)
        self.git("init", "--quiet")
        self.manifest = self.library / "skills_manifest.json"
        self.entry = {"name": "demo", "description": "Fixture 技能", "category": "category",
                      "folder": "demo", "relative_path": "./00_library/category/demo"}
        self.router = {"name": "00_codex_skills", "description": "Router", "category": "00_library",
                       "folder": "00_library", "relative_path": "./"}
        self.manifest.write_text(json.dumps([self.router, self.entry]), encoding="utf-8")
        (self.library / "SKILL.md").write_text("router instructions", encoding="utf-8")
        (self.skill / "SKILL.md").write_text("fixture instructions", encoding="utf-8")
        self.git("add", "codex-skills")

    def git(self, *args):
        return subprocess.run(["git", "-C", str(self.repo), *args],
                              capture_output=True, check=True).stdout

    def test_check_is_read_only_and_write_is_deterministic(self):
        original = self.manifest.read_bytes()
        plan = build_plan(self.repo)
        self.assertEqual(plan.root_routers, 1)
        self.assertEqual(len(plan.catalogs), 1)
        self.assertEqual(apply_plan(self.repo, plan, write=False), (1, True))
        self.assertEqual(self.manifest.read_bytes(), original)
        self.assertFalse((self.library / ".catalog").exists())
        self.assertEqual(apply_plan(self.repo, plan, write=True), (1, True))
        rebuilt = build_plan(self.repo)
        self.assertEqual(rebuilt.manifest, plan.manifest)
        self.assertEqual(rebuilt.catalogs[0].data, plan.catalogs[0].data)
        self.assertEqual(apply_plan(self.repo, rebuilt, write=False), (0, False))
        generated = json.loads(self.manifest.read_bytes())
        self.assertNotIn("file_index", generated[0])
        self.assertEqual(generated[1]["file_index"]["sha256"], hashlib.sha256(plan.catalogs[0].data).hexdigest())

    def test_uses_staged_files_and_ignores_untracked_files(self):
        (self.skill / "untracked.txt").write_text("must not ship", encoding="utf-8")
        plan = build_plan(self.repo)
        files = json.loads(plan.catalogs[0].data)["files"]
        self.assertEqual([file["path"] for file in files], ["SKILL.md"])
        self.assertEqual(files[0]["sha"], self.git("rev-parse", ":codex-skills/00_library/category/demo/SKILL.md").decode().strip())

    def test_unstaged_skill_edits_and_manifest_edits_are_rejected(self):
        (self.skill / "SKILL.md").write_text("not staged", encoding="utf-8")
        with self.assertRaisesRegex(IndexBuildError, "Stage tracked skill changes"):
            build_plan(self.repo)
        self.git("add", "codex-skills")
        self.manifest.write_text(json.dumps([self.router, {**self.entry, "description": "not staged"}]), encoding="utf-8")
        with self.assertRaisesRegex(IndexBuildError, "Stage manifest content changes"):
            build_plan(self.repo)

    def test_staged_executable_and_symlink_modes_and_utf8_sorting(self):
        executable = self.skill / "run.sh"
        executable.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
        os.chmod(executable, 0o755)
        (self.skill / "链接").symlink_to("SKILL.md")
        (self.skill / "é.txt").write_text("unicode", encoding="utf-8")
        self.git("add", "codex-skills")
        self.git("update-index", "--chmod=+x", "codex-skills/00_library/category/demo/run.sh")
        plan = build_plan(self.repo)
        records = json.loads(plan.catalogs[0].data)["files"]
        by_path = {record["path"]: record for record in records}
        self.assertEqual(by_path["run.sh"]["mode"], "100755")
        self.assertEqual(by_path["链接"]["mode"], "120000")
        self.assertEqual(by_path["链接"]["size"], len(b"SKILL.md"))
        self.assertEqual([record["path"] for record in records], sorted(by_path, key=lambda path: path.encode("utf-8")))
        self.assertEqual(plan.catalogs[0].symlink_count, 1)

    def test_missing_skill_entry_and_orphaned_skill_are_rejected(self):
        (self.skill / "SKILL.md").unlink()
        (self.skill / "README.md").write_text("not an entry", encoding="utf-8")
        self.git("add", "-A", "codex-skills")
        with self.assertRaisesRegex(IndexBuildError, "no staged SKILL.md"):
            build_plan(self.repo)
        (self.skill / "SKILL.md").write_text("entry", encoding="utf-8")
        orphan = self.skill.parent / "orphan"
        orphan.mkdir()
        (orphan / "SKILL.md").write_text("unregistered", encoding="utf-8")
        self.git("add", "codex-skills")
        with self.assertRaisesRegex(IndexBuildError, "absent from the manifest"):
            build_plan(self.repo)

    def test_old_catalogs_are_retained_after_a_staged_update(self):
        old = build_plan(self.repo)
        apply_plan(self.repo, old, write=True)
        old_path = self.library / old.catalogs[0].path
        self.git("add", "codex-skills")
        (self.skill / "SKILL.md").write_text("updated staged content", encoding="utf-8")
        self.git("add", "codex-skills")
        new = build_plan(self.repo)
        self.assertNotEqual(new.catalogs[0].path, old.catalogs[0].path)
        apply_plan(self.repo, new, write=True)
        self.assertEqual(old_path.read_bytes(), old.catalogs[0].data)
        self.assertEqual((self.library / new.catalogs[0].path).read_bytes(), new.catalogs[0].data)

    def test_catalog_output_symlink_is_rejected(self):
        plan = build_plan(self.repo)
        outside = self.repo / "outside"
        outside.mkdir()
        (self.library / ".catalog").symlink_to(outside, target_is_directory=True)
        with self.assertRaisesRegex(IndexBuildError, "must not be a symlink"):
            apply_plan(self.repo, plan, write=True)
        self.assertEqual(list(outside.iterdir()), [])

    def test_reserved_cache_marker_is_rejected_before_generation(self):
        marker = self.skill / ".codex-skills.tree.json"
        marker.write_text("{}", encoding="utf-8")
        self.git("add", "codex-skills")
        with self.assertRaisesRegex(IndexBuildError, "reserved MCP cache path"):
            build_plan(self.repo)
        marker.unlink()
        marker.mkdir()
        (marker / "payload").write_text("conflicting directory", encoding="utf-8")
        self.git("add", "-A", "codex-skills")
        with self.assertRaisesRegex(IndexBuildError, "reserved MCP cache path"):
            build_plan(self.repo)

    def test_cli_exit_codes_and_json_summary(self):
        script = Path(__file__).resolve().parents[1] / "scripts" / "build_file_indexes.py"
        def invoke(mode):
            return subprocess.run([sys.executable, str(script), mode, "--repo", str(self.repo)],
                                  capture_output=True, text=True, check=False)
        missing = invoke("--check")
        self.assertEqual(missing.returncode, 1, missing.stderr)
        self.assertEqual(json.loads(missing.stdout)["catalogs_changed"], 1)
        written = invoke("--write")
        self.assertEqual(written.returncode, 0, written.stderr)
        clean = invoke("--check")
        self.assertEqual(clean.returncode, 0, clean.stderr)
        self.assertFalse(json.loads(clean.stdout)["manifest_changed"])


if __name__ == "__main__":
    unittest.main()
