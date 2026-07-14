"""The Stata/R migration on-ramps are reachable from Python and self-describing.

These translators were previously MCP-only; this suite locks in that
``sp.from_stata`` / ``sp.from_r`` / ``sp.translation_coverage`` are part of the
Python surface, and that the coverage matrix is introspected from the live
dispatch tables (so it cannot drift from what the translators actually do).
"""
from __future__ import annotations

import statspai as sp


def test_translators_exposed_in_python_namespace():
    for name in ("from_stata", "from_r", "translation_coverage"):
        assert callable(getattr(sp, name, None)), f"sp.{name} not exposed"
        assert name in sp.list_functions(), f"sp.{name} not registered"


def test_from_stata_round_trip():
    out = sp.from_stata("reghdfe y x, absorb(id year) vce(cluster id)")
    assert out["ok"]
    assert out["tool"] == "fixest"
    assert out["python_code"].startswith("sp.fixest")
    # unrecognized command fails softly, with suggestions, not an exception
    bad = sp.from_stata("definitelynotacommand y x")
    assert bad["ok"] is False


def test_from_r_round_trip():
    out = sp.from_r("feols(y ~ x | id, data = df)")
    assert out["ok"]
    assert out["python_code"].startswith("sp.fixest")


def test_coverage_matrix_is_introspected_from_live_tables():
    cov = sp.translation_coverage()
    assert cov["summary"]["n_stata_commands"] >= 30
    assert cov["summary"]["n_r_functions"] >= 9
    # reghdfe really maps to sp.fixest (parsed from the handler source)
    reghdfe = next(r for r in cov["stata"] if r["command"] == "reghdfe")
    assert "sp.fixest" in reghdfe["targets"]
    # limitations are part of the contract
    assert any("panel" in lim.lower() for lim in cov["limitations"])


def test_coverage_markdown_renders():
    md = sp.translation_coverage(fmt="markdown")
    assert isinstance(md, str)
    assert "Stata" in md and "reghdfe" in md
