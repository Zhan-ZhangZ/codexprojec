"""Coverage campaign — DML diagnostics, sensitivity, model averaging, panel.

Part of the core-module ≥95% coverage initiative
(see ``.coverage_campaign/CAMPAIGN.md``). Drives the four largest dml gap files
via their public entry points: ``sp.dml_diagnostics`` (``dml/_diagnostics.py``),
``sp.dml_sensitivity`` (``dml/_sensitivity.py``), ``sp.dml_model_averaging``
(``dml/model_averaging.py``), and ``sp.dml_panel`` (``dml/panel_dml.py``).

Assertions are real: the DML point estimate recovers the true effect (=2), the
diagnostics expose finite propensity-overlap / nuisance-R² numbers, and the
robustness-value sensitivity is in [0, 1].
"""

from __future__ import annotations

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import pytest  # noqa: E402

import statspai as sp  # noqa: E402


@pytest.fixture(scope="module")
def plr_data():
    """Partially-linear DGP, continuous treatment, true effect = 2."""
    rng = np.random.default_rng(0)
    n, p = 500, 5
    X = rng.standard_normal((n, p))
    g = X @ rng.standard_normal(p) * 0.3
    d = g + rng.standard_normal(n)
    y = 2.0 * d + g + rng.standard_normal(n)
    df = pd.DataFrame(X, columns=[f"x{i}" for i in range(p)])
    df["d"] = d
    df["y"] = y
    return df, [f"x{i}" for i in range(p)]


@pytest.fixture(scope="module")
def irm_data():
    """Binary treatment DGP for IRM (interactive regression model)."""
    rng = np.random.default_rng(1)
    n, p = 600, 5
    X = rng.standard_normal((n, p))
    ps = 1.0 / (1.0 + np.exp(-(X @ rng.standard_normal(p) * 0.5)))
    d = (rng.uniform(size=n) < ps).astype(float)
    y = 2.0 * d + X @ rng.standard_normal(p) * 0.3 + rng.standard_normal(n)
    df = pd.DataFrame(X, columns=[f"x{i}" for i in range(p)])
    df["d"] = d
    df["y"] = y
    return df, [f"x{i}" for i in range(p)]


@pytest.fixture(scope="module")
def plr_result(plr_data):
    df, X = plr_data
    return sp.dml(df, y="y", d="d", X=X, model_y="rf", model_d="rf", n_folds=3)


@pytest.fixture(scope="module")
def irm_result(irm_data):
    df, X = irm_data
    return sp.dml(
        df,
        y="y",
        d="d",
        X=X,
        model_y="rf",
        model_d="rf",
        model="IRM",
        n_folds=3,
    )


# ─── diagnostics ─────────────────────────────────────────────────────────


def test_dml_diagnostics_summary(plr_result):
    diag = sp.dml_diagnostics(plr_result)
    s = diag.summary()
    assert isinstance(s, str) and len(s) > 0
    # Diagnostics must echo a finite point estimate / SE consistent with the fit
    # (true effect = 2; recover within a generous band) and finite score moments.
    assert np.isfinite(diag.estimate) and abs(diag.estimate - 2.0) < 0.5
    assert np.isfinite(diag.se) and 0.0 < diag.se < 1.0
    # Neyman-orthogonal score is mean-zero by construction; sd strictly positive.
    assert abs(diag.score_mean) < 1e-6
    assert np.isfinite(diag.score_sd) and diag.score_sd > 0.0
    assert all(np.isfinite(v) for v in (diag.score_skew, diag.score_kurtosis))
    # n_obs matches the PLR fixture (n = 500).
    assert diag.n_obs == 500


def test_dml_diagnostics_plot(irm_result):
    diag = sp.dml_diagnostics(irm_result, clip=0.05)
    out = diag.plot()
    # plot() returns (fig, axes); both must be real matplotlib objects.
    assert isinstance(out, tuple) and len(out) == 2
    fig, axes = out
    assert isinstance(fig, plt.Figure)
    assert len(np.ravel(axes)) >= 1
    # Overlap table is a monotone set of propensity quantiles in [0, 1].
    ot = diag.overlap_table
    vals = ot["value"].to_numpy(dtype=float)
    assert np.all((vals >= 0.0) & (vals <= 1.0))
    assert np.all(np.diff(vals) >= 0.0)  # min ≤ p1 ≤ … ≤ max
    # Clip counts are non-negative and cannot exceed the sample.
    assert 0 <= diag.n_clipped_low <= diag.n_obs
    assert 0 <= diag.n_clipped_high <= diag.n_obs
    assert diag.n_obs == 600  # IRM fixture size
    plt.close("all")


# ─── sensitivity ─────────────────────────────────────────────────────────


