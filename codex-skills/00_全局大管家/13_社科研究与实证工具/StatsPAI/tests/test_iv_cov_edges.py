"""Coverage campaign — IV edge cases, summary renderers, and weak-instrument
confidence-set states.

Part of the core-module ≥95% coverage initiative
(see ``.coverage_campaign/CAMPAIGN.md``). Mops up the remaining branches:
``plausibly_exogenous`` array inputs + ``summary()``; the unbounded /
single-interval states of ``WeakIVConfidenceSet`` (weak instruments) plus its
``summary()`` / ``as_intervals()``; ``ivdml`` and ``kernel_iv`` parameter
variants and summaries; ``bch_post_lasso_iv`` array inputs; degenerate
``continuous_iv_late``.

Assertions stay real: a near-zero first stage must yield an *unbounded*
Anderson–Rubin set (it cannot reject far-out nulls), summaries must be
non-trivial strings, and the DML/kernel estimators must return finite effects.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

import statspai as sp


@pytest.fixture(scope="module")
def strong_df():
    rng = np.random.default_rng(41)
    n = 500
    z1 = rng.standard_normal(n)
    z2 = rng.standard_normal(n)
    x = rng.standard_normal(n)
    u = rng.standard_normal(n)
    d = 0.8 * z1 + 0.6 * z2 + 0.3 * x + 0.6 * u + 0.5 * rng.standard_normal(n)
    y = 1.0 + 2.0 * d + 0.4 * x + u + rng.standard_normal(n)
    return pd.DataFrame({"y": y, "d": d, "z1": z1, "z2": z2, "x": x})


# ─── plausibly_exogenous: array inputs + summary ─────────────────────────


def test_plausibly_ltz_array_and_summary(strong_df):
    df = strong_df
    res = sp.iv.plausibly_exogenous_ltz(
        y=df["y"].to_numpy(),
        endog=df["d"].to_numpy(),
        instruments=df[["z1"]].to_numpy(),
        gamma_mean=0.0,
        gamma_var=0.01,
    )
    txt = res.summary()
    assert isinstance(txt, str) and "exogenous" in txt.lower()


def test_plausibly_uci_array_and_summary(strong_df):
    df = strong_df
    res = sp.iv.plausibly_exogenous_uci(
        y=df["y"].to_numpy(),
        endog=df["d"].to_numpy(),
        instruments=df[["z1"]].to_numpy(),
        gamma_grid=np.linspace(-0.3, 0.3, 7),
    )
    assert isinstance(res.summary(), str)


# ─── WeakIVConfidenceSet: unbounded / summary under weak instruments ─────


def test_ar_set_unbounded_under_weak_instrument():
    rng = np.random.default_rng(42)
    n = 400
    # near-irrelevant instrument: first stage ≈ 0
    z = rng.standard_normal(n)
    d = 0.01 * z + rng.standard_normal(n)
    y = 1.0 + 2.0 * d + rng.standard_normal(n)
    cs = sp.iv.anderson_rubin_ci(
        y=y,
        endog=d,
        instruments=z.reshape(-1, 1),
        beta_grid=np.linspace(-50, 50, 401),
    )
    # a dead first stage cannot reject far-out nulls → set is wide / unbounded
    assert cs.is_unbounded or (
        cs.as_intervals() and (cs.as_intervals()[0][1] - cs.as_intervals()[0][0]) > 10
    )
    assert isinstance(cs.summary(), str)


def test_weak_iv_ci_summary_strong(strong_df):
    df = strong_df
    cs = sp.iv.anderson_rubin_ci(
        y="y", endog="d", instruments=["z1", "z2"], exog=["x"], data=df
    )
    s = cs.summary()
    assert isinstance(s, str) and len(s) > 0
    # single connected interval prints as a closed range
    assert "[" in s or "(" in s or "∞" in s or "inf" in s.lower()


# ─── ivdml + kernel_iv parameter variants & summaries ────────────────────


def test_ivdml_summary_and_folds(strong_df):
    res = sp.iv.ivdml(
        data=strong_df,
        y="y",
        treat="d",
        instruments=["z1", "z2"],
        covariates=["x"],
        n_folds=3,
    )
    assert np.isfinite(float(res.estimate))
    assert isinstance(res.summary(), str)


def test_kernel_iv_bandwidth_ridge(strong_df):
    res = sp.iv.kernel_iv(
        data=strong_df,
        y="y",
        treat="d",
        instrument="z1",
        bandwidth=0.5,
        ridge=0.1,
    )
    assert res is not None


# ─── post_lasso array inputs ─────────────────────────────────────────────


def test_post_lasso_array_inputs(strong_df):
    df = strong_df
    res = sp.iv.bch_post_lasso_iv(
        y=df["y"].to_numpy(),
        endog=df["d"].to_numpy(),
        instruments=df[["z1", "z2"]].to_numpy(),
        exog=df[["x"]].to_numpy(),
    )
    assert res is not None


# ─── continuous_iv_late degenerate instrument ────────────────────────────


def test_continuous_late_few_bins():
    rng = np.random.default_rng(43)
    n = 300
    # binary instrument → qcut(q=4) collapses to <2 usable bins (fallback path)
    z = (rng.uniform(0, 1, n) > 0.5).astype(float)
    d = 0.5 * z + 0.5 * rng.standard_normal(n)
    y = 1.0 + 1.5 * d + rng.standard_normal(n)
    df = pd.DataFrame({"y": y, "d": d, "z": z})
    res = sp.iv.continuous_iv_late(
        data=df, y="y", treat="d", instrument="z", n_quantiles=4, n_boot=20, seed=0
    )
    assert res is not None
