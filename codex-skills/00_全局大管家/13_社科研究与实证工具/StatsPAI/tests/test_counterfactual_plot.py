"""Tests for the unified counterfactual contract (``sp.counterfactual_data`` /
``sp.counterfactual_plot``).

The contract normalises any observed-vs-counterfactual result — causal impact,
synthetic control, interrupted time series — into one tidy frame, then plots it.
These tests run against the *real* estimators (no mocked numerics) and assert the
definitional identity ``point_effect == observed - counterfactual`` plus the
recovery of known effects on simulated data.
"""

from __future__ import annotations

import matplotlib

matplotlib.use("Agg")  # headless backend for CI

import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import pytest  # noqa: E402

import statspai as sp  # noqa: E402

_REQUIRED = {"time", "observed", "counterfactual", "point_effect"}


# --------------------------------------------------------------------------
# fixtures: real estimator results
# --------------------------------------------------------------------------
def _its_result():
    rng = np.random.default_rng(0)
    t = np.arange(60)
    # true level change +3.0 at t=30 on a linear pre-trend
    y = 1 + 0.1 * t + (t >= 30) * 3.0 + rng.normal(scale=0.5, size=60)
    return sp.its(pd.DataFrame({"y": y, "t": t}), y="y", time="t", intervention=30)


def _causal_impact_result():
    rng = np.random.default_rng(1)
    t = np.arange(60)
    x = rng.normal(size=60).cumsum()  # control series
    y = 2 + 0.5 * x + rng.normal(scale=0.3, size=60)
    y[40:] += 5.0  # true post-intervention effect +5
    return sp.causal_impact(
        pd.DataFrame({"t": t, "y": y, "x": x}),
        y="y",
        time="t",
        intervention_time=40,
        covariates=["x"],
    )


def _synth_result():
    df = sp.california_prop99()
    return sp.synth(
        df,
        outcome="packspercapita",
        unit="state",
        time="year",
        treated_unit="California",
        treatment_time=1989,
        placebo=False,
    )


# --------------------------------------------------------------------------
# counterfactual_data — contract correctness
# --------------------------------------------------------------------------
@pytest.mark.parametrize("factory", [_its_result, _causal_impact_result, _synth_result])
def test_counterfactual_data_contract(factory):
    data = sp.counterfactual_data(factory())
    assert isinstance(data, pd.DataFrame)
    assert _REQUIRED.issubset(data.columns)
    # definitional identity holds for every supported design
    np.testing.assert_allclose(
        data["point_effect"], data["observed"] - data["counterfactual"]
    )
    assert "post" in data.columns
    assert data["post"].any() and not data["post"].all()


def test_its_recovers_level_change():
    data = sp.counterfactual_data(_its_result())
    pre = data.loc[~data["post"], "point_effect"].mean()
    post = data.loc[data["post"], "point_effect"].mean()
    assert abs(pre) < 0.3  # pre-period effect ~ noise
    assert 2.5 < post < 4.0  # recovers the +3 level change (plus slope drift)
    # pre-period counterfactual equals the fitted series (no jump removed)
    assert np.isfinite(data["cumulative_effect"]).any()


def test_causal_impact_has_bands_and_recovers_effect():
    data = sp.counterfactual_data(_causal_impact_result())
    assert {"cf_lower", "cf_upper", "effect_lower", "effect_upper"}.issubset(
        data.columns
    )
    # counterfactual band brackets the counterfactual line
    assert (data["cf_lower"] <= data["counterfactual"] + 1e-8).all()
    assert (data["cf_upper"] >= data["counterfactual"] - 1e-8).all()
    post = data.loc[data["post"], "point_effect"].mean()
    assert 4.0 < post < 6.0  # recovers the +5 effect


def test_cumulative_effect_is_post_period_running_sum():
    data = sp.counterfactual_data(_its_result())
    pre_cum = data.loc[~data["post"], "cumulative_effect"]
    assert pre_cum.isna().all()  # undefined before intervention
    post = data.loc[data["post"]].reset_index(drop=True)
    expected = np.cumsum(post["point_effect"].to_numpy())
    np.testing.assert_allclose(post["cumulative_effect"].to_numpy(), expected)


# --------------------------------------------------------------------------
# counterfactual_plot — figure structure
# --------------------------------------------------------------------------
def test_plot_returns_two_panel_figure():
    fig = sp.counterfactual_plot(_its_result())
    try:
        assert len(fig.axes) == 2  # trajectory + effect panels
        top = fig.axes[0]
        # observed + counterfactual lines at minimum
        assert len(top.get_lines()) >= 2
    finally:
        plt.close(fig)


def test_plot_single_axis_mode():
    fig, ax = plt.subplots()
    try:
        out = sp.counterfactual_plot(_its_result(), ax=ax, show_effect=False)
        assert out is fig  # draws into the supplied axis' figure
        assert len(fig.axes) == 1
    finally:
        plt.close(fig)


def test_plot_no_effect_panel():
    fig = sp.counterfactual_plot(_causal_impact_result(), show_effect=False)
    try:
        assert len(fig.axes) == 1
    finally:
        plt.close(fig)


# --------------------------------------------------------------------------
# error handling + discoverability
# --------------------------------------------------------------------------
def test_unsupported_result_raises_typeerror():
    with pytest.raises(TypeError, match="counterfactual"):
        sp.counterfactual_data(object())


def test_regress_result_is_unsupported():
    # a non-time-series causal result has no counterfactual trajectory
    rng = np.random.default_rng(2)
    df = pd.DataFrame({"y": rng.normal(size=50), "x": rng.normal(size=50)})
    res = sp.regress("y ~ x", data=df)
    with pytest.raises(TypeError):
        sp.counterfactual_data(res)


def test_public_api_exports():
    assert hasattr(sp, "counterfactual_data")
    assert hasattr(sp, "counterfactual_plot")
    names = [getattr(f, "name", f) for f in sp.list_functions()]
    names = [str(n) for n in names]
    assert "counterfactual_plot" in names
    assert "counterfactual_data" in names
