"""Tests for the README rigor-stats consistency checker."""

from __future__ import annotations

import unittest

from _helpers import ROOT, load_module

check_readme_stats = load_module("scripts/check-readme-stats.py", "aers_check_readme_stats")


class TestExpectedCounts(unittest.TestCase):
    def test_counts_match_committed_toml_files(self):
        n_tasks, n_scenarios, n_rubric = check_readme_stats.expected_counts()
        self.assertEqual(n_tasks, len(list((ROOT / "benchmark" / "tasks").glob("*.toml"))))
        self.assertEqual(n_scenarios, len(list((ROOT / "eval-harness" / "scenarios").glob("*.toml"))))
        self.assertGreater(n_rubric, n_scenarios)  # every scenario has >= 1 rubric item


class TestCheckReadme(unittest.TestCase):
    def setUp(self):
        self.counts = check_readme_stats.expected_counts()

    def test_committed_readmes_are_consistent(self):
        for name in check_readme_stats.READMES:
            with self.subTest(readme=name):
                problems = check_readme_stats.check_readme(ROOT / name, *self.counts)
                self.assertEqual(problems, [])

    def test_stale_bolded_count_is_caught(self):
        import tempfile
        from pathlib import Path

        n_tasks, n_scenarios, n_rubric = self.counts
        stale = (
            f"| Numeric benchmark tasks | **{n_tasks + 1}** | [`benchmark/`](benchmark/) |\n"
            f"| Eval scenarios | **{n_scenarios} / {n_rubric}** | [`eval-harness/`](eval-harness/) |\n"
        )
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "README-test.md"
            path.write_text(stale, encoding="utf-8")
            problems = check_readme_stats.check_readme(path, *self.counts)
        self.assertEqual(len(problems), 1)
        self.assertIn("benchmark row says", problems[0])

    def test_stale_suffix_style_count_is_caught(self):
        import tempfile
        from pathlib import Path

        n_tasks, n_scenarios, n_rubric = self.counts
        stale = (
            f"| **数值基准** | 陷阱 | [`benchmark/`](benchmark/) · {n_tasks} 任务 |\n"
            f"| **评测套件** | 失误 | [`eval-harness/`](eval-harness/) · {n_scenarios - 1} 场景 / {n_rubric} rubric |\n"
        )
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "README-test.md"
            path.write_text(stale, encoding="utf-8")
            problems = check_readme_stats.check_readme(path, *self.counts)
        self.assertEqual(len(problems), 1)
        self.assertIn("eval-harness row says", problems[0])

    def test_missing_rows_are_caught(self):
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "README-test.md"
            path.write_text("# empty\n", encoding="utf-8")
            problems = check_readme_stats.check_readme(path, *self.counts)
        self.assertEqual(len(problems), 2)


if __name__ == "__main__":
    unittest.main()

class TestCollectionCoverage(unittest.TestCase):
    def setUp(self):
        self.catalog_ids, self.total = check_readme_stats.catalog_facts()

    def test_catalog_facts_shape(self):
        self.assertGreaterEqual(len(self.catalog_ids), 70)
        self.assertGreater(self.total, 500)

    def test_committed_collection_tables_are_complete(self):
        for name in check_readme_stats.COLLECTION_TABLE_DOCS:
            with self.subTest(doc=name):
                problems = check_readme_stats.check_collections(
                    ROOT / name, self.catalog_ids, self.total
                )
                self.assertEqual(problems, [])

    def test_missing_collection_is_caught(self):
        import tempfile
        from pathlib import Path

        some_id = sorted(self.catalog_ids)[0]
        rows = "\n".join(
            f"| [{cid}](skills/{cid}/) |" for cid in sorted(self.catalog_ids) if cid != some_id
        )
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "README-test.md"
            path.write_text(rows, encoding="utf-8")
            problems = check_readme_stats.check_collections(path, self.catalog_ids, self.total)
        self.assertTrue(any("missing 1 cataloged collection" in p for p in problems))

    def test_unknown_collection_link_is_caught(self):
        import tempfile
        from pathlib import Path

        rows = "\n".join(
            f"| [{cid}](skills/{cid}/) |" for cid in sorted(self.catalog_ids)
        ) + "\n| [gone](skills/99-deleted-collection/) |"
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "README-test.md"
            path.write_text(rows, encoding="utf-8")
            problems = check_readme_stats.check_collections(path, self.catalog_ids, self.total)
        self.assertTrue(any("not in catalog" in p for p in problems))

    def test_stale_catalog_cited_total_is_caught(self):
        import tempfile
        from pathlib import Path

        rows = "\n".join(
            f"| [{cid}](skills/{cid}/) |" for cid in sorted(self.catalog_ids)
        ) + "\n| skills | **1,151** | [`catalog/skills.json`](catalog/skills.json) |"
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "README-test.md"
            path.write_text(rows, encoding="utf-8")
            problems = check_readme_stats.check_collections(path, self.catalog_ids, self.total)
        self.assertTrue(any("stale" in p or "catalog total" in p for p in problems))

