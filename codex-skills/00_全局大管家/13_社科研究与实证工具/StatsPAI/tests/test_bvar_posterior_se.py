"""Bayesian VAR must report posterior uncertainty, not just the mean.

Regression test for the inference gap: ``sp.bvar`` previously returned only
the posterior-mean coefficient matrix with no measure of posterior
dispersion, so a user could not form credible intervals. The marginal
posterior SD is now available in closed form from the matrix-normal posterior
``B ~ MN(B_post, (X'X + V^{-1})^{-1}, Sigma)``:

    sd[i, k] = sqrt( [(X'X + V^{-1})^{-1}]_{ii} * Sigma_{kk} ).

Validated offline against statsmodels VAR: in the loose-prior limit the
posterior SD equals the OLS VAR standard error (to the n vs n-k df factor).
"""

import numpy as np
import pandas as pd
import pytest

import statspai as sp


def _bivariate_var(seed=0, T=600):
    rng = np.random.default_rng(seed)
    a = np.zeros(T)
    b = np.zeros(T)
    for t in range(1, T):
        a[t] = 0.5 * a[t - 1] + 0.2 * b[t - 1] + rng.normal()
        b[t] = -0.3 * a[t - 1] + 0.4 * b[t - 1] + rng.normal()
    return pd.DataFrame({"a": a, "b": b})


def test_posterior_sd_present_and_valid():
    r = sp.bvar(_bivariate_var(), lags=1)
    assert r.coef_sd is not None
    assert r.coef_sd.shape == r.coef.shape
    assert np.all(np.isfinite(r.coef_sd))
    assert np.all(r.coef_sd > 0)


def test_credible_interval_brackets_mean():
    r = sp.bvar(_bivariate_var(), lags=1)
    lo, hi = r.credible_interval(level=0.90)
    assert lo.shape == r.coef.shape == hi.shape
    assert np.all(lo < r.coef)
    assert np.all(r.coef < hi)
    # wider level => wider interval
    lo99, hi99 = r.credible_interval(level=0.99)
    assert np.all(hi99 - lo99 > hi - lo - 1e-12)


def test_minnesota_prior_shrinks_posterior_sd():
    df = _bivariate_var()
    tight = sp.bvar(df, lags=1, lambda1=0.1)  # strong shrinkage
    loose = sp.bvar(df, lags=1, lambda1=1e6)  # ~ OLS
    # the own-lag coefficient (row 0, eq 0) is shrunk towards the RW prior,
    # so its posterior SD must be no larger than the loose-prior (OLS) SD
    assert tight.coef_sd[0, 0] <= loose.coef_sd[0, 0] + 1e-9


def test_summary_reports_posterior_sd():
    r = sp.bvar(_bivariate_var(), lags=1)
    s = r.summary()
    assert "Bayesian VAR" in s
    assert "Posterior SD" in s
