"""Tier D P2 known-truth upgrades — CATE evaluation (RATE / AUTOC / Qini).

Part of the P1/P2 "Tier D analytic special-cases" campaign (see
``.tierd_campaign/CAMPAIGN.md``). ``cate_eval`` was graded ``weak`` by
``scripts/tierd_classify.py``. The anchor is the defining property of RATE /
AUTOC (Yadlowsky et al. 2025): a CATE that correctly ranks units by their true
benefit earns a positive, significant AUTOC, while a CATE that is pure noise
earns an AUTOC indistinguishable from zero.

DGP: heterogeneous effect tau(x) = 1 + x with a randomized treatment, so the
oracle CATE is the true tau and ranks units perfectly.

Purely additive — no estimator numerics changed (campaign red line).
"""

import numpy as np

import statspai as sp


def _hetero_dgp(seed=0, n=4000):
    rng = np.random.default_rng(seed)
    x = rng.normal(0, 1, n)
    t = (rng.uniform(size=n) < 0.5).astype(int)  # randomized
    tau = 1.0 + x  # effect modifier
    y = tau * t + 0.5 * x + rng.normal(0, 1, n)
    return x, t, y, tau


class TestCATEEvalAnalytic:

    def test_oracle_cate_has_positive_significant_autoc(self):
        x, t, y, tau = _hetero_dgp()
        res = sp.cate_eval(tau, y, t, X=x.reshape(-1, 1), target="AUTOC")
        assert res.autoc > 0.3
        # The 95% CI excludes zero: the oracle ranking is real heterogeneity.
        assert res.autoc_ci[0] > 0

    def test_random_cate_has_near_zero_autoc(self):
        x, t, y, tau = _hetero_dgp()
        rng = np.random.default_rng(99)
        noise = rng.normal(0, 1, len(y))  # CATE unrelated to the true effect
        res = sp.cate_eval(noise, y, t, X=x.reshape(-1, 1), target="AUTOC")
        assert abs(res.autoc) < 0.2
        # CI contains zero -> no detectable prioritisation value.
        assert res.autoc_ci[0] <= 0 <= res.autoc_ci[1]

    def test_oracle_beats_random_on_autoc_and_qini(self):
        x, t, y, tau = _hetero_dgp()
        rng = np.random.default_rng(7)
        noise = rng.normal(0, 1, len(y))
        oracle = sp.cate_eval(tau, y, t, X=x.reshape(-1, 1), target="AUTOC")
        random = sp.cate_eval(noise, y, t, X=x.reshape(-1, 1), target="AUTOC")
        assert oracle.autoc > random.autoc
        assert oracle.qini > random.qini

    def test_constant_effect_has_no_prioritisation_value(self):
        # A homogeneous treatment effect cannot be prioritised: even the
        # "oracle" constant CATE has an AUTOC near zero.
        rng = np.random.default_rng(1)
        n = 4000
        x = rng.normal(0, 1, n)
        t = (rng.uniform(size=n) < 0.5).astype(int)
        y = 2.0 * t + 0.5 * x + rng.normal(0, 1, n)  # constant effect 2.0
        res = sp.cate_eval(np.full(n, 2.0), y, t, X=x.reshape(-1, 1), target="AUTOC")
        assert abs(res.autoc) < 0.2
