"""Limited-dependent-variable family: full-vector exposure + reliability.

These tests pin the agent-native contract for the limited-dependent-variable
regression family (``sp.tobit`` / ``sp.heckman``):

* ``params`` / ``std_errors`` / ``tvalues`` / ``pvalues`` expose the *entire*
  coefficient table (every regressor + ancillary parameter), matching the
  Stata (``tobit`` / ``heckman``) and R (``AER::tobit`` /
  ``sampleSelection::heckit``) convention — not just the headline estimand.
* The headline ``estimate`` / ``se`` / ``ci`` are preserved as the
  first-regressor effect, so single-effect consumers and the historical
  ``CausalResult`` contract are unaffected.
* ``tobit`` reports a robust ``converged`` flag (a small gradient norm at the
  optimum is treated as convergence, ignoring the spurious BFGS
  "precision loss" status-2 false alarm).

Numerical parity against AER / sampleSelection is covered separately in
``tests/reference_parity/`` against frozen R fixtures; this file covers the
result-object API contract introduced alongside ``LimitedDepResult``.
"""

import numpy as np
import pandas as pd
import pytest

import statspai as sp
from statspai.core.results import CausalResult
from statspai.regression._limited_dep_result import LimitedDepResult


# --------------------------------------------------------------------------
# Fixtures
# --------------------------------------------------------------------------
@pytest.fixture(scope="module")
def tobit_df():
    rng = np.random.default_rng(20260617)
    n = 400
    x1 = rng.normal(size=n)
    x2 = rng.normal(size=n)
    eps = rng.normal(size=n)
    y_star = 1.0 + 0.5 * x1 - 0.3 * x2 + eps
    y = np.where(y_star > 0, y_star, 0.0)
    return pd.DataFrame({"y": y, "x1": x1, "x2": x2})


@pytest.fixture(scope="module")
def heckman_df():
    rng = np.random.default_rng(20260617)
    n = 800
    edu = rng.normal(12, 3, n)
    exper = rng.uniform(0, 30, n)
    kids = rng.integers(0, 4, n)
    spinc = rng.normal(30, 10, n)
    u = rng.normal(size=n)
    e = 0.7 * u + rng.normal(size=n)
    emp = (-0.5 + 0.1 * edu - 0.4 * kids - 0.02 * spinc + e > 0).astype(int)
    wage = 5 + 1.2 * edu + 0.3 * exper + 2.0 * u
    wage = np.where(emp == 1, wage, np.nan)
    return pd.DataFrame(
        {
            "wage": wage,
            "education": edu,
            "experience": exper,
            "employed": emp,
            "children": kids,
            "spouse_income": spinc,
        }
    )


# --------------------------------------------------------------------------
# Tobit: full-vector exposure
# --------------------------------------------------------------------------
class TestTobitFullVector:
    def test_returns_limiteddep_but_isinstance_causalresult(self, tobit_df):
        r = sp.tobit(tobit_df, y="y", x=["x1", "x2"], ll=0)
        assert isinstance(r, LimitedDepResult)
        assert isinstance(r, CausalResult)  # backward compatibility

    def test_params_is_full_vector(self, tobit_df):
        r = sp.tobit(tobit_df, y="y", x=["x1", "x2"], ll=0)
        # const + x1 + x2 + sigma, not just the headline beta_x1
        assert list(r.params.index) == ["const", "x1", "x2", "sigma"]
        assert len(r.params) == 4

    def test_std_errors_and_pvalues_align(self, tobit_df):
        r = sp.tobit(tobit_df, y="y", x=["x1", "x2"], ll=0)
        assert list(r.std_errors.index) == list(r.params.index)
        assert list(r.pvalues.index) == list(r.params.index)
        assert (r.std_errors.drop("sigma") > 0).all()

    def test_params_match_detail_table(self, tobit_df):
        r = sp.tobit(tobit_df, y="y", x=["x1", "x2"], ll=0)
        dm = r.detail.set_index("variable")["coefficient"]
        for name in ["const", "x1", "x2", "sigma"]:
            assert r.params[name] == pytest.approx(dm[name], rel=1e-12)

    def test_headline_estimate_preserved(self, tobit_df):
        r = sp.tobit(tobit_df, y="y", x=["x1", "x2"], ll=0)
        # headline == coefficient on first regressor (x1)
        assert r.estimate == pytest.approx(r.params["x1"], rel=1e-12)
        assert r.se == pytest.approx(r.std_errors["x1"], rel=1e-12)

    def test_coef_table(self, tobit_df):
        r = sp.tobit(tobit_df, y="y", x=["x1", "x2"], ll=0)
        ct = r.coef_table()
        assert list(ct.index) == ["const", "x1", "x2", "sigma"]
        assert {"coefficient", "se", "z", "pvalue"} <= set(ct.columns)

    def test_etable_emits_full_table(self, tobit_df):
        r = sp.tobit(tobit_df, y="y", x=["x1", "x2"], ll=0)
        txt = str(sp.etable(r))
        for name in ["const", "x1", "x2", "sigma"]:
            assert name in txt


