"""Analytical parity: postestimation is exact linear algebra on the fit.

``sp.lincom`` / ``sp.test`` / ``sp.margins`` are deterministic closed-form
functionals of a fitted model's coefficients and standard errors. This suite
pins the *closed-form identities* they must satisfy on a deterministic OLS fit
(no cross-package reference needed — the identity IS the reference):

  * ``lincom`` of a single coefficient reproduces that coefficient and its SE;
    a scalar multiple scales both; a sum reproduces the summed point estimate.
  * ``test`` (Wald) of ``x = 0`` equals ``(coef / se) ** 2``.
  * ``margins`` (average marginal effect) of a covariate in a linear model
    equals its coefficient.

These are analytical-only records: verified against a known closed form, with
no R/Stata sibling required.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

import statspai as sp


@pytest.fixture(scope="module")
def fit():
    rng = np.random.default_rng(4242)
    n = 300
    df = pd.DataFrame(
        {
            "x1": rng.normal(0, 1, n),
            "x2": rng.normal(0, 1, n),
            "x3": rng.normal(0, 1, n),
        }
    )
    df["y"] = 1.0 + 0.5 * df.x1 - 0.3 * df.x2 + 0.8 * df.x3 + rng.normal(0, 1, n)
    return sp.regress("y ~ x1 + x2 + x3", data=df), df


def test_lincom_single_coefficient_identity(fit):
    r, _ = fit
    lc = sp.lincom(r, "x1")
    assert lc["estimate"] == pytest.approx(float(r.params["x1"]), abs=1e-10)
    assert lc["se"] == pytest.approx(float(r.std_errors["x1"]), abs=1e-10)


def test_lincom_scalar_multiple_identity(fit):
    r, _ = fit
    lc = sp.lincom(r, "2 * x1")
    assert lc["estimate"] == pytest.approx(2 * float(r.params["x1"]), abs=1e-10)
    assert lc["se"] == pytest.approx(2 * float(r.std_errors["x1"]), abs=1e-10)


def test_lincom_sum_point_estimate_identity(fit):
    r, _ = fit
    lc = sp.lincom(r, "x1 + x2")
    hand = float(r.params["x1"]) + float(r.params["x2"])
    assert lc["estimate"] == pytest.approx(hand, abs=1e-10)


def test_wald_test_equals_t_squared(fit):
    r, _ = fit
    t = sp.test(r, "x1 = 0")
    hand = (float(r.params["x1"]) / float(r.std_errors["x1"])) ** 2
    assert t["statistic"] == pytest.approx(hand, rel=1e-9)


def test_margins_average_marginal_effect_equals_coefficient(fit):
    r, df = fit
    m = sp.margins(r, data=df, variables=["x1"])
    dydx = float(m.loc[m["variable"] == "x1", "dy/dx"].iloc[0])
    assert dydx == pytest.approx(float(r.params["x1"]), abs=1e-9)
