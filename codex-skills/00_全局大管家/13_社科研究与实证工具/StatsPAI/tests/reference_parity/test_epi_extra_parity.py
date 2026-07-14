"""Reference parity: sp.cohen_kappa / sp.attributable_risk vs base-R closed form.

Point estimates only (Cohen's kappa + observed/expected agreement; attributable
fraction exposed + population attributable fraction) — the SEs/CIs use
convention-specific methods and are not pinned. Match is machine-precision.

Frozen reference: _fixtures/epi_extra_R.json. Regenerate::

    Rscript tests/reference_parity/_generate_epi_extra_R.R
"""

from __future__ import annotations

import json
import pathlib

import numpy as np
import pytest

import statspai as sp

_FIXTURES = pathlib.Path(__file__).parent / "_fixtures"
_TOL = 1e-12


@pytest.fixture(scope="module")
def r_reference():
    with open(_FIXTURES / "epi_extra_R.json", encoding="utf-8") as fh:
        return json.load(fh)


def _g(obj, key):
    return obj[key] if isinstance(obj, dict) else getattr(obj, key)


def test_cohen_kappa_matches_R(r_reference):
    ra = np.array([1, 1, 2, 2, 3, 1, 2, 3, 3, 1, 2, 2, 3, 1, 1])
    rb = np.array([1, 2, 2, 2, 3, 1, 3, 3, 3, 1, 2, 1, 3, 1, 2])
    res = sp.cohen_kappa(ra, rb)
    ref = r_reference["kappa"]
    assert _g(res, "kappa") == pytest.approx(ref["estimate"], abs=_TOL)
    assert _g(res, "observed_agreement") == pytest.approx(
        ref["observed_agreement"], abs=_TOL
    )
    assert _g(res, "expected_agreement") == pytest.approx(
        ref["expected_agreement"], abs=_TOL
    )


def test_attributable_risk_matches_R(r_reference):
    res = sp.attributable_risk(30, 70, 20, 80)
    ref = r_reference["attributable_risk"]
    assert _g(res, "ar_exposed") == pytest.approx(ref["afe"], abs=_TOL)
    assert _g(res, "paf") == pytest.approx(ref["paf"], abs=_TOL)