# --------------------------------------------------------------------------
# Tobit: convergence-flag reliability
# --------------------------------------------------------------------------
class TestTobitConvergence:
    def test_converged_true_on_clean_data(self, tobit_df):
        r = sp.tobit(tobit_df, y="y", x=["x1", "x2"], ll=0)
        # BFGS reports status-2 "precision loss" here, but the gradient norm
        # at the optimum is ~1e-5: this is a genuine optimum, so the robust
        # flag must report converged.
        assert r.model_info["converged"] is True
        assert r.model_info["gradient_norm"] < 1e-3

    def test_no_censoring_matches_ols(self):
        rng = np.random.default_rng(7)
        n = 500
        x = rng.normal(size=n)
        y = 10 + 2 * x + rng.normal(size=n)  # uncensored
        df = pd.DataFrame({"y": y, "x": x})
        r = sp.tobit(df, y="y", x=["x"], ll=-100)
        assert r.params["x"] == pytest.approx(2.0, abs=0.3)
        assert r.model_info["converged"] is True


# --------------------------------------------------------------------------
# Heckman: full-vector exposure
# --------------------------------------------------------------------------
class TestHeckmanFullVector:
    def test_params_include_outcome_and_lambda(self, heckman_df):
        r = sp.heckman(
            heckman_df,
            y="wage",
            x=["education", "experience"],
            select="employed",
            z=["education", "children", "spouse_income"],
        )
        idx = list(r.params.index)
        assert "const" in idx
        assert "education" in idx
        assert "experience" in idx
        assert "lambda (IMR)" in idx

    def test_headline_is_first_regressor(self, heckman_df):
        r = sp.heckman(
            heckman_df,
            y="wage",
            x=["education", "experience"],
            select="employed",
            z=["education", "children", "spouse_income"],
        )
        assert r.estimate == pytest.approx(r.params["education"], rel=1e-12)

    def test_education_coef_recovers_truth(self, heckman_df):
        r = sp.heckman(
            heckman_df,
            y="wage",
            x=["education", "experience"],
            select="employed",
            z=["education", "children", "spouse_income"],
        )
        # true wage slope on education is 1.2; selection-corrected estimate
        # should land in a reasonable neighbourhood
        assert r.params["education"] == pytest.approx(1.2, abs=0.25)

    def test_isinstance_causalresult(self, heckman_df):
        r = sp.heckman(
            heckman_df,
            y="wage",
            x=["education"],
            select="employed",
            z=["education", "children", "spouse_income"],
        )
        assert isinstance(r, CausalResult)
        assert "heckman1979" in r.cite()


