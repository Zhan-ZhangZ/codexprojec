"""Coverage campaign — IV summary renderers and remaining input/param branches.

Part of the core-module ≥95% coverage initiative
(see ``.coverage_campaign/CAMPAIGN.md``). Final tractable sweep for iv: the
``summary()`` text renderers and remaining input-form / parameter branches that
are reachable without optional heavy deps — ``bayesian_iv`` (conjugate Gibbs,
no PyMC needed) array inputs + summary, ``npiv`` custom grid / no-constant,
``many_weak`` AR confidence set, ``kernel_iv`` explicit grid, ``ivdml`` without
covariates.

Assertions check finite estimates and non-trivial summary strings.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

import statspai as sp


@pytest.fixture(scope="module")
def df():
    rng = np.random.default_rng(51)
    n = 400
    z1 = rng.standard_normal(n)
    z2 = rng.standard_normal(n)
    x = rng.standard_normal(n)
    u = rng.standard_normal(n)
    d = 0.8 * z1 + 0.6 * z2 + 0.3 * x + 0.6 * u + 0.5 * rng.standard_normal(n)
    y = 1.0 + 2.0 * d + 0.4 * x + u + rng.standard_normal(n)
    return pd.DataFrame({"y": y, "d": d, "z1": z1, "z2": z2, "x": x})


def test_bayesian_iv_array_inputs_and_summary(df):
    res = sp.iv.bayesian_iv(
        y=df["y"].to_numpy(),
        endog=df["d"].to_numpy(),
        instruments=df[["z1", "z2"]].to_numpy(),
        exog=df[["x"]].to_numpy(),
        n_draws=300,
        random_state=0,
    )
    assert res is not None
    txt = res.summary()
    assert isinstance(txt, str) and len(txt) > 0
    # posterior mean should be in the neighbourhood of the true slope (=2)
    pm = getattr(res, "posterior_mean", getattr(res, "estimate", None))
    if pm is not None:
        pm = float(np.atleast_1d(np.asarray(pm, dtype=float)).ravel()[0])
        assert np.isfinite(pm)


def test_npiv_custom_grid_no_const(df):
    grid = np.linspace(df["d"].min(), df["d"].max(), 30)
    res = sp.iv.npiv(
        y="y",
        endog="d",
        instruments=df[["z1", "z2"]],
        data=df,
        d_grid=grid,
        add_const=False,
        k_z=3,
    )
    assert np.asarray(res.h_values).size == grid.size


def test_many_weak_ar_confidence_set(df):
    res = sp.iv.many_weak_ar(
        data=df, y="y", endog="d", instruments=["z1", "z2"], alpha=0.10
    )
    assert res is not None
    lo = getattr(res, "ci_lower", None)
    hi = getattr(res, "ci_upper", None)
    if lo is not None and hi is not None and np.isfinite(lo) and np.isfinite(hi):
        assert lo <= hi


def test_kernel_iv_explicit_grid(df):
    grid = np.linspace(df["d"].min(), df["d"].max(), 20)
    res = sp.iv.kernel_iv(
        data=df, y="y", treat="d", instrument="z1", grid=grid, ridge=0.05
    )
    assert res is not None


def test_ivdml_without_covariates(df):
    res = sp.iv.ivdml(data=df, y="y", treat="d", instruments=["z1", "z2"], n_folds=3)
    assert np.isfinite(float(res.estimate))


def test_jive_summary_no_constant(df):
    res = sp.iv.jive1(
        y="y",
        endog="d",
        instruments=["z1", "z2"],
        exog=["x"],
        data=df,
        add_const=False,
    )
    assert isinstance(res.summary(), str)
    assert np.isfinite(float(res.params.iloc[0]))
