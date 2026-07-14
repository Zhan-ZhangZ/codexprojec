"""Coverage for previously-untested partial-identification and diagnostic
helpers: ``sp.attrition_bounds`` (Lee bounds), ``sp.breakdown_frontier``,
``sp.moran_residuals`` and ``sp.propensity_score``.

Assertions are restricted to laws that hold regardless of the random draw —
bounds bracketing/widening, a spatial field producing positive Moran's I,
and propensity scores being monotone in the treatment-driving covariate —
so the tests are deterministic in spirit even where the data is simulated.
"""

import numpy as np
import pandas as pd
import pytest

import statspai as sp


# --------------------------------------------------------------------------
# attrition_bounds — Lee (2009) trimming bounds
# --------------------------------------------------------------------------
def test_attrition_bounds_bracket_and_report_attrition():
    rng = np.random.RandomState(2)
    n = 400
    df = pd.DataFrame({"y": rng.randn(n), "t": rng.binomial(1, 0.5, n)})
    df["obs"] = rng.binomial(1, 0.85, n)
    df.loc[df["obs"] == 0, "y"] = np.nan

    res = sp.attrition_bounds(df, "y", "t", observed="obs")
    assert res["lower_bound"] <= res["upper_bound"]
    # Lee bounds must bracket the naive complete-case ATE (the identity the
    # docstring doctest pins): lower <= naive <= upper.
    assert res["lower_bound"] <= res["naive_ate"] <= res["upper_bound"]
    assert np.isfinite(res["lower_bound"]) and np.isfinite(res["upper_bound"])
    assert res["method"] == "lee"
    # Reported attrition rate equals the share of unobserved outcomes.
    assert res["attrition_rate"] == pytest.approx(1 - df["obs"].mean(), abs=1e-9)
    assert res["n_total"] == n
    # Observed count == number of non-missing outcomes; attrited = total - obs.
    assert res["n_obs"] == int(df["obs"].sum())
    assert res["n_total"] - res["n_obs"] == int((df["obs"] == 0).sum())
    # y and t are drawn independently => true effect is ~0; the identified set
    # is far from any large spurious effect.  Generous band, not a point pin.
    assert abs(res["naive_ate"]) < 1.0


def test_no_attrition_collapses_the_bounds():
    rng = np.random.RandomState(3)
    n = 300
    df = pd.DataFrame(
        {
            "y": rng.randn(n),
            "t": rng.binomial(1, 0.5, n),
            "obs": np.ones(n, dtype=int),
        }
    )
    res = sp.attrition_bounds(df, "y", "t", observed="obs")
    # With nobody missing, Lee bounds are point-identified: lower == upper,
    # and both collapse onto the naive complete-case ATE.
    assert res["lower_bound"] == pytest.approx(res["upper_bound"], abs=1e-9)
    assert res["lower_bound"] == pytest.approx(res["naive_ate"], abs=1e-9)
    assert res["upper_bound"] == pytest.approx(res["naive_ate"], abs=1e-9)
    assert res["attrition_rate"] == pytest.approx(0.0, abs=1e-12)
    # Nobody attrited => every unit is observed.
    assert res["n_total"] == n
    assert res["n_obs"] == n


# --------------------------------------------------------------------------
# breakdown_frontier — sensitivity bounds
# --------------------------------------------------------------------------
def test_breakdown_frontier_widens_with_violation():
    narrow = sp.breakdown_frontier(estimate=0.5, se=0.1, max_violation=0.1)
    wide = sp.breakdown_frontier(estimate=0.5, se=0.1, max_violation=0.5)
    assert narrow.lower <= narrow.upper
    assert wide.lower <= wide.upper
    assert narrow.width < wide.width
    # Identified set is the closed-form linear-violation interval
    # [estimate - c, estimate + c]; pin it exactly.
    assert narrow.lower == pytest.approx(0.5 - 0.1)
    assert narrow.upper == pytest.approx(0.5 + 0.1)
    assert wide.lower == pytest.approx(0.5 - 0.5)
    assert wide.upper == pytest.approx(0.5 + 0.5)
    # Width == 2 * max_violation for each; wide is 5x the narrow span.
    assert narrow.width == pytest.approx(0.2)
    assert wide.width == pytest.approx(1.0)
    assert wide.width == pytest.approx(5 * narrow.width)


