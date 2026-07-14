"""Tier G — robustness tests for ``sp.panel`` (fixed effects).

Observed contract (StatsPAI 1.17.0 over linearmodels):

* **missing column** -> ``ValueError`` naming it.
* **inf in a regressor** -> ``ValueError`` ("must not contain infs or NaNs").
* **single time period** under entity FE -> ``AbsorbingEffectError`` (the FE
  fully explain the data).
* **time-invariant (between-only) regressor** -> ``AbsorbingEffectError`` — the
  meaningful "perfectly collinear with the fixed effects" guard.
* **NaN rows** -> ``MissingValueWarning`` + listwise drop, finite estimate.

Known robustness/UX gap (NOT a numerical bug; logged in
``.tier_eg_campaign/CAMPAIGN.md``): a *globally constant* regressor column is
passed straight through to linearmodels, which interprets an all-``c`` column
as the model intercept and reports ``coef = mean(y)/c`` with a (misleading)
significant t-stat, instead of flagging zero variance. The test below pins the
two acceptable outcomes (raise, or the documented intercept reinterpretation)
so that adding a zero-variance guard later is a deliberate, test-visible change.
"""

from __future__ import annotations

import warnings

import numpy as np
import pytest

import statspai as sp

from ._helpers import assert_raises_clean, coef, make_panel

pytest.importorskip("linearmodels")


def _df(seed=2):
    return make_panel(n_units=40, n_periods=6, seed=seed)


def _fit(data, *, formula="y ~ x", method="fe", **kw):
    return sp.panel(
        data=data,
        formula=formula,
        entity="unit",
        time="period",
        method=method,
        **kw,
    )


# --------------------------------------------------------------------------- #
# G8 — schema errors                                                          #
# --------------------------------------------------------------------------- #
def test_panel_missing_column_raises():
    assert_raises_clean(
        lambda: _fit(_df(), formula="y ~ qqq"),
        ValueError,
        KeyError,
        match="qqq|not found",
    )


# --------------------------------------------------------------------------- #
# G7 — inf in regressor                                                       #
# --------------------------------------------------------------------------- #
@pytest.mark.filterwarnings("ignore")
def test_panel_inf_regressor_raises():
    d = _df()
    d.loc[0, "x"] = np.inf
    assert_raises_clean(lambda: _fit(d), ValueError, match="inf|nan|finite")


# --------------------------------------------------------------------------- #
# G5 — single time period: FE absorb everything                               #
# --------------------------------------------------------------------------- #
def test_panel_single_period_raises():
    d = _df()
    one = d[d["period"] == 0]
    assert_raises_clean(lambda: _fit(one), Exception)


# --------------------------------------------------------------------------- #
# G4 — time-invariant regressor is perfectly collinear with entity FE         #
# --------------------------------------------------------------------------- #
def test_panel_time_invariant_regressor_raises():
    """A regressor that varies only *between* units (constant within unit) is
    fully absorbed by entity FE and must raise, not return a spurious slope."""
    d = _df()
    d["z"] = d["unit"].astype(float)  # time-invariant
    assert_raises_clean(lambda: _fit(d, formula="y ~ z"), Exception)


# --------------------------------------------------------------------------- #
# G1 — NaN rows: announced + dropped, finite estimate                         #
# --------------------------------------------------------------------------- #
def test_panel_nan_rows_warn_and_finite():
    d = _df()
    clean = _fit(d)
    dirty = d.copy()
    dirty.loc[:3, "x"] = np.nan
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        got = _fit(dirty)
    assert np.isfinite(coef(got, "x")), "NaN rows gave a non-finite estimate"
    msgs = " ".join(str(w.message).lower() for w in caught)
    assert (
        "missing" in msgs or "nan" in msgs or "drop" in msgs
    ), f"NaN drop not announced; warnings={[str(w.message) for w in caught]}"
    np.testing.assert_allclose(coef(got, "x"), coef(clean, "x"), rtol=0.1)


# --------------------------------------------------------------------------- #
# Documented quirk — globally-constant regressor (see module docstring)       #
# --------------------------------------------------------------------------- #
@pytest.mark.filterwarnings("ignore")
@pytest.mark.parametrize("c", [1.0, 5.0])
def test_panel_constant_regressor_documented(c):
    """Pin the two acceptable outcomes for a zero-variance regressor so a
    future validation guard is a deliberate change (campaign log)."""
    d = _df()
    try:
        r = _fit(d.assign(x=c))
    except Exception as e:
        assert str(e).strip()  # acceptable: a zero-variance guard was added
        return
    # current behaviour: linearmodels treats the constant column as the
    # intercept and reports coef = mean(y)/c.
    np.testing.assert_allclose(coef(r, "x"), d["y"].mean() / c, rtol=1e-6)
