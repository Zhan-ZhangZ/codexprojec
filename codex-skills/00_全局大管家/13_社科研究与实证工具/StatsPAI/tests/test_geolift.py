"""Tests for the geo-experiment design ``sp.geolift``.

geolift aggregates treated markets and builds a synthetic counterfactual from the
untreated markets via ``sp.synth``. Correctness is checked by recovering a known
lift on a simulated multi-market panel (treated markets kept inside the donor
convex hull); the rest locks in the design framing and the fail-loud contract.
"""

from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
import pytest

import statspai as sp


def _geo_panel(seed=3, n_geo=12, n_week=40, lift=5.0, treated=("g0", "g1", "g2")):
    rng = np.random.default_rng(seed)
    weeks = np.arange(n_week)
    common = np.sin(weeks / 5) * 3 + weeks * 0.2
    geos = [f"g{i}" for i in range(n_geo)]
    treated = list(treated)
    rows = []
    for g in geos:
        level = 50 + rng.normal(0, 3)  # shared level distribution -> inside hull
        base = level + common + rng.normal(0, 0.8, n_week)
        if g in treated:
            base = base + (weeks >= 30) * lift
        for w, val in zip(weeks, base):
            rows.append((g, w, val))
    return pd.DataFrame(rows, columns=["dma", "week", "sales"]), treated


def _fit(df, treated, **over):
    kwargs = dict(
        outcome="sales",
        geo="dma",
        time="week",
        treated_geos=treated,
        treatment_time=30,
    )
    kwargs.update(over)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        return sp.geolift(df, **kwargs)


def test_geolift_recovers_lift():
    df, treated = _geo_panel(lift=5.0)
    res = _fit(df, treated)
    assert res.estimand == "ATT"
    assert 3.5 < res.estimate < 6.5  # recovers +5
    assert "Geo-lift" in res.method


def test_geolift_model_info():
    df, treated = _geo_panel()
    res = _fit(df, treated)
    mi = res.model_info
    assert mi["design"] == "geo-lift"
    assert mi["treated_geos"] == treated
    assert mi["n_treated_geos"] == 3
    assert mi["n_control_geos"] == 9
    assert mi["relative_lift_pct"] is None or np.isfinite(mi["relative_lift_pct"])


def test_geolift_feeds_counterfactual_contract():
    df, treated = _geo_panel(lift=5.0)
    res = _fit(df, treated)
    data = sp.counterfactual_data(res)
    post_lift = data.loc[data["post"], "point_effect"].mean()
    assert abs(post_lift - res.estimate) < 0.5


def test_geolift_single_geo_scalar():
    df, _ = _geo_panel()
    res = _fit(df, "g0")  # scalar accepted
    assert res.model_info["n_treated_geos"] == 1
    assert np.isfinite(res.estimate)


def test_geolift_sum_aggregation():
    df, treated = _geo_panel()
    res = _fit(df, treated, agg="sum")
    assert res.model_info["agg"] == "sum"
    assert np.isfinite(res.estimate)


# --------------------------------------------------------------------- #
#  Validation
# --------------------------------------------------------------------- #
def test_geolift_unknown_geo_raises():
    df, _ = _geo_panel()
    with pytest.raises(ValueError, match="not found"):
        _fit(df, ["does_not_exist"])


def test_geolift_too_few_controls_raises():
    df, _ = _geo_panel(n_geo=4)
    with pytest.raises(ValueError, match="control"):
        _fit(df, ["g0", "g1", "g2"])  # only 1 control left


def test_geolift_bad_agg_raises():
    df, treated = _geo_panel()
    with pytest.raises(ValueError, match="agg"):
        _fit(df, treated, agg="median")


def test_geolift_missing_column_raises():
    df, treated = _geo_panel()
    with pytest.raises(ValueError, match="not found"):
        _fit(df, treated, outcome="revenue")


def test_geolift_export_and_registry():
    assert hasattr(sp, "geolift")
    names = [str(getattr(f, "name", f)) for f in sp.list_functions()]
    assert "geolift" in names
