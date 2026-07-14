"""Tier D P2 known-truth upgrades — algorithmic fairness metrics.

Part of the P1/P2 "Tier D analytic special-cases" campaign (see
``.tierd_campaign/CAMPAIGN.md``). Both were graded ``weak`` by
``scripts/tierd_classify.py``. Each is an exact closed form on per-group
confusion matrices / prediction rates:

    sp.equalized_odds  gap = max(max|TPR_a-TPR_b|, max|FPR_a-FPR_b|)
                       (Hardt-Price-Srebro 2016).
    sp.fairness_audit  bundles the diagnostics; its equalized-odds sub-result
                       equals a direct call, and demographic parity is ~0 when
                       predictions are independent of the protected attribute.

Purely additive — no estimator numerics changed (campaign red line).
"""

import numpy as np
import pandas as pd
import pytest

import statspai as sp


def _hand_eo_gap(pred, y, a):
    def rates(p, yy):
        tpr = ((p == 1) & (yy == 1)).sum() / (yy == 1).sum()
        fpr = ((p == 1) & (yy == 0)).sum() / (yy == 0).sum()
        return tpr, fpr

    t0, f0 = rates(pred[a == 0], y[a == 0])
    t1, f1 = rates(pred[a == 1], y[a == 1])
    return max(abs(t0 - t1), abs(f0 - f1))


# ---------------------------------------------------------------------------
# sp.equalized_odds
# ---------------------------------------------------------------------------
class TestEqualizedOddsAnalytic:

    def test_perfect_classifier_has_zero_gap(self):
        # pred == y in both groups -> TPR = 1, FPR = 0 everywhere -> gap 0.
        rng = np.random.default_rng(0)
        n = 4000
        a = rng.integers(0, 2, n)
        y = rng.integers(0, 2, n)
        df = pd.DataFrame({"pred": y.copy(), "y": y, "A": a})
        res = sp.equalized_odds(df, predictions="pred", labels="y", protected="A")
        assert res.value == pytest.approx(0.0, abs=1e-12)
        assert res.passes is True

    def test_gap_equals_max_tpr_fpr_gap(self):
        # Corrupt group A==1 predictions -> the reported gap is exactly the
        # larger of the TPR gap and the FPR gap across the two groups.
        rng = np.random.default_rng(0)
        n = 4000
        a = rng.integers(0, 2, n)
        y = rng.integers(0, 2, n)
        pred = y.copy()
        mask = a == 1
        pred[mask] = rng.integers(0, 2, mask.sum())
        df = pd.DataFrame({"pred": pred, "y": y, "A": a})
        res = sp.equalized_odds(df, predictions="pred", labels="y", protected="A")
        assert res.value == pytest.approx(_hand_eo_gap(pred, y, a), abs=1e-9)
        assert res.passes is False  # gap >> threshold 0.1


# ---------------------------------------------------------------------------
# sp.fairness_audit
# ---------------------------------------------------------------------------
class TestFairnessAuditAnalytic:

    def test_audit_equalized_odds_matches_direct_call(self):
        rng = np.random.default_rng(1)
        n = 3000
        a = rng.integers(0, 2, n)
        y = rng.integers(0, 2, n)
        pred = y.copy()
        pred[a == 1] = rng.integers(0, 2, (a == 1).sum())
        df = pd.DataFrame({"pred": pred, "y": y, "A": a})
        audit = sp.fairness_audit(df, predictions="pred", protected="A", labels="y")
        direct = sp.equalized_odds(df, predictions="pred", labels="y", protected="A")
        assert audit.equalized_odds.value == pytest.approx(direct.value, abs=1e-12)

    def test_demographic_parity_small_when_independent(self):
        # pred == y with y drawn independently of A -> P(pred=1|A) is the same
        # across groups up to sampling noise -> demographic parity ~ 0.
        rng = np.random.default_rng(2)
        n = 5000
        a = rng.integers(0, 2, n)
        y = rng.integers(0, 2, n)
        df = pd.DataFrame({"pred": y.copy(), "y": y, "A": a})
        audit = sp.fairness_audit(df, predictions="pred", protected="A", labels="y")
        assert abs(audit.demographic_parity.value) < 0.05
