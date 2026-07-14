"""Tier D P2 known-truth upgrades — target-trial emulation & immortal time.

Part of the P1/P2 "Tier D analytic special-cases" campaign (see
``.tierd_campaign/CAMPAIGN.md``). Both were graded ``weak`` by
``scripts/tierd_classify.py``. Each anchors to an exact count / known-DGP
recovery:

    sp.immortal_time_check   flags exactly the subjects whose treatment starts
                             before eligibility (treatment_start < eligibility).
    sp.target_trial_emulate  under a randomized protocol the IPW mean-difference
                             recovers the true ATE; the eligibility filter
                             excludes the right rows.

Purely additive — no estimator numerics changed (campaign red line).
"""

import numpy as np
import pandas as pd
import pytest

import statspai as sp


# ---------------------------------------------------------------------------
# sp.immortal_time_check
# ---------------------------------------------------------------------------
class TestImmortalTimeAnalytic:

    @staticmethod
    def _panel(n=30, n_biased=10):
        # First ``n_biased`` subjects start treatment before eligibility.
        tstart = np.where(np.arange(n) < n_biased, -1.0, 2.0)
        return pd.DataFrame(
            {"id": np.arange(n), "t": np.ones(n), "tstart": tstart, "elig": np.zeros(n)}
        )

    def test_flags_treatment_before_eligibility(self):
        df = self._panel(n=30, n_biased=10)
        d = sp.immortal_time_check(
            df,
            id_col="id",
            time_col="t",
            treatment_start_col="tstart",
            eligibility_time_col="elig",
        )
        assert d.n_flagged == 10
        assert d.fraction_flagged == pytest.approx(10 / 30, abs=1e-12)
        assert set(d.flagged_ids) == set(range(10))

    def test_clean_data_has_no_flags(self):
        df = self._panel(n=30, n_biased=0)
        d = sp.immortal_time_check(
            df,
            id_col="id",
            time_col="t",
            treatment_start_col="tstart",
            eligibility_time_col="elig",
        )
        assert d.n_flagged == 0
        assert d.fraction_flagged == pytest.approx(0.0, abs=1e-12)


# ---------------------------------------------------------------------------
# sp.target_trial_emulate
# ---------------------------------------------------------------------------
class TestTargetTrialEmulateAnalytic:

    @staticmethod
    def _randomized(seed=0, n=4000):
        rng = np.random.default_rng(seed)
        x = rng.normal(0, 1, n)
        a = (rng.uniform(size=n) < 0.5).astype(int)  # randomized, A ⟂ x
        y = 2.0 * a + 0.5 * x + rng.normal(0, 1, n)
        return pd.DataFrame({"A": a, "Y": y, "x": x})

    @staticmethod
    def _protocol():
        return sp.target_trial_protocol(
            eligibility=lambda row: True,
            treatment_strategies=["treat", "control"],
            assignment="randomization",
            time_zero="t0",
            followup_end="end",
            outcome="Y",
        )

    def test_randomized_protocol_recovers_ate(self):
        dat = self._randomized()
        res = sp.target_trial_emulate(
            self._protocol(), dat, outcome_col="Y", treatment_col="A"
        )
        assert res.estimate == pytest.approx(2.0, abs=0.15)
        assert res.n_eligible == len(dat)

    def test_eligibility_filter_excludes_rows(self):
        dat = self._randomized()
        res = sp.target_trial_emulate(
            self._protocol(),
            dat,
            outcome_col="Y",
            treatment_col="A",
            time_zero_filter=lambda d: d["x"] > 0,
        )
        # ~half the sample has x > 0.
        assert res.n_eligible == int((dat["x"] > 0).sum())
        assert res.n_eligible < len(dat)
