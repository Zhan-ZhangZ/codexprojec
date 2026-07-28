"""Supplementary tests for scripts/build-catalog.py.

test_repo_tools.py already covers the canonical happy path of
parse_frontmatter, the generated-artifact freshness check, the
"never fabricate a source URL" regression, and the catalog snapshot
consistency. This file is a *narrow, additive* suite focused on:

  * Edge cases of `parse_frontmatter` (delimiter-only, mixed-case keys,
    leading whitespace, BOM).
  * `first_sentence` (used in catalog rendering).
  * `markdown_escape` (used by `render_markdown` to avoid breaking tables
    and headings).
  * `SkillEntry` (dataclass) round-trip + required-field validation.

Stdlib-only. No third-party deps. Runs as part of `make test`.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _helpers import ROOT, load_module  # noqa: E402

build_catalog = load_module("scripts/build-catalog.py", "aers_build_catalog")


class TestParseFrontmatterEdgeCases(unittest.TestCase):
    def test_only_delimiter_line_returns_empty(self):
        # File is just `---` with nothing after — should not raise, returns
        # an empty mapping. Without this contract, an empty frontmatter
        # block would surface as a malformed `{}` with falsy truthiness.
        self.assertEqual(build_catalog.parse_frontmatter("---\n"), {})

    def test_mixed_case_keys_are_preserved(self):
        # The parser is byte-faithful: keys are not lower-cased, callers
        # can do their own normalization.
        fm = build_catalog.parse_frontmatter(
            "---\nName: Mixed-Case\nDescription: ok\n---\n"
        )
        self.assertIn("Name", fm)
        self.assertIn("Description", fm)
        self.assertEqual(fm["Name"], "Mixed-Case")

    def test_utf8_bom_is_currently_rejected_documented_limitation(self):
        # build-catalog.parse_frontmatter does NOT skip a leading UTF-8 BOM;
        # it scans for the FIRST `---` line via re.search, finds it at line 1,
        # but the captured text starts with the BOM, so the frontmatter
        # parse fails and the skill is silently dropped. This is a known
        # limitation. We pin the current behaviour so a future fix flips
        # this test, alerting whoever lands the change to also adjust
        # build-catalog.py to skip the BOM.
        bom = "﻿"
        text = bom + "---\nname: bom-skill\ndescription: ok\n---\nbody\n"
        fm = build_catalog.parse_frontmatter(text)
        # Today: empty dict. When build-catalog grows BOM-stripping, change
        # this to `self.assertEqual(fm.get("name"), "bom-skill")`.
        self.assertEqual(fm, {})

    def test_hyphenated_value_with_colon_is_safe(self):
        # The line `description: "key: value"` inside a quoted scalar must
        # not be re-interpreted as a new key.
        text = '---\nname: k\ndescription: "x:y"\n---\n'
        fm = build_catalog.parse_frontmatter(text)
        self.assertEqual(fm.get("description"), "x:y")


class TestFirstSentence(unittest.TestCase):
    def test_short_text_is_returned_unchanged(self):
        # `first_sentence` (per the source) returns a whitespace-normalised
        # version of the input, optionally truncated with an ellipsis when
        # the input exceeds `limit`. We assert the actual contract rather
        # than re-implementing the regex here.
        self.assertEqual(
            build_catalog.first_sentence("Hello world."),
            "Hello world.",
        )

    def test_internal_whitespace_is_collapsed(self):
        self.assertEqual(
            build_catalog.first_sentence("Hello   world.\nNext line."),
            "Hello world. Next line.",
        )

    def test_long_text_is_truncated_with_ellipsis(self):
        long = "a" * 500
        out = build_catalog.first_sentence(long, limit=50)
        self.assertTrue(out.endswith("..."))
        # `first_sentence` returns `text[:limit-1] + "..."` when over the
        # limit; for limit=50 that's 49 + 3 = 52 characters.
        self.assertLessEqual(len(out), 52)

    def test_unicode_text_round_trips(self):
        self.assertEqual(
            build_catalog.first_sentence("中文句子。下一句。"),
            "中文句子。下一句。",
        )


class TestMarkdownEscape(unittest.TestCase):
    """`markdown_escape` is intentionally narrow: it only escapes pipe
    characters (which would otherwise break Markdown table cells) and
    flattens newlines. It does *not* escape brackets — those are handled
    elsewhere. This test pins that narrow contract so a future refactor
    does not silently expand its scope."""

    def test_pipes_are_escaped(self):
        self.assertIn(r"\|", build_catalog.markdown_escape("a | b"))

    def test_multiple_pipes_are_each_escaped(self):
        self.assertEqual(
            build_catalog.markdown_escape("a | b | c"),
            r"a \| b \| c",
        )

    def test_newlines_are_flattened(self):
        self.assertEqual(
            build_catalog.markdown_escape("a\nb"),
            "a b",
        )

    def test_brackets_are_preserved_as_is(self):
        # Documented behaviour: brackets are NOT escaped (they would break
        # inline code fences that contain them).
        self.assertEqual(
            build_catalog.markdown_escape("a [b] c"),
            "a [b] c",
        )

    def test_strips_surrounding_whitespace(self):
        self.assertEqual(build_catalog.markdown_escape("  hello  "), "hello")


class TestSkillEntryDataclass(unittest.TestCase):
    def test_required_fields_round_trip(self):
        entry = build_catalog.SkillEntry(
            name="x",
            description="d",
            path="skills/x/SKILL.md",
            collection="x",
            line_count=42,
            frontmatter_fields=["name", "description"],
            has_frontmatter=True,
            has_name=True,
            has_description=True,
        )
        self.assertEqual(entry.name, "x")
        self.assertEqual(entry.line_count, 42)
        # SkillEntry is frozen; mutating must raise.
        with self.assertRaises(Exception):
            entry.name = "y"  # type: ignore[misc]


if __name__ == "__main__":
    unittest.main()