# --------------------------------------------------------------------------
# Subclass fallback safety (no detail table -> single-estimand behaviour)
# --------------------------------------------------------------------------
def test_fallback_to_single_estimand_when_no_detail():
    r = LimitedDepResult(
        method="x",
        estimand="beta_x",
        estimate=1.0,
        se=0.1,
        pvalue=0.0,
        ci=(0.8, 1.2),
        alpha=0.05,
        n_obs=10,
        detail=None,
    )
    assert list(r.params.index) == ["beta_x"]
    assert r.params["beta_x"] == 1.0
    assert r.std_errors["beta_x"] == 0.1


# --------------------------------------------------------------------------
# Truncated regression: convergence-flag reliability
# --------------------------------------------------------------------------
class TestTruncregConvergence:
    @pytest.fixture(scope="class")
    def trunc_df(self):
        rng = np.random.default_rng(20260617)
        n = 500
        x1 = rng.normal(size=n)
        x2 = rng.normal(size=n)
        y = 1.0 + 0.8 * x1 - 0.4 * x2 + rng.normal(size=n)
        df = pd.DataFrame({"y": y, "x1": x1, "x2": x2})
        return df[df["y"] > 0].reset_index(drop=True)

    def test_converged_true_on_clean_data(self, trunc_df):
        r = sp.truncreg(trunc_df, y="y", x=["x1", "x2"], ll=0)
        # Same spurious BFGS status-2 "precision loss" as Tobit: the robust
        # gradient-norm criterion must report convergence at a genuine optimum.
        assert r.model_info["converged"] is True
        assert r.model_info["gradient_norm"] < 1e-3

    def test_recovers_slope(self, trunc_df):
        r = sp.truncreg(trunc_df, y="y", x=["x1", "x2"], ll=0)
        assert r.params["x1"] == pytest.approx(0.8, abs=0.2)


# --------------------------------------------------------------------------
# Count / proportion MLEs: convergence-flag reliability (shared helper)
# --------------------------------------------------------------------------
class TestCountModelConvergence:
    def _df(self, seed=20260617, n=600):
        rng = np.random.default_rng(seed)
        x = rng.normal(size=n)
        z = rng.normal(size=n)
        lam = np.exp(0.3 + 0.4 * x)
        pi = 1.0 / (1.0 + np.exp(-(-0.2 + 0.5 * z)))
        nb = rng.poisson(rng.gamma(2.0, lam / 2.0))
        y = np.where(rng.random(n) < pi, 0, nb)
        return pd.DataFrame({"y": y, "x": x, "z": z})

    def test_zip_converged(self):
        import warnings

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            r = sp.zip_model(formula="y ~ x", data=self._df(), inflate=["z"])
        assert r.model_info["converged"] is True

    def test_zinb_converged(self):
        import warnings

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            r = sp.zinb(formula="y ~ x", data=self._df(), inflate=["z"])
        assert r.model_info["converged"] is True

    def test_betareg_converged(self):
        rng = np.random.default_rng(20260617)
        n = 600
        x = rng.normal(size=n)
        p = 1.0 / (1.0 + np.exp(-(0.5 + 0.8 * x)))
        y = np.clip(rng.beta(2 * p, 2 * (1 - p)), 1e-4, 1 - 1e-4)
        r = sp.betareg(pd.DataFrame({"y": y, "x": x}), y="y", x=["x"])
        assert r.model_info["converged"] is True
        assert r.params["x"] == pytest.approx(0.8, abs=0.25)


