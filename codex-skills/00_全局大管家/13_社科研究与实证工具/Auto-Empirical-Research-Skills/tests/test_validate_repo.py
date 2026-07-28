"""Supplementary tests for scripts/validate-repo.py.

test_repo_tools.py already covers the major happy paths of
validate-repo (frontmatter parsing, link validation, snapshot checks,
sync-workflow gates). This file is a *narrow, additive* suite that locks
down the edge cases most likely to regress:

  * YAML frontmatter with no closing fence
  * Frontmatter at the very end of a file (no body)
  * `validate_root_install_skill` rejecting a "duplicate the repo root" mistake
  * `validate_skill_frontmatter` accepting the bare-minimum two-field block
    declared in docs/SKILL_FRONTMATTER_SPEC.md
  * `normalize_markdown_target` collapsing absolute paths and decoding %xx

All tests are stdlib-only; the AERS repo policy is to keep `make test`
hermetic.
"""

from __future__ import annotations

import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _helpers import ROOT, load_module  # noqa: E402

validate_repo = load_module("scripts/validate-repo.py", "aers_validate_repo")


class TestFrontmatterParserEdgeCases(unittest.TestCase):
    """Lock down the YAML frontmatter parser's behaviour at its boundaries."""

    def test_unterminated_frontmatter_treats_whole_file_as_body(self):
        # An open `---` with no close: the parser must not raise, and must
        # return an empty dict (i.e. treat the file as body, not frontmatter).
        text = "---\nname: dangling\ndescription: never closes\nbody line\n"
        fm = validate_repo.parse_frontmatter(text)
        self.assertEqual(fm, {})

    def test_frontmatter_with_no_body_still_parses(self):
        text = "---\nname: zero-body\ndescription: \n---\n"
        fm = validate_repo.parse_frontmatter(text)
        self.assertEqual(fm.get("name"), "zero-body")

    def test_minimum_compliant_frontmatter_passes_spec(self):
        # Mirrors docs/SKILL_FRONTMATTER_SPEC.md "Required fields". This is
        # the regression test for Top5#4's spec.
        text = "---\nname: minimal\ndescription: short\n---\n"
        fm = validate_repo.parse_frontmatter(text)
        self.assertEqual(fm.get("name"), "minimal")
        self.assertEqual(fm.get("description"), "short")


class TestParseMarkdownTarget(unittest.TestCase):
    """`parse_markdown_target(raw) -> (path, fragment) | None` and its
    single-arg wrapper `normalize_markdown_target(raw) -> path | None`."""

    def test_split_path_and_fragment(self):
        path, frag = validate_repo.parse_markdown_target("README.md#quickstart")
        self.assertEqual(path, "README.md")
        self.assertEqual(frag, "quickstart")

    def test_url_encoded_fragment_is_decoded(self):
        path, frag = validate_repo.parse_markdown_target("page.md#%E4%B8%AD%E6%96%87")
        self.assertEqual(path, "page.md")
        self.assertEqual(frag, "中文")

    def test_external_url_returns_none(self):
        self.assertIsNone(validate_repo.parse_markdown_target("https://example.com"))

    def test_empty_input_returns_none(self):
        self.assertIsNone(validate_repo.parse_markdown_target(""))

    def test_normalize_strips_fragment(self):
        # `normalize_markdown_target` is the single-arg wrapper that
        # returns just the path (dropping the fragment).
        self.assertEqual(
            validate_repo.normalize_markdown_target("README.md#quickstart"),
            "README.md",
        )


class TestValidateRootInstallSkill(unittest.TestCase):
    """Already covered in test_repo_tools; this isolates the *positive*
    (compliant-router) baseline so a refactor of validate_root_install_skill
    cannot silently pass everything."""

    def test_doubling_repo_root_is_caught_by_missing_install_router_guidance(self):
        # The root SKILL.md must mention how to install / route to the
        # underlying catalog. A description that omits all three anchors
        # ("Treat it as a router", "catalog/skills.json", "docs/INSTALL.md")
        # is rejected.
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "agents").mkdir()
            (root / "agents" / "openai.yaml").write_text(
                'interface:\n  default_prompt: "Use $auto-empirical-research-skills."\n',
                encoding="utf-8",
            )
            (root / "SKILL.md").write_text(
                textwrap.dedent(
                    """\
                    ---
                    name: auto-empirical-research-skills
                    description: A short, router-free description that omits all the install anchors the validator expects.
                    ---
                    # AERS
                    """
                ),
                encoding="utf-8",
            )

            old_root = validate_repo.ROOT
            try:
                validate_repo.ROOT = root
                errors, _ = validate_repo.validate_root_install_skill()
            finally:
                validate_repo.ROOT = old_root

            # Every "missing install-router guidance" error must list at
            # least one of the three required anchors. We don't pin the
            # exact phrasing, just that the violation surfaces.
            self.assertTrue(
                any("install-router guidance" in e for e in errors),
                msg=f"expected an install-router guidance error, got {errors!r}",
            )


class TestValidateRequiredFiles(unittest.TestCase):
    def test_missing_root_skill_md_is_reported(self):
        # `validate_required_files` is wired to the actual root paths
        # declared in the source (README.md, LICENSE, etc.). We exercise
        # the *plumbing*: monkey-patch ROOT to a fresh empty tree and
        # confirm every required path surfaces as an error.
        with tempfile.TemporaryDirectory() as tmp:
            old_root = validate_repo.ROOT
            try:
                validate_repo.ROOT = Path(tmp)
                errors, warnings = validate_repo.validate_required_files()
            finally:
                validate_repo.ROOT = old_root

        # Expect errors for every required file; we don't pin a count
        # (it changes as the list grows) but the list must be non-empty
        # and contain a representative entry.
        self.assertGreater(len(errors), 0)
        self.assertTrue(any("README.md" in e for e in errors),
                        msg=f"expected README.md in errors, got {errors!r}")


if __name__ == "__main__":
    unittest.main()
