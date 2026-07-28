"""Shared skill-discovery exclusions for AERS generator/validator scripts.

Directory names listed in PRUNE_DIRNAMES are pruned from every SKILL.md
discovery walk (catalog, audit, provenance, validation).

Rationale per entry:

- ``.git`` / ``__pycache__`` — repo plumbing, never content.
- ``skills-codex`` / ``skills-codex-claude-review`` /
  ``skills-codex-gemini-review`` — the vendored ARIS collection
  (``skills/42-wanshuiyin-ARIS``) ships its skill set three extra times as
  runtime ports/review variants for the OpenAI Codex CLI. They are legitimate
  upstream content and stay on disk, but they are not meant to be triggered by
  Claude agents; cataloging them quadruplicated the collection (104 entries
  for ~40 skills) and was the single largest source of duplicate bare skill
  names. Decision recorded 2026-07-22 (dedup pass).
"""

from __future__ import annotations

PRUNE_DIRNAMES: frozenset[str] = frozenset(
    {
        ".git",
        "__pycache__",
        "skills-codex",
        "skills-codex-claude-review",
        "skills-codex-gemini-review",
    }
)


def prune(dirnames: list[str]) -> list[str]:
    """In-place-friendly filter for ``os.walk`` dirnames lists."""

    return [name for name in dirnames if name not in PRUNE_DIRNAMES]
