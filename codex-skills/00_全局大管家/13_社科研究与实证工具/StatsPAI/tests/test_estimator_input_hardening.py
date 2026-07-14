"""Fail-loud input validation across the 2026-06 estimator-hardening sweep.

Five estimators that had been exposed to the registry but never hardened were
returning **silent wrong answers** or **cryptic third-party errors** on
malformed input (design principle 7 forbids both):

* `sp.its` — bare `KeyError` on a typo'd column; **silent 0.0 / NaN** on
  empty, single-row, or all-NaN series.
* `sp.overlap_weighted_did` — **silent `estimate=0.0`** on an all-NaN
  outcome (the weighted cell mean NaN-sums to zero).
* `sp.dl_propensity_score` — cryptic `KeyError` on a typo'd column;
  **silent `[0.02]`** degenerate score on a single row.
* `sp.shift_share_political` — **silent `estimate=nan`** on an all-NaN
  outcome (its panel sibling already guarded this).
* `sp.rosenbaum_bounds` / `sp.rosenbaum_gamma` — cryptic pandas `KeyError`
  on a missing column in the DataFrame interface.

Every malformed input now raises a `StatsPAIError` subclass (`DataInsufficient`
/ `NumericalInstability`, both also `ValueError`); the happy-path numerics are
unchanged.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

import statspai as sp
from statspai.exceptions import DataInsufficient, StatsPAIError


# --------------------------------------------------------------------------- #
# its
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="module")
def its_data():
    rng = np.random.default_rng(0)
    n = 60
    t = np.arange(n)
    y = 1.0 + 0.1 * t + (t >= 30) * 3.0 + rng.normal(size=n)
    return pd.DataFrame({"y": y, "period": t})


class TestITS:
    def test_happy_path_recovers_level_change(self, its_data):
        r = sp.its(its_data, y="y", time="period", intervention=30)
        assert abs(r.level_change - 3.0) < 1.0  # known DGP jump

    def test_missing_column_raises(self, its_data):
        with pytest.raises(StatsPAIError):
            sp.its(its_data, y="NOPE", time="period", intervention=30)

    def test_empty_raises(self, its_data):
        with pytest.raises(DataInsufficient):
            sp.its(its_data.iloc[:0], y="y", intervention=1)

    def test_single_row_raises(self, its_data):
        with pytest.raises(DataInsufficient):
            sp.its(its_data.iloc[:1], y="y", intervention=0)

    def test_all_nan_raises(self, its_data):
        with pytest.raises(DataInsufficient):
            sp.its(its_data.assign(y=np.nan), y="y", time="period", intervention=30)

    def test_intervention_out_of_range_raises(self, its_data):
        with pytest.raises(DataInsufficient):
            sp.its(its_data, y="y", time="period", intervention=len(its_data))


# --------------------------------------------------------------------------- #
# overlap_weighted_did
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="module")
def did_data():
    rng = np.random.default_rng(0)
    rows = []
    for u in range(200):
        tr = int(rng.uniform() < 0.5)
        for tm in (0, 1):
            rows.append(
                dict(unit=u, treat=tr, time=tm, y=1.0 + 1.5 * tr * tm + rng.normal())
            )
    return pd.DataFrame(rows)


class TestOverlapWeightedDID:
    def test_happy_path_runs(self, did_data):
        r = sp.overlap_weighted_did(did_data, y="y", treat="treat", time="time")
        assert np.isfinite(r.estimate)

    def test_all_nan_outcome_raises_not_silent_zero(self, did_data):
        # Previously returned estimate=0.0 with no warning.
        with pytest.raises(DataInsufficient):
            sp.overlap_weighted_did(
                did_data.assign(y=np.nan), y="y", treat="treat", time="time"
            )

    def test_empty_raises(self, did_data):
        with pytest.raises(DataInsufficient):
            sp.overlap_weighted_did(
                did_data.iloc[:0], y="y", treat="treat", time="time"
            )


# --------------------------------------------------------------------------- #
# dl_propensity_score
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="module")
def ps_data():
    rng = np.random.default_rng(0)
    n = 200
    return pd.DataFrame(
        {"treat": (rng.uniform(size=n) < 0.5).astype(int), "x": rng.normal(size=n)}
    )


class TestDLPropensityScore:
    def test_happy_path_row_aligned_and_clipped(self, ps_data):
        e = sp.dl_propensity_score(ps_data, treatment="treat", covariates=["x"])
        assert e.shape == (len(ps_data),)  # row-aligned: no dropna
        assert (e >= 0.02 - 1e-9).all() and (e <= 0.98 + 1e-9).all()

    def test_missing_column_raises_not_keyerror(self, ps_data):
        with pytest.raises(StatsPAIError):
            sp.dl_propensity_score(ps_data, treatment="NOPE", covariates=["x"])

    def test_single_row_raises_not_silent(self, ps_data):
        with pytest.raises(DataInsufficient):
            sp.dl_propensity_score(
                ps_data.iloc[:1], treatment="treat", covariates=["x"]
            )

    def test_single_treatment_class_raises(self, ps_data):
        one_class = ps_data.assign(treat=1)
        with pytest.raises(DataInsufficient):
            sp.dl_propensity_score(one_class, treatment="treat", covariates=["x"])


# --------------------------------------------------------------------------- #
# rosenbaum_bounds / rosenbaum_gamma
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="module")
def pair_data():
    rng = np.random.default_rng(0)
    return pd.DataFrame(
        {
            "y": rng.normal(size=100),
            "tr": np.tile([0, 1], 50),
            "pid": np.repeat(np.arange(50), 2),
        }
    )


class TestRosenbaum:
    def test_happy_path_runs(self, pair_data):
        r = sp.rosenbaum_bounds(data=pair_data, y="y", treat="tr", pair_id="pid")
        assert np.isfinite(r.gamma_critical) or r.gamma_critical == np.inf

    @pytest.mark.parametrize("fn", ["rosenbaum_bounds", "rosenbaum_gamma"])
    def test_missing_column_raises_not_keyerror(self, fn, pair_data):
        with pytest.raises(ValueError, match="not found"):
            getattr(sp, fn)(data=pair_data, y="NOPE", treat="tr", pair_id="pid")


# --------------------------------------------------------------------------- #
# shift_share_political
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="module")
def shiftshare():
    """Minimal Bartik panel: y driven by a shift-share instrument."""
    rng = np.random.default_rng(0)
    units, K, periods = 60, 4, 3
    shares_arr = rng.dirichlet(np.ones(K), size=units)
    shares = pd.DataFrame(
        shares_arr, index=range(units), columns=[f"ind{k}" for k in range(K)]
    )
    shocks = pd.Series(rng.normal(size=K), index=[f"ind{k}" for k in range(K)])
    ssiv = shares_arr @ shocks.to_numpy()
    rows = []
    for u in range(units):
        for t in range(periods):
            d = ssiv[u] + rng.normal(scale=0.3)
            rows.append(dict(unit=u, time=t, d=d, y=1.0 * d + rng.normal(scale=0.3)))
    return pd.DataFrame(rows), shares, shocks


def _ssp(data, shares, shocks):
    return sp.shift_share_political(
        data,
        unit="unit",
        time="time",
        outcome="y",
        endog="d",
        shares=shares,
        shocks=shocks,
        leave_one_out=False,
    )


class TestShiftSharePolitical:
    def test_happy_path_runs(self, shiftshare):
        data, shares, shocks = shiftshare
        assert np.isfinite(_ssp(data, shares, shocks).estimate)

    def test_all_nan_outcome_raises_not_silent_nan(self, shiftshare):
        # Previously flowed through the IV and returned estimate=nan silently.
        data, shares, shocks = shiftshare
        with pytest.raises(StatsPAIError):
            _ssp(data.assign(y=np.nan), shares, shocks)


# --------------------------------------------------------------------------- #
# Clear (not cryptic / mislabelled) outcome errors: ltmle + bcf family.
# These already failed loudly but with a confusing message ("Treatment must be
# binary" / a raw sklearn "Input y contains NaN"); the all-NaN outcome now
# raises an error that names the *outcome*. The probes fail fast (before any
# model fit), so they stay cheap despite the bcf MCMC happy path.
# --------------------------------------------------------------------------- #
class TestOutcomeNaNMessages:
    def test_ltmle_all_nan_outcome(self):
        rng = np.random.default_rng(0)
        n = 200
        df = pd.DataFrame(
            dict(
                y=np.nan,
                a0=(rng.uniform(size=n) < 0.5).astype(int),
                l0=rng.normal(size=n),
            )
        )
        with pytest.raises(DataInsufficient, match="outcome"):
            sp.ltmle(df, y="y", treatments=["a0"], covariates_time=[["l0"]])

    def test_bcf_ordinal_all_nan_outcome(self):
        rng = np.random.default_rng(0)
        n = 200
        df = pd.DataFrame(dict(y=np.nan, t=rng.integers(0, 3, n), x=rng.normal(size=n)))
        with pytest.raises(DataInsufficient, match="outcome"):
            sp.bcf_ordinal(df, y="y", treat="t", covariates=["x"])

    def test_bcf_factor_exposure_all_nan_outcome(self):
        rng = np.random.default_rng(0)
        n = 200
        df = pd.DataFrame(
            dict(
                y=np.nan,
                e1=rng.normal(size=n),
                e2=rng.normal(size=n),
                x=rng.normal(size=n),
            )
        )
        with pytest.raises(ValueError, match="outcome"):
            sp.bcf_factor_exposure(df, y="y", exposures=["e1", "e2"], covariates=["x"])

    def test_bcf_longitudinal_all_nan_outcome(self):
        rng = np.random.default_rng(0)
        n = 200
        df = pd.DataFrame(
            dict(
                y=np.nan,
                d=rng.integers(0, 2, n),
                unit=np.tile(np.arange(n // 4), 4)[:n],
                time=np.repeat(np.arange(4), n // 4)[:n],
                x=rng.normal(size=n),
            )
        )
        with pytest.raises(ValueError, match="outcome"):
            sp.bcf_longitudinal(
                df,
                outcome="y",
                treatment="d",
                unit="unit",
                time="time",
                covariates=["x"],
            )


# --------------------------------------------------------------------------- #
# synth_experimental_design: a collapsed / unbalanced panel used to surface a
# misleading "k must be in [1, -1]" message; it now names the real problem.
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="module")
def synth_panel():
    rng = np.random.default_rng(0)
    return pd.DataFrame(
        [dict(unit=u, time=t, y=rng.normal()) for u in range(8) for t in range(6)]
    )


class TestSynthExperimentalDesign:
    def test_happy_path_selects_units(self, synth_panel):
        r = sp.synth_experimental_design(
            synth_panel, unit="unit", time="time", outcome="y", k=3
        )
        assert len(r.selected) == 3
        assert np.isfinite(r.expected_variance)

    def test_empty_panel_raises_clear(self, synth_panel):
        with pytest.raises(DataInsufficient, match="collapsed"):
            sp.synth_experimental_design(
                synth_panel.iloc[:0], unit="unit", time="time", outcome="y", k=3
            )

    def test_all_nan_panel_raises_clear(self, synth_panel):
        with pytest.raises(DataInsufficient, match="collapsed"):
            sp.synth_experimental_design(
                synth_panel.assign(y=np.nan),
                unit="unit",
                time="time",
                outcome="y",
                k=3,
            )

    def test_missing_column_raises(self, synth_panel):
        with pytest.raises(StatsPAIError):
            sp.synth_experimental_design(
                synth_panel.rename(columns={"y": "z"}),
                unit="unit",
                time="time",
                outcome="y",
                k=3,
            )

    def test_unbalanced_panel_raises_clear(self, synth_panel):
        unbalanced = synth_panel.copy()
        unbalanced.loc[3, "y"] = np.nan
        with pytest.raises(DataInsufficient, match="unbalanced"):
            sp.synth_experimental_design(
                unbalanced, unit="unit", time="time", outcome="y", k=3
            )
