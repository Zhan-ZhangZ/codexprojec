"""Contract for auto-tool citation enrichment from agent-cards (Day-6).

Before this, only ~30 hand-listed tools in ``_CITATIONS_BY_TOOL`` carried
citations in their MCP output; the hundreds of other carded estimators
returned no reference even when their registry ``reference`` field named a
verified paper.  This wires ``build_citations`` to fall back to the
``[@bibkey]`` tokens in that field — composing with the Day 2-3 card work
— while preserving the CLAUDE.md §10 red line: only keys that actually
resolve in ``paper.bib`` are ever surfaced.
"""

from __future__ import annotations

import re
from pathlib import Path

from statspai.agent._enrichment import (
    _CITATIONS_BY_TOOL,
    build_citations,
    enrich_payload,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
PAPER_BIB = REPO_ROOT / "paper.bib"


def _bib_keys() -> set[str]:
    text = PAPER_BIB.read_text(encoding="utf-8")
    return set(re.findall(r"@\w+\{([^,]+),", text))


def test_static_citation_map_still_takes_precedence():
    # A tool with a hand-curated entry returns exactly that (possibly ranked).
    assert build_citations("callaway_santanna") == ["callaway2021difference"]
    # A static entry intentionally left empty stays empty (no fallback override
    # for tools explicitly mapped to no-citation).
    assert "did" in _CITATIONS_BY_TOOL
    assert build_citations("did") == []


def test_fallback_derives_verified_keys_from_reference():
    # olley_pakes is NOT in the static map but has a [@key] reference.
    assert "olley_pakes" not in _CITATIONS_BY_TOOL
    keys = build_citations("olley_pakes")
    assert keys == ["olley1996dynamics"]


def test_every_derived_key_resolves_in_paper_bib():
    """Red line: the fallback must never surface an unverified key."""
    bib = _bib_keys()
    from statspai.registry import _REGISTRY, _ensure_full_registry

    _ensure_full_registry()
    offenders = []
    for name in _REGISTRY:
        if name in _CITATIONS_BY_TOOL:
            continue
        for key in build_citations(name):
            if key not in bib:
                offenders.append(f"{name} -> {key}")
    assert not offenders, (
        "Auto-derived citations reference keys absent from paper.bib:\n  "
        + "\n  ".join(offenders)
    )


def test_enrich_payload_attaches_derived_citation_with_bibtex():
    payload = enrich_payload(
        {"method": "levinsohn_petrin", "estimate": 0.5},
        tool_name="levinsohn_petrin",
    )
    cit = payload.get("citations")
    assert cit and cit["keys"] == ["levinsohn2003estimating"]
    # The verified BibTeX body is shipped so the agent never invents one.
    assert cit.get("bibtex", {}).get("levinsohn2003estimating")


def test_free_text_reference_without_bibkey_yields_no_citation():
    # odds_ratio's reference is prose with no [@key] token -> nothing to cite.
    assert build_citations("odds_ratio") == []


def test_unknown_tool_yields_no_citation():
    assert build_citations("____not_a_tool____") == []
