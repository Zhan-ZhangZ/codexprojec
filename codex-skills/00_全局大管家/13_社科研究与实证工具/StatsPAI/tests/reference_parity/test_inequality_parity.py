"""Reference parity: ``sp.inequality_index`` vs base-R closed form.

The Gini (bias-corrected relative mean difference), Theil-T, Theil-L (MLD) and
Atkinson (epsilon=1) inequality indices are deterministic closed-form
functionals; the reference values are the canonical formulas computed in base R
(matching the ``ineq`` package). The match is machine-precision exact.

Frozen reference: ``_fixtures/inequality_R.json`` (base R 4.5.2). Regenerate::

    Rscript tests/reference_parity/_generate_inequality_R.R

References
----------
- Gini (1912); Theil (1967); Atkinson (1970).
"""

from __future__ import annotations

import json
import pathlib

import numpy as np
import pytest

import statspai as sp

_FIXTURES = pathlib.Path(__file__).parent / "_fixtures"


@pytest.fixture(scope="module")
def r_reference():
    with open(_FIXTURES / "inequality_R.json", encoding="utf-8") as fh:
        return json.load(fh)


@pytest.mark.parametrize("index", ["gini", "theil_t", "theil_l", "atkinson"])
def test_inequality_index_matches_R(r_reference, index):
    x = np.asarray(r_reference["data"], dtype=float)
    got = sp.inequality_index(x, index=index)
    assert got == pytest.approx(r_reference[index], abs=1e-12)