def test_dml_sensitivity_basic(plr_result):
    sens = sp.dml_sensitivity(plr_result, cf_y=0.03, cf_d=0.03)
    # Point estimate carried through unchanged; true effect = 2 recovered.
    assert np.isfinite(sens.estimate) and abs(sens.estimate - 2.0) < 0.5
    assert abs(sens.estimate - plr_result.estimate) < 1e-9
    # Confounding-strength inputs echoed back.
    assert sens.cf_y == 0.03 and sens.cf_d == 0.03
    # CCN-2022 OVB: adjusted bounds bracket the point estimate, bias_bound ≥ 0.
    assert sens.adjusted_estimate_low <= sens.estimate <= sens.adjusted_estimate_high
    assert np.isfinite(sens.bias_bound) and sens.bias_bound >= 0.0
    # Half-width of the adjustment interval equals the bias bound (symmetry).
    half = 0.5 * (sens.adjusted_estimate_high - sens.adjusted_estimate_low)
    assert abs(half - sens.bias_bound) < 1e-8
    # Robustness values are valid partial-R² shares in [0, 1].
    for rv in (sens.rv_q, sens.rv_qa):
        assert np.isfinite(rv) and 0.0 <= rv <= 1.0
    assert np.isfinite(sens.se) and sens.se > 0.0


def test_dml_sensitivity_with_benchmark(plr_result, plr_data):
    _, X = plr_data
    sens = sp.dml_sensitivity(plr_result, benchmark_covariates=[X[0]], k_y=1.0, k_d=1.0)
    assert np.isfinite(sens.estimate) and abs(sens.estimate - 2.0) < 0.5
    # Robustness values remain valid [0, 1] partial-R² shares.
    for rv in (sens.rv_q, sens.rv_qa):
        assert np.isfinite(rv) and 0.0 <= rv <= 1.0
    # Benchmark table has exactly one row (single covariate) with the expected schema.
    bench = sens.benchmarks
    assert list(bench["variable"]) == [X[0]]
    assert len(bench) == 1
    row = bench.iloc[0]
    assert row["k_y"] == 1.0 and row["k_d"] == 1.0
    # Per-benchmark bias bound is finite ≥ 0 and brackets the estimate.
    assert np.isfinite(row["bias_bound"]) and row["bias_bound"] >= 0.0
    assert row["adjusted_low"] <= sens.estimate <= row["adjusted_high"]


# ─── model averaging ─────────────────────────────────────────────────────


def test_dml_model_averaging(plr_data):
    df, X = plr_data
    res = sp.dml_model_averaging(df, y="y", treat="d", covariates=X, n_folds=3, seed=0)
    assert res is not None
    coef = float(getattr(res, "coef", getattr(res, "estimate", np.nan)))
    assert np.isfinite(coef)
    assert abs(coef - 2.0) < 1.0
    # SE finite & positive; Wald CI is ordered and brackets the point estimate.
    assert np.isfinite(res.se) and res.se > 0.0
    lo, hi = res.ci
    assert lo < hi and lo <= coef <= hi
    # Averaged estimate must lie within the convex hull of per-candidate thetas.
    theta_k = res.diagnostics["theta_k"]
    weights = res.diagnostics["weights"]
    assert min(theta_k.values()) <= coef <= max(theta_k.values())
    # Model weights form a convex combination (non-negative, sum to 1).
    w = np.array(list(weights.values()), dtype=float)
    assert np.all(w >= -1e-9) and abs(w.sum() - 1.0) < 1e-6
    assert set(theta_k) == set(weights)  # same candidate keys
    assert res.n_obs == len(df)


# ─── panel DML ───────────────────────────────────────────────────────────


def test_dml_panel(plr_data):
    from sklearn.ensemble import RandomForestRegressor

    df, X = plr_data
    n = len(df)
    df = df.copy()
    df["unit"] = np.repeat(np.arange(n // 4), 4)[:n]
    df["time"] = np.tile(np.arange(4), n // 4 + 1)[:n]
    rf = RandomForestRegressor(n_estimators=50, random_state=0)
    res = sp.dml_panel(
        df,
        y="y",
        treat="d",
        covariates=X,
        unit="unit",
        time="time",
        ml_g=rf,
        ml_m=rf,
        n_folds=3,
    )
    assert res is not None
    coef = float(getattr(res, "coef", getattr(res, "estimate", np.nan)))
    assert np.isfinite(coef)
    # True effect = 2 (DGP y = 2*d + g + noise); recover within a generous band.
    assert abs(coef - 2.0) < 0.5
    # SE finite & positive; Wald CI ordered and brackets the estimate.
    assert np.isfinite(res.se) and res.se > 0.0
    assert res.ci_lower < res.ci_upper
    assert res.ci_lower <= coef <= res.ci_upper
    # t-stat is internally consistent with estimate / SE; p-value a valid prob.
    assert abs(res.t_stat - coef / res.se) < 1e-6
    assert 0.0 <= res.p_value <= 1.0
    # Panel bookkeeping: 500 obs over 125 units (4 periods each), 3 folds.
    assert res.n_obs == 500
    assert res.n_units == 125
    assert res.n_folds == 3
