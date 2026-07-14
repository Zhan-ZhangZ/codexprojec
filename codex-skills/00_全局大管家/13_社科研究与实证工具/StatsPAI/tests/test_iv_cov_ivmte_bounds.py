"""Coverage campaign — IVMTE partial-identification bounds (``iv/ivmte_lp.py``).

Part of the core-module ≥95% coverage initiative
(see ``.coverage_campaign/CAMPAIGN.md``). ``ivmte_lp.py`` builds a linear
program over MTE basis coefficients and solves it for several target estimands;
the earlier dispatcher test only hit the default ``target='ate'`` happy path.
Here we sweep every target-weight branch (ate / att / atu / late / prte), the
shape constraint (``decreasing_mte``), outcome bounds, the ``include_bmw_point``
toggle, and the input-validation errors.

Assertions are real: every solved bound set must satisfy ``lower ≤ upper`` and be
finite under bounded outcomes; misuse must raise with an informative message.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

import statspai as sp


@pytest.fixture(scope="module")
def binary_treat():
    """Binary treatment + continuous instrument shifting participation."""
    rng = np.random.default_rng(31)
    n = 900
    z = rng.uniform(-2.5, 2.5, n)
    x = rng.standard_normal(n)
    v = rng.standard_normal(n)
    d = ((1.0 * z + 0.3 * x - 0.5 * v) > 0).astype(float)
    y = 1.0 + 1.4 * d + 0.4 * x + 0.5 * v + rng.standard_normal(n)
    return pd.DataFrame({"y": y, "d": d, "z": z, "x": x})


def _lo_hi(res):
    lo = getattr(res, "lower", getattr(res, "lb", getattr(res, "lower_bound", None)))
    hi = getattr(res, "upper", getattr(res, "ub", getattr(res, "upper_bound", None)))
    return lo, hi


@pytest.mark.parametrize("target", ["ate", "att", "atu"])
def test_ivmte_targets_basic(binary_treat, target):
    res = sp.iv.ivmte_bounds(
        y="y",
        treatment="d",
        instruments=["z"],
        exog=["x"],
        data=binary_treat,
        target=target,
        bounds_outcome=(-5.0, 8.0),
    )
    lo, hi = _lo_hi(res)
    assert lo is not None and hi is not None
    assert np.isfinite(lo) and np.isfinite(hi)
    assert lo <= hi + 1e-8


def test_ivmte_late_target(binary_treat):
    res = sp.iv.ivmte_bounds(
        y="y",
        treatment="d",
        instruments=["z"],
        exog=["x"],
        data=binary_treat,
        target="late",
        late_bounds=(0.3, 0.7),
        bounds_outcome=(-5.0, 8.0),
    )
    lo, hi = _lo_hi(res)
    assert np.isfinite(lo) and np.isfinite(hi) and lo <= hi + 1e-8


def test_ivmte_prte_target(binary_treat):
    n = len(binary_treat)
    # counterfactual policy: everyone pushed toward higher participation
    policy = np.full(n, 0.75)
    res = sp.iv.ivmte_bounds(
        y="y",
        treatment="d",
        instruments=["z"],
        exog=["x"],
        data=binary_treat,
        target="prte",
        policy_prob=policy,
        bounds_outcome=(-5.0, 8.0),
    )
    lo, hi = _lo_hi(res)
    assert lo <= hi + 1e-8


def test_ivmte_decreasing_shape_constraint(binary_treat):
    res = sp.iv.ivmte_bounds(
        y="y",
        treatment="d",
        instruments=["z"],
        exog=["x"],
        data=binary_treat,
        target="ate",
        decreasing_mte=True,
        bounds_outcome=(-5.0, 8.0),
        basis_degree=4,
        include_bmw_point=False,
    )
    lo, hi = _lo_hi(res)
    assert np.isfinite(lo) and np.isfinite(hi) and lo <= hi + 1e-8
    # imposing a monotone MTE cannot widen the (already bounded) identified set
    assert hi - lo < 100.0


def test_ivmte_array_inputs(binary_treat):
    df = binary_treat
    res = sp.iv.ivmte_bounds(
        y=df["y"].to_numpy(),
        treatment=df["d"].to_numpy(),
        instruments=df[["z"]].to_numpy(),
        exog=df[["x"]].to_numpy(),
        target="ate",
        bounds_outcome=(-5.0, 8.0),
    )
    lo, hi = _lo_hi(res)
    assert lo <= hi + 1e-8


# ─── input-validation error branches ─────────────────────────────────────


def test_ivmte_late_requires_bounds(binary_treat):
    with pytest.raises(ValueError, match="late_bounds"):
        sp.iv.ivmte_bounds(
            y="y",
            treatment="d",
            instruments=["z"],
            data=binary_treat,
            target="late",
        )


def test_ivmte_prte_requires_policy(binary_treat):
    with pytest.raises(ValueError, match="policy_prob"):
        sp.iv.ivmte_bounds(
            y="y",
            treatment="d",
            instruments=["z"],
            data=binary_treat,
            target="prte",
        )


def test_ivmte_unknown_target(binary_treat):
    with pytest.raises(ValueError, match="[Uu]nknown target"):
        sp.iv.ivmte_bounds(
            y="y",
            treatment="d",
            instruments=["z"],
            data=binary_treat,
            target="definitely_not_a_target",
        )
