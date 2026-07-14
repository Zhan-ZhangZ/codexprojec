"""GARCH must report parameter standard errors / inference.

Regression test for the inference gap: ``sp.garch`` previously returned only
point estimates (omega, alpha, beta, mu) with *no* standard errors, so the
parameters could not be tested or given confidence intervals. SEs now come
from the inverse observed information (numerical Hessian) at the MLE, exposed
through the standard ``params`` / ``std_errors`` / ``pvalues`` accessors.

Monte-Carlo coverage was validated separately: the Hessian SE tracks the
empirical SD of alpha-hat / beta-hat to ratio ~0.96 over 120 draws.
"""

import numpy as np
import pytest

import statspai as sp


def _garch_series(seed=0, T=3000, omega=0.1, alpha=0.1, beta=0.85):
    rng = np.random.default_rng(seed)
    eps = np.zeros(T)
    s2 = np.zeros(T)
    s2[0] = omega / (1 - alpha - beta)
    for t in range(1, T):
        s2[t] = omega + alpha * eps[t - 1] ** 2 + beta * s2[t - 1]
        eps[t] = np.sqrt(s2[t]) * rng.normal()
    return eps


@pytest.fixture(scope="module")
def fit():
    return sp.garch(_garch_series(), p=1, q=1)


def test_params_and_se_exposed(fit):
    assert list(fit.params.index) == ["mu", "omega", "alpha[1]", "beta[1]"]
    assert list(fit.std_errors.index) == list(fit.params.index)
    se = fit.std_errors
    assert np.all(np.isfinite(se.values))
    assert np.all(se.values > 0)


def test_params_match_point_fields(fit):
    assert fit.params["omega"] == pytest.approx(fit.omega, rel=1e-12)
    assert fit.params["alpha[1]"] == pytest.approx(float(fit.alpha[0]), rel=1e-12)
    assert fit.params["beta[1]"] == pytest.approx(float(fit.beta[0]), rel=1e-12)


def test_arch_garch_terms_significant(fit):
    # on a genuine GARCH(1,1) DGP the ARCH and GARCH terms are highly significant
    assert fit.pvalues["alpha[1]"] < 0.01
    assert fit.pvalues["beta[1]"] < 0.01


def test_summary_shows_se_table(fit):
    s = fit.summary()
    assert "GARCH(1,1)" in s  # legacy header preserved
    assert "std err" in s
    assert "P>|z|" in s


def test_se_in_reasonable_range(fit):
    # alpha/beta SEs at T=3000 are O(0.01-0.03); guard against the old
    # "no SE" regression (which would surface as NaN / empty Series here).
    assert 0.0 < fit.std_errors["alpha[1]"] < 0.1
    assert 0.0 < fit.std_errors["beta[1]"] < 0.1
