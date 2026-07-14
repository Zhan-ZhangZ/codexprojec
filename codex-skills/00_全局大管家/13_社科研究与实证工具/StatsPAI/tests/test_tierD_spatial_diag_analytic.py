"""Tier D analytic special-case tests — spatial LISA, weak-IV F, stepwise.

Part of the P1 "Tier D analytic special-cases" campaign (see
``.tierd_campaign/CAMPAIGN.md``). These three entry points were graded
``untested`` by ``scripts/tierd_classify.py``. Each test anchors to a known
truth: the local/global Moran's I aggregation identity, the Olea-Pflueger
effective F reducing to the first-stage F under homoskedasticity, and stepwise
selection recovering a known sparsity pattern.

Entry points covered:
    sp.moran_local        Local Moran's I / LISA (per-unit spatial association)
    sp.effective_f_test   Olea-Pflueger (2013) robust effective first-stage F
    sp.stepwise           stepwise OLS variable selection

Purely additive — no estimator numerics changed (campaign red line).
"""

import numpy as np
import pandas as pd
import pytest

import statspai as sp


# ---------------------------------------------------------------------------
# sp.moran_local — LISA
# ---------------------------------------------------------------------------
class TestMoranLocalAnalytic:
    """Local Moran's I_i = z_i (Wz)_i / m2 with m2 = sum(z^2)/n, so the local
    statistics aggregate to the global Moran's I via  sum_i I_i = S0 * I."""

    @staticmethod
    def _line_graph():
        # 0-1-2-3-4 path graph, binary contiguity weights.
        w = sp.W(neighbors={0: [1], 1: [0, 2], 2: [1, 3], 3: [2, 4], 4: [3]})
        y = np.array([1.0, 2.0, 3.0, 2.5, 5.0])
        return w, y

    def test_local_matches_closed_form(self):
        w, y = self._line_graph()
        out = sp.moran_local(y, w, permutations=0)
        S = w.sparse
        z = y - y.mean()
        m2 = np.sum(z**2) / z.size
        expected = z * (S @ z) / m2
        np.testing.assert_allclose(out["Is"], expected, atol=1e-12)

    def test_aggregates_to_global_moran(self):
        # sum_i I_i = S0 * global Moran's I  (the LISA decomposition identity).
        w, y = self._line_graph()
        gi = sp.moran(y, w, permutations=0)
        out = sp.moran_local(y, w, permutations=0)
        s0 = float(w.sparse.sum())
        assert out["Is"].sum() == pytest.approx(s0 * gi.value, abs=1e-9)

    def test_perfect_gradient_is_positively_autocorrelated(self):
        # A smooth monotone gradient -> positive global I -> the local stats
        # sum to a positive value (clustering of like values).
        w = sp.W(
            neighbors={i: [j for j in (i - 1, i + 1) if 0 <= j < 8] for i in range(8)}
        )
        y = np.arange(8, dtype=float)
        out = sp.moran_local(y, w, permutations=0)
        assert out["Is"].sum() > 0


# ---------------------------------------------------------------------------
# sp.effective_f_test — Olea-Pflueger effective F
# ---------------------------------------------------------------------------
class TestEffectiveFAnalytic:

    @staticmethod
    def _iv_data(seed=0, n=600):
        rng = np.random.default_rng(seed)
        z = rng.normal(0, 1, n)
        x = rng.normal(0, 1, n)
        endog = 0.7 * z + 0.4 * x + rng.normal(0, 1, n)
        y = 1.0 * endog + 0.5 * x + rng.normal(0, 1, n)
        return pd.DataFrame({"y": y, "endog": endog, "z": z, "x": x})

    def test_classic_equals_first_stage_F(self):
        # Under homoskedastic vcov and a single instrument, F_eff reduces
        # exactly to the standard first-stage F (Olea-Pflueger 2013).
        df = self._iv_data()
        r = sp.effective_f_test(
            df, endog="endog", instruments=["z"], exog=["x"], vcov="classic"
        )
        assert r["F_eff"] == pytest.approx(r["first_stage_F"], rel=1e-12)

    def test_matches_hand_computed_first_stage_F(self):
        # Re-derive the single-instrument first-stage F as the squared t-stat
        # of the instrument in the first-stage OLS (classic SE).
        df = self._iv_data()
        n = len(df)
        X = np.column_stack([np.ones(n), df["x"].values, df["z"].values])
        d = df["endog"].values
        beta, *_ = np.linalg.lstsq(X, d, rcond=None)
        resid = d - X @ beta
        sigma2 = resid @ resid / (n - X.shape[1])
        xtx_inv = np.linalg.inv(X.T @ X)
        se_z = np.sqrt(sigma2 * xtx_inv[2, 2])
        f_hand = (beta[2] / se_z) ** 2
        r = sp.effective_f_test(
            df, endog="endog", instruments=["z"], exog=["x"], vcov="classic"
        )
        assert r["F_eff"] == pytest.approx(f_hand, rel=1e-6)

    def test_strong_instrument_exceeds_threshold(self):
        df = self._iv_data()
        r = sp.effective_f_test(df, endog="endog", instruments=["z"], exog=["x"])
        assert r["F_eff"] > r["stock_yogo_10pct"]
        assert "Strong" in r["strength"]

    def test_weak_instrument_below_threshold(self):
        # Near-irrelevant instrument -> tiny first-stage signal -> low F_eff.
        rng = np.random.default_rng(3)
        n = 600
        z = rng.normal(0, 1, n)
        endog = 0.02 * z + rng.normal(0, 1, n)  # almost no first stage
        y = endog + rng.normal(0, 1, n)
        df = pd.DataFrame({"y": y, "endog": endog, "z": z})
        r = sp.effective_f_test(df, endog="endog", instruments=["z"])
        assert r["F_eff"] < r["stock_yogo_10pct"]


# ---------------------------------------------------------------------------
# sp.stepwise — OLS variable selection
# ---------------------------------------------------------------------------
class TestStepwiseAnalytic:
    """With orthogonal candidates of which only a known subset truly enter,
    BIC stepwise selection recovers exactly that subset at large n."""

    @staticmethod
    def _sparse_dgp(seed=1, n=2000):
        rng = np.random.default_rng(seed)
        cols = {f"x{i}": rng.normal(0, 1, n) for i in range(1, 5)}
        # Only x1 and x3 are real; x2, x4 are pure noise.
        y = 2.0 * cols["x1"] - 1.5 * cols["x3"] + rng.normal(0, 0.5, n)
        df = pd.DataFrame({"y": y, **cols})
        return df

    @pytest.mark.parametrize("method", ["both", "forward", "backward"])
    def test_recovers_true_support(self, method):
        df = self._sparse_dgp()
        res = sp.stepwise(
            df,
            y="y",
            x=["x1", "x2", "x3", "x4"],
            method=method,
            criterion="bic",
            verbose=False,
        )
        assert set(res.selected) == {"x1", "x3"}

    def test_noise_variables_are_dropped(self):
        df = self._sparse_dgp()
        res = sp.stepwise(
            df,
            y="y",
            x=["x1", "x2", "x3", "x4"],
            method="both",
            criterion="bic",
            verbose=False,
        )
        assert "x2" not in res.selected
        assert "x4" not in res.selected
