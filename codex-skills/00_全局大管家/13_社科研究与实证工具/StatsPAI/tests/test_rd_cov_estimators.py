"""Coverage campaign — RD estimator family (ML, HTE, 2D, multi-cutoff, …).

Part of the core-module ≥95% coverage initiative
(see ``.coverage_campaign/CAMPAIGN.md``). Drives the RD estimators left thinly
covered after the parallel agent's ``test_cov95_rd_*`` files: boosted/ML RD
(``rdml.py`` / ``rd_flex.py``), CATE/HTE summaries (``hte.py``), the dashboard
(``dashboard.py``), 2-D and multi-cutoff/multi-score designs (``rd2d.py`` /
``rdmulti.py``), local randomization (``locrand.py``), honest and bias-aware
CIs (``honest_ci.py`` / ``bias_aware.py``), and extrapolation
(``extrapolate.py``).

Smoke + structural assertions: each estimator returns a non-None result with a
finite effect / interval where one is exposed. Campaign-own ``test_rd_cov_*``
naming avoids colliding with the parallel ``test_cov95_rd_*`` files.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

import statspai as sp


@pytest.fixture(scope="module")
def sharp():
    rng = np.random.default_rng(0)
    n = 1500
    x = rng.uniform(-1, 1, n)
    y = 0.5 * x + 0.8 * (x >= 0) + rng.normal(0, 0.3, n)
    return pd.DataFrame(
        {"y": y, "x": x, "z": rng.normal(0, 1, n), "z2": rng.normal(0, 1, n)}
    )


@pytest.fixture(scope="module")
def fuzzy():
    rng = np.random.default_rng(11)
    n = 3000
    x = rng.uniform(-1, 1, n)
    prob = 0.3 + 0.4 * (x >= 0)
    d = (rng.uniform(0, 1, n) < prob).astype(float)
    y = 0.5 * x + 2.0 * d + rng.normal(0, 0.4, n)
    return pd.DataFrame({"y": y, "x": x, "d": d})


# ─── ML / boosted RD ─────────────────────────────────────────────────────


def test_rd_boost(sharp):
    res = sp.rd_boost(sharp, y="y", x="x", c=0.0, covs=["z", "z2"])
    assert res is not None
    # Sharp DGP: y = 0.5*x + 0.8*(x>=0) + N(0,0.3) -> true jump = +0.8.
    est = float(res.estimate)
    assert np.isfinite(est)
    assert est > 0  # DGP implies a positive discontinuity
    # Boosted RD trades a little bias for variance; pin within a generous band.
    assert 0.4 < est < 1.3
    assert np.isfinite(res.se) and res.se > 0
    assert 0.0 <= res.pvalue <= 1.0
    lo, hi = res.ci
    assert lo < hi
    assert lo <= est <= hi  # CI brackets the point estimate


def test_rd_flex(sharp):
    res = sp.rd_flex(sharp, y="y", x="x", c=0.0, W=["z", "z2"], learner="boost")
    assert res is not None
    # Noack-Olma-Rothe flexible covariate adjustment of the sharp RD (true = 0.8).
    est = float(res.estimate)
    assert np.isfinite(est)
    assert est > 0
    assert 0.4 < est < 1.3
    assert np.isfinite(res.se) and res.se > 0
    assert 0.0 <= res.pvalue <= 1.0
    lo, hi = res.ci
    assert lo < hi
    assert lo <= est <= hi


# ─── HTE / dashboard ─────────────────────────────────────────────────────


def test_rd_cate_summary(sharp):
    res = sp.rd_cate_summary(sharp, y="y", x="x", c=0.0, covs=["z", "z2"])
    assert res is not None
    assert isinstance(res, dict)
    # All three ML CATE summaries plus the comparison table and drivers map.
    for key in ("forest", "boost", "lasso", "comparison", "heterogeneity_drivers"):
        assert key in res
    # Each learner recovers the planted +0.8 sharp jump (band allows ML bias).
    for key in ("forest", "boost", "lasso"):
        est = float(res[key].estimate)
        assert np.isfinite(est)
        assert 0.4 < est < 1.3
    comp = res["comparison"]
    assert len(comp) == 3  # one row per learner
    assert set(["method", "estimate", "se", "ci_lower", "ci_upper"]).issubset(
        comp.columns
    )
    assert np.all(np.isfinite(comp["estimate"].to_numpy()))
    # heterogeneity_drivers are normalized importances over the two covariates.
    drivers = res["heterogeneity_drivers"]
    assert set(drivers) == {"z", "z2"}
    assert all(v >= 0 for v in drivers.values())
    assert abs(sum(drivers.values()) - 1.0) < 1e-6


def test_rd_dashboard(sharp):
    res = sp.rd_dashboard(sharp, y="y", x="x", c=0.0)
    assert res is not None
    # Returns (Figure, Axes-grid): a 2x2 panel of diagnostics.
    assert isinstance(res, tuple) and len(res) == 2
    fig, axes = res
    assert axes is not None
    assert np.asarray(axes).size == 4  # four diagnostic panels
    # The figure must carry the rendered axes.
    assert len(fig.axes) == 4


# ─── multi-cutoff / multi-score / 2-D ────────────────────────────────────


def test_rdmc_multi_cutoff():
    rng = np.random.default_rng(3)
    n = 2000
    x = rng.uniform(-1, 1, n)
    cut = np.where(rng.uniform(size=n) < 0.5, -0.3, 0.3)
    y = 0.5 * x + 0.8 * (x >= cut) + rng.normal(0, 0.3, n)
    df = pd.DataFrame({"y": y, "x": x, "cutoff": cut})
    res = sp.rdmc(df, y="y", x="x", cutoffs=[-0.3, 0.3])
    assert res is not None
    assert res.n_cutoffs == 2
    assert res.n_total == n
    assert len(res.cutoff_results) == 2
    # DGP plants a positive jump at each cutoff -> pooled effect is positive.
    pooled = float(res.pooled_estimate)
    assert np.isfinite(pooled)
    assert pooled > 0
    assert abs(pooled) < 100  # bounded / sane scale
    assert np.isfinite(res.pooled_se) and res.pooled_se > 0
    lo, hi = res.pooled_ci
    assert lo < hi
    assert lo <= pooled <= hi
    # Every per-cutoff fit recovers a finite, positive discontinuity.
    for cr in res.cutoff_results:
        assert np.isfinite(cr["estimate"])
        assert cr["estimate"] > 0
        assert cr["n"] > 0


def test_rd2d_boundary():
    rng = np.random.default_rng(4)
    n = 2500
    x1 = rng.uniform(-1, 1, n)
    x2 = rng.uniform(-1, 1, n)
    treat = ((x1 >= 0) | (x2 >= 0)).astype(int)
    y = 0.5 * x1 + 0.3 * x2 + 0.8 * treat + rng.normal(0, 0.3, n)
    df = pd.DataFrame({"y": y, "x1": x1, "x2": x2, "treat": treat})
    res = sp.rd2d(df, y="y", x1="x1", x2="x2", treatment="treat")
    assert res is not None
    # DGP plants +0.8*treat; the distance-based boundary effect averages along a
    # non-trivial frontier, so we check sign + a generous bounded band, not 0.8.
    est = float(res.estimate)
    assert np.isfinite(est)
    assert est > 0  # treatment raises y at the boundary
    assert 0.1 < est < 1.5
    assert np.isfinite(res.se) and res.se > 0
    assert 0.0 <= res.pvalue <= 1.0
    lo, hi = res.ci
    assert lo < hi
    assert lo <= est <= hi


# ─── local randomization ─────────────────────────────────────────────────


def test_rdrandinf(sharp):
    res = sp.rdrandinf(sharp, y="y", x="x", c=0.0, wl=-0.1, wr=0.1)
    assert res is not None
    # Local-randomization estimate of the sharp jump (true = +0.8). The narrow
    # window keeps bias low, so a moderately tight recovery band is warranted.
    est = float(res.estimate)
    assert np.isfinite(est)
    assert est > 0
    assert 0.4 < est < 1.2
    assert np.isfinite(res.se) and res.se > 0
    assert 0.0 <= res.pvalue <= 1.0
    lo, hi = res.ci
    assert lo < hi
    assert lo <= est <= hi


# ─── honest / bias-aware CIs ─────────────────────────────────────────────


def test_rd_honest(sharp):
    res = sp.rd_honest(sharp, y="y", x="x", c=0.0, M=2.0)
    assert res is not None
    # Armstrong-Kolesar honest CI for the sharp jump (true = +0.8).
    est = float(res.estimate)
    assert np.isfinite(est)
    assert est > 0
    assert 0.4 < est < 1.2
    assert np.isfinite(res.se) and res.se > 0
    assert 0.0 <= res.pvalue <= 1.0
    lo, hi = res.ci
    assert lo < hi
    # Honest (bias-aware) CIs are conservative -> they must bracket the estimate.
    assert lo <= est <= hi


def test_rd_bias_aware_fuzzy(fuzzy):
    res = sp.rd_bias_aware_fuzzy(fuzzy, y="y", x="x", fuzzy="d", c=0.0)
    assert res is not None
    # Fuzzy DGP: y = 0.5*x + 2.0*d, prob jump = 0.4 -> LATE = +2.0. First stage is
    # weak here (F~2), so the bias-aware Anderson-Rubin CI is intentionally wide;
    # check sign/scale on the point estimate and that the CI brackets the truth.
    est = float(res.estimate)
    assert np.isfinite(est)
    assert est > 0  # positive LATE
    assert abs(est) < 100  # bounded, not blown up
    assert np.isfinite(res.se) and res.se > 0
    assert 0.0 <= res.pvalue <= 1.0
    lo, hi = res.ci
    assert lo < hi
    assert lo <= 2.0 <= hi  # robust CI covers the planted LATE of 2.0


# ─── extrapolation ───────────────────────────────────────────────────────


def test_rd_extrapolate(sharp):
    # Angrist-Rokkanen extrapolation needs covariates (CIA: Y(d) ⊥ X | Z)
    res = sp.rd_extrapolate(sharp, y="y", x="x", c=0.0, covs=["z", "z2"])
    assert res is not None
    # Angrist-Rokkanen extrapolates the effect away from the cutoff, so the
    # estimand differs from the at-cutoff jump (0.8); only assert sign + a wide
    # bounded band and CI internal consistency.
    est = float(res.estimate)
    assert np.isfinite(est)
    assert est > 0  # extrapolated effect stays positive
    assert abs(est) < 100
    assert np.isfinite(res.se) and res.se > 0
    assert 0.0 <= res.pvalue <= 1.0
    lo, hi = res.ci
    assert lo < hi
    assert lo <= est <= hi