def test_breakdown_frontier_brackets_the_estimate():
    b = sp.breakdown_frontier(estimate=0.5, se=0.1, max_violation=0.2)
    assert b.lower <= 0.5 <= b.upper
    # Closed-form interval [0.5 - 0.2, 0.5 + 0.2], symmetric about the estimate.
    assert b.lower == pytest.approx(0.3)
    assert b.upper == pytest.approx(0.7)
    assert (b.lower + b.upper) / 2 == pytest.approx(0.5)
    # Breakdown point for a sign conclusion is |estimate|; here the set still
    # excludes zero at max_violation=0.2 < 0.5, so the sign is robust.
    assert b.model_info["breakdown_point"] == pytest.approx(0.5)
    assert b.lower > 0.0
    assert b.model_info["robust_at_max_violation"] is True


# --------------------------------------------------------------------------
# moran_residuals — spatial autocorrelation of residuals
# --------------------------------------------------------------------------
def _ring_W(n):
    W = np.zeros((n, n))
    for i in range(n - 1):
        W[i, i + 1] = W[i + 1, i] = 1.0
    W[0, n - 1] = W[n - 1, 0] = 1.0
    return W


def test_moran_detects_spatial_structure():
    n = 40
    # A smooth field over the ring is strongly positively autocorrelated.
    smooth = np.sin(2 * np.pi * np.arange(n) / n)
    I, p = sp.moran_residuals(smooth, _ring_W(n))
    assert I > 0.0
    assert 0.0 <= p <= 1.0
    assert p < 0.05  # smooth field -> significant positive autocorrelation
    # A sinusoid on the ring is near-perfectly autocorrelated (neighbours are
    # almost identical), so Moran's I must be close to its +1 ceiling.
    # Deterministic field -> robust lower band, well above the noise regime.
    assert I > 0.9
    assert I <= 1.0 + 1e-8


def test_moran_returns_finite_statistic_for_noise():
    rng = np.random.RandomState(7)
    n = 40
    I, p = sp.moran_residuals(rng.randn(n), _ring_W(n))
    assert np.isfinite(I)
    assert 0.0 <= p <= 1.0
    # Moran's I for a connected graph lives in roughly [-1, 1]; white noise
    # must stay well clear of the strong-autocorrelation regime (smooth field
    # gives ~0.99).  Generous bound, not a point pin.
    assert -1.5 < I < 0.5
    # Pure noise on this fixed seed is not significantly autocorrelated.
    assert p > 0.05


# --------------------------------------------------------------------------
# propensity_score
# --------------------------------------------------------------------------
def test_propensity_scores_are_probabilities_and_monotone():
    rng = np.random.RandomState(5)
    n = 500
    df = pd.DataFrame({"x": rng.randn(n)})
    df["t"] = (df["x"] + 0.5 * rng.randn(n) > 0).astype(int)
    ps = sp.propensity_score(df, "t", ["x"])
    assert len(ps) == n
    assert float(ps.min()) > 0.0 and float(ps.max()) < 1.0
    assert np.all(np.isfinite(ps.values))
    # Logit scores are a strictly increasing function of the single covariate
    # x, so the rank correlation is exactly +1 (deterministic by construction).
    from scipy.stats import spearmanr

    assert spearmanr(ps.values, df["x"].values).correlation == pytest.approx(1.0)
    # Logit MLE property: the mean fitted score equals the empirical treated
    # share (score equation for the intercept).
    assert float(ps.mean()) == pytest.approx(float(df["t"].mean()), abs=1e-3)
    # Treatment is driven by x, so treated units carry higher average scores.
    assert ps[df["t"] == 1].mean() > ps[df["t"] == 0].mean()
