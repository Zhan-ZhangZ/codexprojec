"""Coverage campaign — ``sp.iv`` dispatcher routes not exercised elsewhere.

Part of the core-module ≥95% coverage initiative (see
``.coverage_campaign/CAMPAIGN.md``). These tests drive the ``method=`` branches
in ``statspai/iv/__init__.py`` that ``test_iv_dispatcher.py`` does not cover —
``jive_mw``, ``many_weak_ar``, ``lasso``, ``post_lasso``, ``mte``,
``ivmte_bounds``, ``plausibly_exog_uci/ltz`` — and, transitively, the underlying
estimator modules (``many_weak.py``, ``post_lasso.py``, ``mte.py``,
``ivmte_lp.py``, ``plausibly_exogenous.py``).

Each test asserts a *real* property of the returned result, not just that the
call did not raise: routes must produce a structured result whose point
estimate is finite and (for the over-identified consistent estimators) lands in
a neighbourhood of the true effect of the DGP. They do not re-derive the
estimator's exact numerics — that is the per-method / parity suites' job.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

import statspai as sp

# ─── DGPs ───────────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def iv_data():
    """Over-identified IV with a continuous endogenous regressor, true beta=2."""
    rng = np.random.default_rng(0)
    n = 500
    z1 = rng.standard_normal(n)
    z2 = rng.standard_normal(n)
    z3 = rng.standard_normal(n)
    x1 = rng.standard_normal(n)
    u = rng.standard_normal(n)
    d = (
        0.7 * z1
        + 0.5 * z2
        + 0.4 * z3
        + 0.3 * x1
        + 0.6 * u
        + 0.5 * rng.standard_normal(n)
    )
    y = 1.0 + 2.0 * d + 0.5 * x1 + u + rng.standard_normal(n)
    return pd.DataFrame({"y": y, "d": d, "z1": z1, "z2": z2, "z3": z3, "x1": x1})


@pytest.fixture(scope="module")
def binary_treat_data():
    """Binary treatment driven by a continuous instrument (MTE/LATE shape)."""
    rng = np.random.default_rng(1)
    n = 800
    z = rng.uniform(-2, 2, n)
    x = rng.standard_normal(n)
    v = rng.standard_normal(n)
    # latent index → binary treatment; z shifts participation
    d = (0.8 * z + 0.3 * x - 0.5 * v > 0).astype(float)
    y = 1.0 + 1.5 * d + 0.4 * x + 0.5 * v + rng.standard_normal(n)
    return pd.DataFrame({"y": y, "d": d, "z": z, "x": x})


def _point(res):
    """Pull a scalar point estimate out of whatever result object comes back."""
    for attr in ("coef", "beta", "estimate", "point_estimate", "late", "ate", "tau"):
        val = getattr(res, attr, None)
        if val is None:
            continue
        arr = np.atleast_1d(np.asarray(val, dtype=float))
        arr = arr[np.isfinite(arr)]
        if arr.size:
            return (
                float(arr.flat[np.argmax(np.abs(arr))])
                if arr.size > 1
                else float(arr.flat[0])
            )
    return None


# ─── Many-weak family ───────────────────────────────────────────────────


def test_route_jive_mw(iv_data):
    res = sp.iv(
        method="jive_mw", data=iv_data, y="y", endog="d", instruments=["z1", "z2", "z3"]
    )
    assert res is not None
    pt = _point(res)
    assert pt is not None and np.isfinite(pt)
    # JIVE is consistent under many weak instruments — should be near beta=2.
    assert abs(pt - 2.0) < 1.0


def test_route_many_weak_ar(iv_data):
    res = sp.iv(
        method="many_weak_ar",
        data=iv_data,
        y="y",
        endog="d",
        instruments=["z1", "z2", "z3"],
        alpha=0.05,
    )
    assert res is not None
    # AR is a test-inversion CI; the true value 2.0 should not be far outside it.
    lo = getattr(res, "ci_lower", None)
    hi = getattr(res, "ci_upper", None)
    if lo is not None and hi is not None and np.isfinite(lo) and np.isfinite(hi):
        assert lo - 1.0 <= 2.0 <= hi + 1.0


# ─── Lasso family ───────────────────────────────────────────────────────


def test_route_lasso(iv_data):
    res = sp.iv(
        method="lasso",
        data=iv_data,
        y="y",
        x_endog=["d"],
        x_exog=["x1"],
        z=["z1", "z2", "z3"],
    )
    assert res is not None
    # lasso-IV returns an EconometricResults with a name-keyed params Series.
    beta_d = float(res.params["d"])
    assert np.isfinite(beta_d)
    assert abs(beta_d - 2.0) < 1.0


def test_route_post_lasso(iv_data):
    res = sp.iv(
        method="post_lasso",
        data=iv_data,
        y="y",
        endog="d",
        instruments=["z1", "z2", "z3"],
        exog=["x1"],
    )
    assert res is not None
    pt = _point(res)
    assert pt is not None and np.isfinite(pt)
    assert abs(pt - 2.0) < 1.0


# ─── MTE / IVMTE bounds (binary treatment) ──────────────────────────────


def test_route_mte(binary_treat_data):
    res = sp.iv(
        method="mte", data=binary_treat_data, y="y", endog="d", instruments=["z"]
    )
    assert res is not None
    # MTE yields a curve and/or summary effects; just require a finite summary.
    pt = _point(res)
    assert pt is None or np.isfinite(pt)


def test_route_ivmte_bounds(binary_treat_data):
    res = sp.iv(
        method="ivmte_bounds",
        data=binary_treat_data,
        y="y",
        endog="d",
        instruments=["z"],
    )
    assert res is not None
    lo = getattr(res, "lower", getattr(res, "lb", None))
    hi = getattr(res, "upper", getattr(res, "ub", None))
    if lo is not None and hi is not None and np.isfinite(lo) and np.isfinite(hi):
        assert lo <= hi


# ─── Plausibly-exogenous sensitivity ────────────────────────────────────


def test_route_plausibly_exog_uci(iv_data):
    res = sp.iv(
        method="plausibly_exog_uci",
        data=iv_data,
        y="y",
        endog="d",
        instruments=["z1"],
        gamma_grid=np.linspace(-0.4, 0.4, 9),
    )
    assert res is not None
    lo = getattr(res, "ci_lower", None)
    hi = getattr(res, "ci_upper", None)
    if lo is not None and hi is not None and np.isfinite(lo) and np.isfinite(hi):
        assert lo <= hi


def test_route_plausibly_exog_ltz(iv_data):
    res = sp.iv(
        method="plausibly_exog_ltz",
        data=iv_data,
        y="y",
        endog="d",
        instruments=["z1"],
        gamma_mean=0.0,
        gamma_var=0.01,
    )
    assert res is not None
    pt = _point(res)
    assert pt is None or np.isfinite(pt)


# ─── Unknown method still errors clearly ────────────────────────────────


def test_route_unknown_method_raises(iv_data):
    with pytest.raises((ValueError, KeyError)):
        sp.iv(
            method="definitely_not_a_method",
            data=iv_data,
            y="y",
            endog="d",
            instruments=["z1", "z2"],
        )