# --------------------------------------------------------------------------
# Bivariate probit: error-correlation rho must actually be estimated
# (regression test: rho was previously pinned at 0 by a noisy BVN CDF).
# --------------------------------------------------------------------------
class TestBiprobitRho:
    def _make(self, seed, correlated):
        rng = np.random.default_rng(seed)
        n = 800
        x1 = rng.normal(size=n)
        x2 = rng.normal(size=n)
        u = rng.normal(size=n)
        v = (0.5 * u if correlated else 0.0) + rng.normal(size=n)
        y1 = ((0.3 + 0.6 * x1 + u) > 0).astype(int)
        y2 = ((-0.2 + 0.5 * x2 + v) > 0).astype(int)
        return pd.DataFrame({"y1": y1, "y2": y2, "x1": x1, "x2": x2})

    def test_rho_recovered_when_correlated(self):
        from statspai.regression.selection import biprobit

        r = biprobit(self._make(0, True), y1="y1", y2="y2", x1=["x1"], x2=["x2"])
        # true corr(u, v) = 0.5 / sqrt(1.25) ~= 0.447
        assert r.model_info["rho"] == pytest.approx(0.447, abs=0.12)
        assert r.model_info["rho_test_p"] < 0.01  # correlation detected
        assert r.model_info["converged"] is True

    def test_rho_near_zero_when_independent(self):
        from statspai.regression.selection import biprobit

        r = biprobit(self._make(99, False), y1="y1", y2="y2", x1=["x1"], x2=["x2"])
        assert abs(r.model_info["rho"]) < 0.1
        assert r.model_info["rho_test_p"] > 0.05  # independence not rejected


# --------------------------------------------------------------------------
# Parametric AFT survival: result must expose the standard accessors
# (regression test: AFTResult.params was None, scale SE was discarded).
# --------------------------------------------------------------------------
class TestAFTAccessors:
    def _df(self, seed=20260617, n=2000):
        rng = np.random.default_rng(seed)
        x = rng.normal(size=n)
        ev = np.log(-np.log(rng.uniform(size=n)))
        t = np.exp(1.0 + 0.5 * x + 0.8 * ev)
        return pd.DataFrame({"t": t, "x": x, "event": np.ones(n, dtype=int)})

    def test_params_exposed(self):
        r = sp.aft(formula="t + event ~ x", data=self._df(), family="weibull")
        assert r.params is not None
        assert list(r.params.index) == ["Intercept", "x", "log(sigma)"]
        assert r.params["x"] == pytest.approx(0.5, abs=0.1)

    def test_std_errors_and_pvalues(self):
        r = sp.aft(formula="t + event ~ x", data=self._df(), family="weibull")
        assert list(r.std_errors.index) == list(r.params.index)
        assert (r.std_errors > 0).all()  # incl. the recovered log(sigma) SE
        assert r.pvalues["x"] < 1e-3

    def test_exponential_has_no_log_sigma(self):
        r = sp.aft(formula="t + event ~ x", data=self._df(), family="exponential")
        assert "log(sigma)" not in r.params.index
        assert list(r.params.index) == ["Intercept", "x"]

    def test_matches_survreg(self):
        df = self._df()
        ra = sp.aft(formula="t + event ~ x", data=df, family="weibull")
        rs = sp.survreg(
            formula="t ~ x",
            data=df,
            duration="t",
            event="event",
            dist="weibull",
        )
        # two independent Weibull AFT implementations must agree
        assert ra.params["x"] == pytest.approx(float(rs.params["x"]), abs=1e-3)
        assert ra.std_errors["x"] == pytest.approx(float(rs.std_errors["x"]), abs=1e-3)


# --------------------------------------------------------------------------
# Cox frailty: result must expose the standard accessors too
# (regression test: FrailtyResult.params was not exposed).
# --------------------------------------------------------------------------
class TestFrailtyAccessors:
    def _df(self, seed=20260617, n=1500, g=40):
        rng = np.random.default_rng(seed)
        x = rng.normal(size=n)
        grp = rng.integers(0, g, size=n)
        b = rng.normal(0, 0.5, g)
        t = rng.exponential(np.exp(-(0.5 * x + b[grp])))
        c = rng.exponential(2.0, n)
        return pd.DataFrame(
            {"t": np.minimum(t, c), "x": x, "event": (t <= c).astype(int), "grp": grp}
        )

    def test_params_exposed(self):
        import warnings

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            r = sp.cox_frailty(formula="t + event ~ x", data=self._df(), cluster="grp")
        assert r.params is not None
        assert "x" in r.params.index
        assert list(r.std_errors.index) == list(r.params.index)
        assert (r.std_errors > 0).all()
        assert r.pvalues["x"] < 0.05
