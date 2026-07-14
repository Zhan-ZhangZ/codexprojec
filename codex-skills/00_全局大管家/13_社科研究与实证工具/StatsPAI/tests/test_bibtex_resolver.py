"""Tests for ``sp.bibtex(keys=...)`` — the Python twin of the bibtex MCP
tool and the resolver that ``sp.bib_for`` / ``result.cite(format='json')``
advertise via their ``resolve_with`` hint.

Pins: verbatim resolution from paper.bib (zero-hallucination), loud failure
on unknown keys, and the end-to-end ``bib_for -> bibtex`` agent loop.
"""

from __future__ import annotations

import pytest

import statspai as sp


def test_resolves_verified_entry_verbatim():
    entry = sp.bibtex("chernozhukov2016hdm")
    assert entry.lstrip().startswith("@article{chernozhukov2016hdm")
    assert "10.32614/RJ-2016-040" in entry
    assert "Spindler, Martin" in entry


def test_entry_is_verbatim_from_paper_bib():
    # Zero-hallucination: returned text is exactly what paper.bib holds.
    from statspai.agent.workflow_tools import _load_bibtex_index

    index = _load_bibtex_index()
    assert sp.bibtex("belloni2014inference") == index["belloni2014inference"]


def test_accepts_str_and_list_equivalently():
    assert sp.bibtex("chernozhukov2016hdm") == sp.bibtex(["chernozhukov2016hdm"])


def test_multiple_keys_returned_in_requested_order():
    out = sp.bibtex(["chernozhukov2018double", "chernozhukov2016hdm"])
    assert out.index("chernozhukov2018double") < out.index("chernozhukov2016hdm")
    assert out.count("@") >= 2


def test_empty_keys_raises_valueerror():
    with pytest.raises(ValueError):
        sp.bibtex([])


def test_unknown_key_raises_keyerror_loudly():
    with pytest.raises(KeyError) as exc:
        sp.bibtex("chernozhukov2016hdm_typo_xyz")
    assert "chernozhukov2016hdm_typo_xyz" in str(exc.value)


def test_bib_for_to_bibtex_loop_pure_python():
    # The advertised agent loop: result -> citation_keys -> full entries.
    import numpy as np

    rng = np.random.default_rng(0)
    X = rng.normal(size=(120, 8))
    y = X[:, 0] + rng.normal(size=120)
    result = sp.rlasso(X, y)

    payload = sp.bib_for(result)
    keys = payload.get("citation_keys") or [payload.get("key")]
    keys = [k for k in keys if k]
    assert keys, "bib_for returned no citation keys"
    # chernozhukov2016hdm (the hdm paper) must be among them.
    assert "chernozhukov2016hdm" in keys
    entries = sp.bibtex(keys)
    assert entries.count("@") >= 1
    assert "10.32614/RJ-2016-040" in entries
