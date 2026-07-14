"""Tier D P2 known-truth upgrades — longitudinal g-formula contrasts.

Part of the P1/P2 "Tier D analytic special-cases" campaign (see
``.tierd_campaign/CAMPAIGN.md``). These were graded ``weak`` by
``scripts/tierd_classify.py``. The anchor is the classic Robins time-varying-
confounding DGP, where treatment at time 0 affects a confounder of treatment at
time 1, so naive adjustment is biased but the g-formula recovers the known
always-treat-vs-never-treat contrast.

    sp.longitudinal_contrast / sp.always_treat / sp.never_treat

DGP (2 periods): L0~N(0,1); A0~Bern(logit L0); L1 = 0.5 A0 + 0.5 L0 + e;
A1~Bern(logit L1); Y = th0 A0 + th1 A1 + beta L1 + e. Then
E[Y(1,1)] = th0 + th1 + 0.5 beta, E[Y(0,0)] = 0, so the static contrast is
th0 + th1 + 0.5 beta.

Purely additive — no estimator numerics changed (campaign red line).
"""

import numpy as np
import pandas as pd
import pytest

import statspai as sp


def _robins_panel(seed=0, n=4000, th0=1.0, th1=1.0, beta=2.0, a0_affects_l1=True):
    rng = np.random.default_rng(seed)
    rows = []
    for i in range(n):
        l0 = rng.normal(0, 1)
        a0 = int(rng.uniform() < 1.0 / (1.0 + np.exp(-l0)))
        l1 = (0.5 * a0 if a0_affects_l1 else 0.0) + 0.5 * l0 + rng.normal(0, 1)
        a1 = int(rng.uniform() < 1.0 / (1.0 + np.exp(-l1)))
        y = th0 * a0 + th1 * a1 + beta * l1 + rng.normal(0, 1)
        rows.append({"id": i, "time": 0, "A": a0, "L": l0, "Y": y})
        rows.append({"id": i, "time": 1, "A": a1, "L": l1, "Y": y})
    return pd.DataFrame(rows)


class TestLongitudinalContrastAnalytic:

    def test_recovers_known_static_contrast(self):
        # th0 + th1 + 0.5 beta = 1 + 1 + 1 = 3.0.
        df = _robins_panel(th0=1.0, th1=1.0, beta=2.0)
        out = sp.longitudinal_contrast(
            df,
            id="id",
            time="time",
            treatment="A",
            outcome="Y",
            regime_a=sp.always_treat(2),
            regime_b=sp.never_treat(2),
            time_varying=["L"],
        )
        assert out["contrast"] == pytest.approx(3.0, abs=0.2)

    def test_regime_specific_means(self):
        df = _robins_panel(th0=1.0, th1=1.0, beta=2.0)
        out = sp.longitudinal_contrast(
            df,
            id="id",
            time="time",
            treatment="A",
            outcome="Y",
            regime_a=sp.always_treat(2),
            regime_b=sp.never_treat(2),
            time_varying=["L"],
        )
        assert out["a_result"].estimate == pytest.approx(3.0, abs=0.2)
        assert out["b_result"].estimate == pytest.approx(0.0, abs=0.2)

    def test_no_causal_path_gives_zero_contrast(self):
        # No direct effect AND treatment does not affect the confounder ->
        # there is no causal path from A to Y -> contrast is 0.
        df = _robins_panel(th0=0.0, th1=0.0, beta=2.0, a0_affects_l1=False)
        out = sp.longitudinal_contrast(
            df,
            id="id",
            time="time",
            treatment="A",
            outcome="Y",
            regime_a=sp.always_treat(2),
            regime_b=sp.never_treat(2),
            time_varying=["L"],
        )
        assert out["contrast"] == pytest.approx(0.0, abs=0.2)


class TestRegimeConstructors:

    def test_always_and_never_treat_are_distinct_regimes(self):
        # The two static regimes produce a non-trivial contrast on an
        # effectful DGP (sanity that they are not the same regime object).
        df = _robins_panel(th0=1.0, th1=1.0, beta=2.0)
        out = sp.longitudinal_contrast(
            df,
            id="id",
            time="time",
            treatment="A",
            outcome="Y",
            regime_a=sp.always_treat(2),
            regime_b=sp.never_treat(2),
            time_varying=["L"],
        )
        assert out["a_result"].estimate > out["b_result"].estimate + 1.0
