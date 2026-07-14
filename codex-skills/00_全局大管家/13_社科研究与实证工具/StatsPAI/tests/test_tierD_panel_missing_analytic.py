"""Tier D analytic special-case tests — HDFE GLM and multiple-imputation.

Part of the P1 "Tier D analytic special-cases" campaign (see
``.tierd_campaign/CAMPAIGN.md``). Both entry points were graded ``untested`` by
``scripts/tierd_classify.py``. Anchors: a Gaussian HDFE GLM equals OLS and
recovers a known slope; multiple imputation with *no* missing data reduces to
the complete-data estimate exactly (Rubin's between-imputation variance is zero).

Entry points covered:
    sp.feglm        GLM with high-dimensional fixed effects (needs pyfixest)
    sp.mi_estimate  Rubin's-rules pooling of an estimator across imputations

Purely additive — no estimator numerics changed (campaign red line).
"""

import numpy as np
import pandas as pd
import pytest

import statspai as sp

# ---------------------------------------------------------------------------
# sp.feglm — GLM with high-dimensional fixed effects
# ---------------------------------------------------------------------------
pytest.importorskip("pyfixest", reason="feglm requires the fixest extra")


class TestFeglmAnalytic:

    def test_gaussian_equals_ols(self):
        # A Gaussian GLM with no fixed effects is OLS: coefficients must match
        # StatsPAI's own OLS to machine precision.
        rng = np.random.default_rng(0)
        n = 2000
        x = rng.normal(0, 1, n)
        y = 1.0 + 2.0 * x + rng.normal(0, 1, n)
        df = pd.DataFrame({"y": y, "x": x})
        fe = sp.feglm("y ~ x", data=df, family="gaussian")
        ols = sp.regress("y ~ x", data=df)
        assert float(fe.params["x"]) == pytest.approx(float(ols.params["x"]), rel=1e-6)
        assert float(fe.params["Intercept"]) == pytest.approx(
            float(ols.params["Intercept"]), rel=1e-6
        )

    def test_gaussian_recovers_true_slope(self):
        rng = np.random.default_rng(1)
        n = 5000
        x = rng.normal(0, 1, n)
        y = 0.5 + 2.0 * x + rng.normal(0, 1, n)
        df = pd.DataFrame({"y": y, "x": x})
        fe = sp.feglm("y ~ x", data=df, family="gaussian")
        assert float(fe.params["x"]) == pytest.approx(2.0, abs=0.05)

    def test_fixed_effects_absorb_group_intercepts(self):
        # y = 2 x + group shift; absorbing the group FE must recover slope 2.
        rng = np.random.default_rng(2)
        n = 3000
        x = rng.normal(0, 1, n)
        g = rng.integers(0, 10, n)
        y = 2.0 * x + g * 1.0 + rng.normal(0, 1, n)
        df = pd.DataFrame({"y": y, "x": x, "g": g})
        fe = sp.feglm("y ~ x | g", data=df, family="gaussian")
        assert float(fe.params["x"]) == pytest.approx(2.0, abs=0.05)

    def test_logit_recovers_true_coefficient(self):
        # MLE consistency: a logit GLM recovers the data-generating coefficient.
        rng = np.random.default_rng(5)
        n = 8000
        x = rng.normal(0, 1, n)
        p = 1.0 / (1.0 + np.exp(-(0.3 + 1.5 * x)))
        y = (rng.uniform(size=n) < p).astype(int)
        df = pd.DataFrame({"y": y, "x": x})
        lg = sp.feglm("y ~ x", data=df, family="logit")
        assert float(lg.params["x"]) == pytest.approx(1.5, abs=0.1)


# ---------------------------------------------------------------------------
# sp.mi_estimate — Rubin's rules
# ---------------------------------------------------------------------------
class TestMIEstimateAnalytic:

    @staticmethod
    def _complete_data(seed=0, n=2000):
        rng = np.random.default_rng(seed)
        x = rng.normal(0, 1, n)
        y = 1.0 + 2.0 * x + rng.normal(0, 1, n)
        return pd.DataFrame({"y": y, "x": x})

    def test_no_missingness_reduces_to_complete_data(self):
        # With no missing values, every imputation is identical, so Rubin's
        # between-imputation variance is zero: the pooled point estimate equals
        # the complete-data OLS exactly and the fraction of missing information
        # (fmi) is exactly zero.
        df = self._complete_data()
        ols = sp.regress("y ~ x", data=df)
        mres = sp.mice(df[["y", "x"]], m=4)
        comb = sp.mi_estimate(mres, sp.regress, formula="y ~ x")
        xi = comb["var_names"].index("x")
        assert comb["params"][xi] == pytest.approx(float(ols.params["x"]), rel=1e-6)
        assert comb["fmi"][xi] == pytest.approx(0.0, abs=1e-9)

    def test_fmi_in_unit_interval_under_missingness(self):
        rng = np.random.default_rng(7)
        df = self._complete_data(seed=7)
        df.loc[rng.uniform(size=len(df)) < 0.15, "x"] = np.nan
        mres = sp.mice(df[["y", "x"]], m=5)
        comb = sp.mi_estimate(mres, sp.regress, formula="y ~ x")
        fmi = np.asarray(comb["fmi"])
        assert np.all(fmi >= 0.0) and np.all(fmi <= 1.0)

    def test_recovers_complete_estimate_under_mcar(self):
        # Under MCAR, multiple imputation is consistent for the complete-data
        # coefficient, and pooling inflates the SE (missing information >= 0).
        rng = np.random.default_rng(9)
        df = self._complete_data(seed=9, n=4000)
        ols = sp.regress("y ~ x", data=df)
        df_miss = df.copy()
        df_miss.loc[rng.uniform(size=len(df)) < 0.12, "x"] = np.nan
        mres = sp.mice(df_miss[["y", "x"]], m=8)
        comb = sp.mi_estimate(mres, sp.regress, formula="y ~ x")
        xi = comb["var_names"].index("x")
        assert comb["params"][xi] == pytest.approx(float(ols.params["x"]), abs=0.05)
        assert comb["se"][xi] >= float(ols.std_errors["x"]) - 1e-9
