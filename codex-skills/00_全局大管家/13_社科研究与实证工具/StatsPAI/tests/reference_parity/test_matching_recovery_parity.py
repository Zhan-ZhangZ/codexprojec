"""Analytical parity: sp.sbw / sp.genmatch recover a known ATT.

On a deterministic conditional-ignorability DGP with a homogeneous treatment
effect (ATT = 2.0), stable balancing weights (``sp.sbw``) and genetic matching
(``sp.genmatch``) must recover the truth. These are analytical-only records:
verified against a known DGP truth, no cross-package reference required.

Both estimators are deterministic here — ``sbw`` solves a convex program;
``genmatch`` is seeded via ``random_state=0``.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest


def _cia_data(seed: int = 9, n: int = 1500) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    x1 = rng.normal(0, 1, n)
    x2 = rng.normal(0, 1, n)
    ps = 1.0 / (1.0 + np.exp(-(0.6 * x1 - 0.4 * x2)))
    d = (rng.uniform(size=n) < ps).astype(int)
    y = 1.0 + 2.0 * d + 0.9 * x1 - 0.6 * x2 + rng.normal(0, 1, n)
    return pd.DataFrame({"y": y, "d": d, "x1": x1, "x2": x2})


@pytest.fixture(scope="module")
def data():
    return _cia_data()


def test_sbw_recovers_known_att(data):
    import statspai as sp

    r = sp.sbw(data, y="y", treat="d", covariates=["x1", "x2"])
    est = float(r["estimate"] if isinstance(r, dict) else getattr(r, "estimate"))
    se = float(r["se"] if isinstance(r, dict) else getattr(r, "se"))
    assert abs(est - 2.0) <= 4.0 * se, f"SBW ATT {est:.4f} not within 4 SE of 2.0"
    assert 0.0 < se < 1.0


def test_genmatch_recovers_known_att(data):
    import statspai as sp

    r = sp.genmatch(data, y="y", treat="d", covariates=["x1", "x2"], random_state=0)
    att = (
        r.get("att", r.get("estimate"))
        if isinstance(r, dict)
        else getattr(r, "att", getattr(r, "estimate", None))
    )
    est = float(np.ravel(att)[0])
    # No analytic SE for genetic matching; recover within a ~3-4 sigma band
    # (the SBW SE on the same DGP is ~0.08, so 0.3 is a conservative band).
    assert abs(est - 2.0) < 0.3, f"GenMatch ATT {est:.4f} did not recover 2.0"
