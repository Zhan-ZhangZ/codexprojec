"""Reference parity: sp.mde / sp.power_cluster_rct vs base-R closed form.

  * ``sp.mde('rct')`` inverts the two-sample power formula:
    minimum detectable effect = ``(z_{1-a/2} + z_pow) / sqrt(n_g/2)``
    (sp rounds the reported effect size to 6 dp; observed gap ~2e-8).
  * ``sp.power_cluster_rct`` inflates the z-approximation by the design effect
    ``1 + (m-1)*icc`` (machine precision).

Frozen reference: ``_fixtures/power_extra_R.json`` (base R 4.5.2). Regenerate::

    Rscript tests/reference_parity/_generate_power_extra_R.R
"""

from __future__ import annotations

import json
import pathlib

import pytest

import statspai as sp

_FIXTURES = pathlib.Path(__file__).parent / "_fixtures"


@pytest.fixture(scope="module")
def r_reference():
    with open(_FIXTURES / "power_extra_R.json", encoding="utf-8") as fh:
        return json.load(fh)


def test_mde_rct_matches_closed_form(r_reference):
    for case in r_reference["mde"]:
        res = sp.mde("rct", n=case["n"], power_target=0.8, alpha=0.05, sigma=1.0)
        got = res["effect_size"] if isinstance(res, dict) else res.effect_size
        assert got == pytest.approx(case["effect_size"], abs=1e-6)


def test_power_cluster_rct_matches_design_effect(r_reference):
    for case in r_reference["cluster"]:
        res = sp.power_cluster_rct(
            n_clusters=case["nc"],
            cluster_size=case["m"],
            effect_size=case["d"],
            icc=case["icc"],
        )
        got = res["power"] if isinstance(res, dict) else getattr(res, "power")
        assert got == pytest.approx(case["power"], abs=1e-12)
