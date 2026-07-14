"""Tier D analytic special-case tests — boundary / multi-score RD aliases.

Part of the P1 "Tier D analytic special-cases" campaign (see
``.tierd_campaign/CAMPAIGN.md``). The three user-facing aliases were graded
``untested`` by ``scripts/tierd_classify.py`` (their *underlying* functions have
smoke tests, but the alias entry points had no numerical guard).

Anchors used:
- **Clean-boundary recovery.** On a half-plane boundary (treatment = x1>=0,
  jump = 0.8 constant along the whole evaluated boundary) the 2D estimators
  recover the jump, exactly as 1D ``sp.rdrobust`` does. (An L-shape / corner
  boundary instead averages over no-jump segments — a *correct* estimand
  property, not a bias — so we deliberately use a clean half-plane for recovery.)
- **Dispatch equivalence.** Each alias must return the identical numeric result
  as the validated underlying function it forwards to.
- **Monotone response.** A larger data-generating jump yields a larger estimate.

Entry points covered:
    sp.boundary_rd      -> sp.rd2d   (Cattaneo-Titiunik-Yu boundary RD)
    sp.geographic_rd    -> sp.rdms   (multi-score / geographic RD)
    sp.multi_score_rd   -> sp.rd_multi_score (all-scores-exceed RD)

Purely additive — no estimator numerics changed (campaign red line).
"""

import warnings

import numpy as np
import pandas as pd
import pytest

import statspai as sp


def _halfplane(seed=21, n=8000, jump=0.8):
    # Treatment depends only on x1 >= 0 (a vertical boundary), so the jump is
    # constant along the whole x1 = 0 boundary -> a clean 2D recovery target.
    rng = np.random.default_rng(seed)
    x1 = rng.uniform(-1, 1, n)
    x2 = rng.uniform(-1, 1, n)
    treat = (x1 >= 0).astype(int)
    y = 0.5 * x1 + 0.3 * x2 + jump * treat + rng.normal(0, 0.1, n)
    return pd.DataFrame({"y": y, "x1": x1, "x2": x2, "treat": treat})


class TestBoundaryRDAnalytic:

    def test_recovers_halfplane_jump(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            res = sp.boundary_rd(
                _halfplane(), y="y", x1="x1", x2="x2", treatment="treat"
            )
        assert float(res.estimate) == pytest.approx(0.8, abs=0.15)

    def test_alias_equals_rd2d(self):
        df = _halfplane()
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            a = sp.boundary_rd(df, y="y", x1="x1", x2="x2", treatment="treat")
            b = sp.rd2d(df, y="y", x1="x1", x2="x2", treatment="treat")
        assert float(a.estimate) == float(b.estimate)


class TestGeographicRDAnalytic:

    def test_recovers_halfplane_jump(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            res = sp.geographic_rd(
                _halfplane(),
                y="y",
                x1="x1",
                x2="x2",
                cutoff1=0.0,
                cutoff2=0.0,
                bandwidth=0.2,
            )
        assert float(res.estimate) == pytest.approx(0.8, abs=0.2)

    def test_alias_equals_rdms(self):
        df = _halfplane()
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            a = sp.geographic_rd(
                df, y="y", x1="x1", x2="x2", cutoff1=0.0, cutoff2=0.0, bandwidth=0.2
            )
            b = sp.rdms(
                df, y="y", x1="x1", x2="x2", cutoff1=0.0, cutoff2=0.0, bandwidth=0.2
            )
        assert float(a.estimate) == float(b.estimate)


class TestMultiScoreRDAnalytic:

    @staticmethod
    def _corner_dgp(seed, jump):
        # Treatment if BOTH scores exceed 0 (the all-scores-exceed rule).
        rng = np.random.default_rng(seed)
        n = 6000
        r1 = rng.uniform(-1, 1, n)
        r2 = rng.uniform(-1, 1, n)
        treat = ((r1 >= 0) & (r2 >= 0)).astype(int)
        y = 0.3 * r1 + 0.3 * r2 + jump * treat + rng.standard_normal(n) * 0.1
        return pd.DataFrame({"y": y, "r1": r1, "r2": r2})

    def test_alias_equals_rd_multi_score(self):
        df = self._corner_dgp(seed=11, jump=2.0)
        a = sp.multi_score_rd(
            df, y="y", running_vars=["r1", "r2"], cutoffs=[0.0, 0.0], bandwidth=0.3
        )
        b = sp.rd_multi_score(
            df, y="y", running_vars=["r1", "r2"], cutoffs=[0.0, 0.0], bandwidth=0.3
        )
        assert a.boundary_effect == b.boundary_effect

    def test_positive_effect_and_valid_share(self):
        df = self._corner_dgp(seed=11, jump=2.0)
        res = sp.multi_score_rd(
            df, y="y", running_vars=["r1", "r2"], cutoffs=[0.0, 0.0], bandwidth=0.3
        )
        assert res.boundary_effect > 0  # correct sign
        assert 0.0 <= res.boundary_share <= 1.0  # a genuine fraction

    def test_linear_in_true_jump(self):
        # The local-linear estimator is linear in the outcome, so scaling the
        # data-generating jump by 4 (with the same seed -> identical running
        # variables and noise) scales the estimated boundary effect by 4, even
        # though the absolute level is attenuated by the corner geometry.
        small = sp.multi_score_rd(
            self._corner_dgp(seed=3, jump=1.0),
            y="y",
            running_vars=["r1", "r2"],
            cutoffs=[0.0, 0.0],
            bandwidth=0.3,
        ).boundary_effect
        large = sp.multi_score_rd(
            self._corner_dgp(seed=3, jump=4.0),
            y="y",
            running_vars=["r1", "r2"],
            cutoffs=[0.0, 0.0],
            bandwidth=0.3,
        ).boundary_effect
        assert large == pytest.approx(4.0 * small, rel=0.1)
