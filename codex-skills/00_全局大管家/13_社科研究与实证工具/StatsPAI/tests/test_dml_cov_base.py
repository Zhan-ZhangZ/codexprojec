"""Coverage campaign — DML base input validation (``dml/_base.py``).

Part of the core-module ≥95% coverage initiative
(see ``.coverage_campaign/CAMPAIGN.md``). Covers the reachable ``sample_weight``
validation guards in the shared DML base: wrong length, non-finite values, and
zero total mass each raise a specific, informative ``ValueError``.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

import statspai as sp


@pytest.fixture(scope="module")
def data():
    rng = np.random.default_rng(0)
    n, p = 300, 4
    X = rng.standard_normal((n, p))
    g = X @ rng.standard_normal(p) * 0.3
    d = g + rng.standard_normal(n)
    y = 2.0 * d + g + rng.standard_normal(n)
    df = pd.DataFrame(X, columns=[f"x{i}" for i in range(p)])
    df["d"] = d
    df["y"] = y
    return df, [f"x{i}" for i in range(p)]


def _fit(df, X, **kw):
    return sp.dml(df, y="y", d="d", X=X, model_y="rf", model_d="rf", n_folds=3, **kw)


def test_sample_weight_wrong_length_raises(data):
    df, X = data
    with pytest.raises(ValueError):
        _fit(df, X, sample_weight=np.ones(len(df) - 5))


def test_sample_weight_negative_raises(data):
    df, X = data
    w = np.ones(len(df))
    w[0] = -1.0
    with pytest.raises(ValueError, match="non-negative"):
        _fit(df, X, sample_weight=w)


def test_sample_weight_non_finite_raises(data):
    df, X = data
    w = np.ones(len(df))
    w[0] = np.inf  # inf survives NaN-row dropping → hits the finiteness guard
    with pytest.raises(ValueError, match="non-finite"):
        _fit(df, X, sample_weight=w)


def test_sample_weight_zero_mass_raises(data):
    df, X = data
    with pytest.raises(ValueError, match="zero total mass"):
        _fit(df, X, sample_weight=np.zeros(len(df)))
