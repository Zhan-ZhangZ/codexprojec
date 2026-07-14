"""Tests for the ``rdrobust(..., engine='ols'|'bayes')`` inference switch.

The switch lets the *same* sharp-RD call select a frequentist (CCT) or Bayesian
(``bayes_rd``) backend. The OLS path must stay byte-identical to the default;
the Bayesian path must (a) reject RD options that have no Bayesian analogue
*before* importing PyMC, and (b) forward the shared arguments. The Bayesian
happy path needs the optional ``bayes`` extra, so it is skipped when PyMC is
absent (the routing/validation is covered without it).
"""

from __future__ import annotations

import importlib.util

import numpy as np
import pandas as pd
import pytest

import statspai as sp

_HAS_PYMC = importlib.util.find_spec("pymc") is not None


def _sharp_rd_df(seed=42, n=2000):
    rng = np.random.default_rng(seed)
    x = rng.uniform(-1, 1, n)
    y = 0.5 * x + 3.0 * (x >= 0) + rng.normal(0, 0.3, n)
    return pd.DataFrame({"y": y, "x": x})


def test_engine_ols_is_default_and_unchanged():
    df = _sharp_rd_df()
    a = sp.rdrobust(df, y="y", x="x", c=0)
    b = sp.rdrobust(df, y="y", x="x", c=0, engine="ols")
    assert a.estimate == b.estimate
    assert a.se == b.se
    assert abs(a.estimate - 3.0) < 0.5  # recovers the jump


def test_invalid_engine_raises():
    df = _sharp_rd_df()
    with pytest.raises(ValueError, match="engine must be"):
        sp.rdrobust(df, y="y", x="x", c=0, engine="nuts")


@pytest.mark.parametrize(
    "kwargs",
    [
        {"fuzzy": "d"},
        {"deriv": 1},
        {"q": 3},
        {"b": 0.5},
        {"rho": 0.8},
        {"covs": ["z"]},
        {"cluster": "g"},
        {"weights": "w"},
        {"bootstrap": "wild"},
        {"donut": 0.05},
        {"kernel": "uniform"},
        {"bwselect": "cerrd"},
    ],
)
def test_bayes_engine_rejects_ols_only_options(kwargs):
    df = _sharp_rd_df()
    with pytest.raises(ValueError, match="engine='bayes' does not support"):
        sp.rdrobust(df, y="y", x="x", c=0, engine="bayes", **kwargs)


def test_bayes_engine_rejects_string_bandwidth():
    df = _sharp_rd_df()
    with pytest.raises(ValueError, match="numeric h"):
        sp.rdrobust(df, y="y", x="x", c=0, engine="bayes", h="mserd")


@pytest.mark.skipif(_HAS_PYMC, reason="PyMC installed; ImportError path N/A")
def test_bayes_engine_without_pymc_raises_importerror():
    df = _sharp_rd_df()
    with pytest.raises(ImportError, match=r"statspai\[bayes\]"):
        sp.rdrobust(df, y="y", x="x", c=0, engine="bayes")


@pytest.mark.skipif(not _HAS_PYMC, reason="requires the bayes extra (PyMC)")
def test_bayes_engine_returns_posterior_result():
    df = _sharp_rd_df()
    res = sp.rdrobust(df, y="y", x="x", c=0, engine="bayes", h=0.5, random_state=0)
    assert isinstance(res, sp.BayesianCausalResult)
    assert abs(res.posterior_mean - 3.0) < 0.6  # recovers the jump
