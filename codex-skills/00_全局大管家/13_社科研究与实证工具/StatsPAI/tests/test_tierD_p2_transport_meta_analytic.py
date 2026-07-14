"""Tier D P2 known-truth upgrades — transportability & effect heterogeneity.

Part of the P1/P2 "Tier D analytic special-cases" campaign (see
``.tierd_campaign/CAMPAIGN.md``). Both were graded ``weak`` by
``scripts/tierd_classify.py``. Each anchors to a closed form / known-DGP
recovery:

    sp.heterogeneity_of_effect  Cochran's Q = sum w_i (theta_i - theta_bar)^2
                                with w_i = 1/se_i^2 (DerSimonian-Laird); I^2 =
                                max(0, (Q-(k-1))/Q).
    sp.transport_generalize     density-ratio reweighting moves the RCT effect
                                from the source population to the target's true
                                effect under effect modification.

Purely additive — no estimator numerics changed (campaign red line).
"""

import numpy as np
import pandas as pd
import pytest

import statspai as sp


# ---------------------------------------------------------------------------
# sp.heterogeneity_of_effect — DerSimonian-Laird
# ---------------------------------------------------------------------------
class TestHeterogeneityAnalytic:

    def test_q_statistic_closed_form(self):
        est = np.array([0.5, 0.7, 0.45, 0.6])
        ses = np.array([0.1, 0.12, 0.09, 0.11])
        w = 1.0 / ses**2
        theta_bar = (w * est).sum() / w.sum()
        q = (w * (est - theta_bar) ** 2).sum()
        res = sp.heterogeneity_of_effect(est, ses)
        assert res.q_stat == pytest.approx(q, abs=1e-9)

    def test_i2_closed_form(self):
        est = np.array([0.5, 0.7, 0.45, 0.6])
        ses = np.array([0.1, 0.12, 0.09, 0.11])
        w = 1.0 / ses**2
        theta_bar = (w * est).sum() / w.sum()
        q = (w * (est - theta_bar) ** 2).sum()
        i2 = max(0.0, (q - (len(est) - 1)) / q)  # reported as a fraction
        res = sp.heterogeneity_of_effect(est, ses)
        assert res.i2 == pytest.approx(i2, abs=1e-9)

    def test_identical_estimates_have_no_heterogeneity(self):
        res = sp.heterogeneity_of_effect([0.5, 0.5, 0.5], [0.1, 0.1, 0.1])
        assert res.q_stat == pytest.approx(0.0, abs=1e-9)
        assert res.i2 == pytest.approx(0.0, abs=1e-9)


# ---------------------------------------------------------------------------
# sp.transport_generalize
# ---------------------------------------------------------------------------
class TestTransportAnalytic:

    def test_same_target_distribution_leaves_effect_unchanged(self):
        # Source and target share the covariate distribution -> the transport
        # weights are ~uniform and the transported effect equals the RCT effect.
        rng = np.random.default_rng(0)
        n = 3000
        x = rng.normal(0, 1, n)
        t = rng.integers(0, 2, n)
        y = 2.0 * t + 0.5 * x + rng.normal(0, 1, n)  # homogeneous effect 2.0
        rct = pd.DataFrame({"x": x, "treat": t, "y": y})
        tgt = pd.DataFrame({"x": rng.normal(0, 1, n)})
        res = sp.transport_generalize(
            rct, tgt, features=["x"], treatment="treat", outcome="y"
        )
        assert res.effect_source == pytest.approx(2.0, abs=0.15)
        assert res.effect_transported == pytest.approx(res.effect_source, abs=0.1)

    def test_reweights_to_target_under_effect_modification(self):
        # tau(x) = 1 + x is an effect modifier. Source x~N(0,1) -> source ATE 1;
        # target x~N(1,1) -> target ATE 2. Transport must move the effect from
        # the source value to the target's true effect.
        rng = np.random.default_rng(0)
        n = 6000
        x = rng.normal(0, 1, n)
        t = rng.integers(0, 2, n)
        y = (1.0 + x) * t + 0.5 * x + rng.normal(0, 1, n)
        rct = pd.DataFrame({"x": x, "treat": t, "y": y})
        tgt = pd.DataFrame({"x": rng.normal(1.0, 1, n)})
        res = sp.transport_generalize(
            rct, tgt, features=["x"], treatment="treat", outcome="y"
        )
        assert res.effect_source == pytest.approx(1.0, abs=0.2)
        assert res.effect_transported == pytest.approx(2.0, abs=0.25)
        assert res.effect_transported > res.effect_source + 0.5
