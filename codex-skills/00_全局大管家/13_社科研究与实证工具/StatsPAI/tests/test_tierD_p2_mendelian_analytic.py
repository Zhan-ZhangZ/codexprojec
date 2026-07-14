"""Tier D P2 known-truth upgrades — Mendelian randomization instrument checks.

Part of the P1/P2 "Tier D analytic special-cases" campaign (see
``.tierd_campaign/CAMPAIGN.md``). Both were graded ``weak`` by
``scripts/tierd_classify.py``. Each is an exact closed form on summary
statistics:

    sp.mr_f_statistic  per-SNP F = (beta / se)^2 (Staiger-Stock weak-IV flag <10).
    sp.mr_steiger      direction supported iff R^2_exposure > R^2_outcome
                       (Hemani et al. 2017).

Purely additive — no estimator numerics changed (campaign red line).
"""

import numpy as np
import pytest

import statspai as sp


# ---------------------------------------------------------------------------
# sp.mr_f_statistic
# ---------------------------------------------------------------------------
class TestMRFStatisticAnalytic:

    def test_per_snp_f_is_squared_t_ratio(self):
        beta = np.array([0.30, 0.25, 0.40, 0.05])
        se = np.array([0.03, 0.05, 0.02, 0.04])
        res = sp.mr_f_statistic(beta, se)
        np.testing.assert_allclose(res.per_snp_F, (beta / se) ** 2, rtol=1e-9)
        assert res.f_max == pytest.approx(((beta / se) ** 2).max(), rel=1e-9)
        assert res.f_min == pytest.approx(((beta / se) ** 2).min(), rel=1e-9)

    def test_weak_instrument_flagged(self):
        # Last SNP: (0.05/0.04)^2 = 1.56 < 10 -> weak-IV risk.
        weak = sp.mr_f_statistic(np.array([0.30, 0.05]), np.array([0.03, 0.04]))
        assert weak.weak_instrument_risk is True
        # All SNPs strong (F >> 10) -> no weak-IV risk.
        strong = sp.mr_f_statistic(np.array([0.30, 0.40]), np.array([0.03, 0.02]))
        assert strong.weak_instrument_risk is False


# ---------------------------------------------------------------------------
# sp.mr_steiger
# ---------------------------------------------------------------------------
class TestMRSteigerAnalytic:

    @staticmethod
    def _manual_r2(beta, se, n):
        t2 = (beta / se) ** 2
        return float(np.sum(t2 / (t2 + n - 2)))

    def test_direction_supported_when_exposure_is_stronger(self):
        # SNPs strongly associated with the exposure, weakly with the outcome
        # -> R^2_exposure > R^2_outcome -> assumed direction is supported.
        be, see = np.array([0.40, 0.35, 0.45]), np.array([0.02, 0.02, 0.02])
        bo, seo = np.array([0.05, 0.04, 0.06]), np.array([0.03, 0.03, 0.03])
        res = sp.mr_steiger(be, see, 50000, bo, seo, 50000)
        np.testing.assert_allclose(res.r2_exposure, self._manual_r2(be, see, 50000))
        np.testing.assert_allclose(res.r2_outcome, self._manual_r2(bo, seo, 50000))
        assert res.r2_exposure > res.r2_outcome
        assert res.correct_direction is True

    def test_direction_rejected_when_outcome_is_stronger(self):
        # Swap the strengths: SNPs explain the outcome better than the exposure
        # -> the assumed exposure -> outcome direction is not supported.
        be, see = np.array([0.05, 0.04, 0.06]), np.array([0.03, 0.03, 0.03])
        bo, seo = np.array([0.40, 0.35, 0.45]), np.array([0.02, 0.02, 0.02])
        res = sp.mr_steiger(be, see, 50000, bo, seo, 50000)
        np.testing.assert_allclose(res.r2_exposure, self._manual_r2(be, see, 50000))
        np.testing.assert_allclose(res.r2_outcome, self._manual_r2(bo, seo, 50000))
        assert res.r2_exposure < res.r2_outcome
        assert res.correct_direction is False
