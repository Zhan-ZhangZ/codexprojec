"""Tests for the remaining engine switches: ``did_2x2(..., engine=)`` and the
estimand-first facade ``causal_question(..., engine='bayes')``.

The OLS paths must be unchanged; the Bayesian routing must validate loudly
(before importing PyMC) and forward cleanly. Happy paths need the ``bayes``
extra and are skipped when PyMC is absent; the routing/validation is covered
without it.
"""

from __future__ import annotations

import importlib.util

import numpy as np
import pandas as pd
import pytest

import statspai as sp

_HAS_PYMC = importlib.util.find_spec("pymc") is not None


def _did_df(seed=42, n=800, att=5.0):
    rng = np.random.default_rng(seed)
    d = rng.integers(0, 2, n)
    t = rng.integers(0, 2, n)
    y = 1 + 2 * d + 3 * t + att * d * t + rng.normal(0, 1, n)
    return pd.DataFrame({"y": y, "d": d, "t": t})


def _rd_df(seed=42, n=1500, jump=3.0):
    rng = np.random.default_rng(seed)
    x = rng.uniform(-1, 1, n)
    y = 0.5 * x + jump * (x >= 0) + rng.normal(0, 0.3, n)
    return pd.DataFrame({"y": y, "x": x})


# --------------------------------------------------------------------- #
#  did_2x2 engine switch — no PyMC needed
# --------------------------------------------------------------------- #
def test_did2x2_ols_is_default_and_unchanged():
    df = _did_df()
    a = sp.did_2x2(df, y="y", treat="d", time="t")
    b = sp.did_2x2(df, y="y", treat="d", time="t", engine="ols")
    assert a.estimate == b.estimate
    assert abs(a.estimate - 5.0) < 1.0


def test_did2x2_invalid_engine_raises():
    with pytest.raises(ValueError, match="engine must be"):
        sp.did_2x2(_did_df(), y="y", treat="d", time="t", engine="x")


def test_did2x2_bayes_rejects_cluster_and_weights():
    df = _did_df()
    with pytest.raises(ValueError, match="does not support"):
        sp.did_2x2(df, y="y", treat="d", time="t", engine="bayes", cluster="d")
    with pytest.raises(ValueError, match="does not support"):
        sp.did_2x2(df, y="y", treat="d", time="t", engine="bayes", weights="d")


def test_did2x2_ols_rejects_sampler_kwargs():
    # sampler kwargs are only valid under engine='bayes'
    with pytest.raises(TypeError, match="unexpected keyword"):
        sp.did_2x2(_did_df(), y="y", treat="d", time="t", draws=100)


@pytest.mark.skipif(not _HAS_PYMC, reason="requires the bayes extra (PyMC)")
def test_did2x2_bayes_recovers_att():
    df = _did_df()
    res = sp.did_2x2(
        df,
        y="y",
        treat="d",
        time="t",
        engine="bayes",
        draws=400,
        tune=400,
        chains=2,
        random_state=0,
    )
    assert type(res).__name__ == "BayesianDIDResult"
    assert abs(res.posterior_mean - 5.0) < 0.6


# --------------------------------------------------------------------- #
#  causal_question facade engine= — validation without PyMC
# --------------------------------------------------------------------- #
def test_facade_invalid_engine_raises_at_construction():
    with pytest.raises(Exception, match="engine"):
        sp.causal_question("x", "y", data=_rd_df(), design="rct", engine="nuts")


def test_facade_default_engine_is_ols():
    df = pd.DataFrame(
        {"treat": [0, 1] * 50, "y": np.random.default_rng(0).normal(size=100)}
    )
    q = sp.causal_question("treat", "y", data=df, design="rct")
    assert q.engine == "ols"
    assert q.estimate().estimator == "regress"


def test_facade_bayes_unsupported_design_raises():
    df = pd.DataFrame(
        {"treat": [0, 1] * 50, "y": np.random.default_rng(0).normal(size=100)}
    )
    q = sp.causal_question("treat", "y", data=df, design="rct", engine="bayes")
    with pytest.raises(Exception, match="not yet wired"):
        q.estimate()


def test_facade_bayes_rd_missing_fields_raises():
    q = sp.causal_question(
        "x",
        "y",
        data=_rd_df(),
        design="regression_discontinuity",
        engine="bayes",  # running_variable / cutoff omitted
    )
    with pytest.raises(Exception, match="requires running_variable"):
        q.estimate()


@pytest.mark.skipif(not _HAS_PYMC, reason="requires the bayes extra (PyMC)")
def test_facade_bayes_rd_recovers_jump():
    q = sp.causal_question(
        "x",
        "y",
        data=_rd_df(),
        design="regression_discontinuity",
        running_variable="x",
        cutoff=0.0,
        engine="bayes",
    )
    res = q.estimate(draws=400, tune=400, chains=2, random_state=0)
    assert res.estimator == "bayes_rd"
    assert type(res.underlying).__name__ == "BayesianCausalResult"
    assert abs(res.estimate - 3.0) < 0.6
    assert res.ci[0] < res.estimate < res.ci[1]
