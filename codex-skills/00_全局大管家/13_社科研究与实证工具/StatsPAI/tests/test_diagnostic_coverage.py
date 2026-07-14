"""Diagnostic coverage — no estimator may silently skip a diagnostic.

A ``result.violations()`` check only fires if the estimator populated the
``model_info`` key it reads. When one IV entry point stores ``first_stage_f``
and another does not, the weak-instrument warning silently vanishes for the
second — exactly the kind of gap that erodes trust (it was real for ``sp.liml``
and ``sp.jive`` until fixed). This suite pins the whole IV family: every
estimator must record the first-stage strength and flag a weak instrument, and
none may cry wolf on a strong one. A new IV estimator that forgets the
diagnostic fails here instead of shipping a blind spot.
"""
from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
import pytest

import statspai as sp


def _iv_df(first_stage_coef: float, n: int = 800, seed: int = 0) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    z = rng.normal(size=n)
    u = rng.normal(size=n)
    d = first_stage_coef * z + u + rng.normal(size=n)
    y = 1.0 * d + u + rng.normal(size=n)
    return pd.DataFrame({"y": y, "d": d, "z": z})


# (id, fitter) — every single-endogenous IV estimator StatsPAI exposes.
_IV_ESTIMATORS = [
    ("ivreg_2sls", lambda df: sp.ivreg("y ~ (d ~ z)", data=df)),
    ("iv_2sls", lambda df: sp.iv("y ~ (d ~ z)", data=df, method="2sls")),
    ("iv_liml", lambda df: sp.iv("y ~ (d ~ z)", data=df, method="liml")),
    ("iv_fuller", lambda df: sp.iv("y ~ (d ~ z)", data=df, method="fuller")),
    ("iv_gmm", lambda df: sp.iv("y ~ (d ~ z)", data=df, method="gmm")),
    ("liml", lambda df: sp.liml("y ~ (d ~ z)", data=df)),
    ("jive", lambda df: sp.jive(df, y="y", x_endog=["d"], z=["z"])),
]


@pytest.mark.parametrize("name,fit", _IV_ESTIMATORS, ids=[e[0] for e in _IV_ESTIMATORS])
def test_iv_estimator_records_first_stage_and_flags_weak(name, fit):
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        weak = fit(_iv_df(0.03))
        strong = fit(_iv_df(2.0))

    assert weak.model_info.get("first_stage_f") is not None, (
        f"{name}: model_info['first_stage_f'] is missing — weak IV would be "
        "silently skipped by result.violations()"
    )
    assert "weak_instrument" in {
        v["test"] for v in weak.violations()
    }, f"{name}: a weak first stage did not surface in violations()"
    assert "weak_instrument" not in {
        v["test"] for v in strong.violations()
    }, f"{name}: false-positive weak-instrument flag on a strong first stage"


# --------------------------------------------------------------------------- #
#  Panel — every clustered method records n_clusters
# --------------------------------------------------------------------------- #


def _panel_df(n_units: int, n_periods: int = 8, seed: int = 0) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows = []
    for i in range(n_units):
        a = rng.normal()
        for t in range(n_periods):
            x = rng.normal()
            rows.append({"id": i, "yr": t, "x": x, "y": x + a + rng.normal()})
    return pd.DataFrame(rows)


@pytest.mark.parametrize("method", ["fe", "re", "twoway", "fd", "pooled"])
def test_panel_method_records_n_clusters_and_flags_few(method):
    def fit(df):
        return sp.panel(
            df, "y ~ x", entity="id", time="yr", method=method, cluster="entity"
        )

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        few = fit(_panel_df(12))
        many = fit(_panel_df(60))
    assert few.model_info.get("n_clusters") == 12, f"panel({method}) drops n_clusters"
    assert "few_clusters" in {v["test"] for v in few.violations()}
    assert "few_clusters" not in {v["test"] for v in many.violations()}


# --------------------------------------------------------------------------- #
#  Matching — every method records the post-match balance table
# --------------------------------------------------------------------------- #


def _confounded(strength: float, n: int = 800, seed: int = 0) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    x1, x2 = rng.normal(size=n), rng.normal(size=n)
    ps = 1 / (1 + np.exp(-(strength * x1 + 0.6 * strength * x2)))
    d = (rng.uniform(size=n) < ps).astype(int)
    y = 1 + 2 * d + x1 + x2 + rng.normal(size=n)
    return pd.DataFrame({"y": y, "d": d, "x1": x1, "x2": x2})


@pytest.mark.parametrize("method", ["psm", "nearest", "mahalanobis", "cem"])
def test_match_method_records_balance_and_flags_imbalance(method):
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        r = sp.match(
            _confounded(1.5), y="y", treat="d", covariates=["x1", "x2"], method=method
        )
    assert isinstance(
        r.model_info.get("balance"), pd.DataFrame
    ), f"match({method}) does not record a balance table"
    assert "balance" in {v["test"] for v in r.violations()}


def test_cbps_reports_residual_imbalance():
    """CBPS stores balance under std_mean_diff_after (not `balance`) and is not
    tagged 'matching' — residual imbalance must still surface."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        r = sp.cbps(_confounded(1.5), y="y", treat="d", covariates=["x1", "x2"])
    assert isinstance(r.model_info.get("std_mean_diff_after"), dict)
    assert "balance" in {v["test"] for v in r.violations()}


# --------------------------------------------------------------------------- #
#  Count — Poisson flags over-dispersion and excess zeros
# --------------------------------------------------------------------------- #


def test_poisson_flags_overdispersion_and_excess_zeros():
    rng = np.random.default_rng(0)
    x = rng.normal(size=600)
    lam = np.exp(0.5 + 0.8 * x)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        over = sp.poisson(
            "y ~ x",
            data=pd.DataFrame({"y": rng.poisson(lam * rng.gamma(1, 1, 600)), "x": x}),
        )
        zinfl = pd.DataFrame({"y": rng.poisson(lam), "x": x})
        zinfl.loc[rng.uniform(size=600) < 0.4, "y"] = 0
        zi = sp.poisson("y ~ x", data=zinfl)
        clean = sp.poisson("y ~ x", data=pd.DataFrame({"y": rng.poisson(lam), "x": x}))
    assert "overdispersion" in {v["test"] for v in over.violations()}
    assert "excess_zeros" in {v["test"] for v in zi.violations()}
    clean_tests = {v["test"] for v in clean.violations()}
    assert "overdispersion" not in clean_tests and "excess_zeros" not in clean_tests
