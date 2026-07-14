"""Tests for the pre/post quasi-experiment wrappers ``sp.ancova`` / ``sp.negd``.

Both reduce to covariate-adjusted OLS, so correctness is checked by recovering a
known average treatment effect on simulated data, plus the design framing
(estimand, encoding, assumptions, the change-score regression-to-the-mean
warning) and the input-validation contract.
"""

from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
import pytest

import statspai as sp


def _panel(seed=7, n=4000, ate=1.5, imbalance=0.0):
    rng = np.random.default_rng(seed)
    treated = rng.integers(0, 2, n)
    pre = rng.normal(0, 1, n) + imbalance * treated
    post = 2 + ate * treated + 0.8 * pre + rng.normal(0, 0.5, n)
    return pd.DataFrame(
        {
            "post": post,
            "pre": pre,
            "treated": treated,
            "age": rng.normal(40, 5, n),
        }
    )


# --------------------------------------------------------------------- #
#  ANCOVA
# --------------------------------------------------------------------- #
def test_ancova_recovers_ate():
    res = sp.ancova(_panel(), outcome="post", group="treated", covariates=["pre"])
    assert isinstance(res, sp.CausalResult)
    assert res.estimand == "ATE"
    assert abs(res.estimate - 1.5) < 0.1
    assert "assumptions" in res.model_info
    assert res.model_info["design"].startswith("ANCOVA")


def test_ancova_categorical_covariate():
    df = _panel()
    df["region"] = np.where(df["age"] > 40, "north", "south")
    res = sp.ancova(df, outcome="post", group="treated", covariates=["pre", "region"])
    assert abs(res.estimate - 1.5) < 0.15
    assert "C(region)" in res.model_info["formula"]


def test_ancova_string_group_requires_group_value():
    df = _panel()
    df["arm"] = np.where(df["treated"] == 1, "drug", "placebo")
    res = sp.ancova(
        df, outcome="post", group="arm", covariates=["pre"], group_value="drug"
    )
    assert res.model_info["treated_level"] == "drug"
    assert res.model_info["control_level"] == "placebo"
    assert abs(res.estimate - 1.5) < 0.1


def test_ancova_binary_numeric_uses_one_as_treated():
    res = sp.ancova(_panel(), outcome="post", group="treated")
    assert res.model_info["treated_level"] == 1
    assert res.model_info["control_level"] == 0


# --------------------------------------------------------------------- #
#  Input validation
# --------------------------------------------------------------------- #
def test_more_than_two_levels_without_group_value_raises():
    df = _panel()
    df["three"] = np.random.default_rng(0).integers(0, 3, len(df))
    with pytest.raises(ValueError, match="levels"):
        sp.ancova(df, outcome="post", group="three")


def test_group_value_not_a_level_raises():
    df = _panel()
    with pytest.raises(ValueError, match="not a level"):
        sp.ancova(df, outcome="post", group="treated", group_value=9)


def test_single_level_group_raises():
    df = _panel()
    df["const"] = 1
    with pytest.raises(ValueError, match="two levels"):
        sp.ancova(df, outcome="post", group="const")


def test_missing_column_raises():
    with pytest.raises(ValueError, match="not found"):
        sp.ancova(_panel(), outcome="nope", group="treated")


# --------------------------------------------------------------------- #
#  NEGD
# --------------------------------------------------------------------- #
def test_negd_ancova_equals_ancova_with_baseline():
    df = _panel()
    n = sp.negd(df, group="treated", pre="pre", post="post")
    a = sp.ancova(df, outcome="post", group="treated", covariates=["pre"])
    assert np.isclose(n.estimate, a.estimate)
    assert n.method.startswith("NEGD")
    assert n.model_info["negd_method"] == "ancova"


def test_negd_change_score_recovers_and_warns():
    df = _panel(imbalance=0.0)  # no imbalance -> change-score unbiased
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        res = sp.negd(
            df, group="treated", pre="pre", post="post", method="change_score"
        )
    assert abs(res.estimate - 1.5) < 0.15
    assert res.model_info["regression_to_mean_warning"] is True
    assert any("regression to the mean" in str(x.message) for x in w)


def test_negd_invalid_method_raises():
    with pytest.raises(ValueError, match="method must be"):
        sp.negd(_panel(), group="treated", pre="pre", post="post", method="x")


def test_negd_ancova_robust_to_baseline_imbalance():
    # With baseline imbalance, ANCOVA stays near truth; this guards the
    # default method choice.
    df = _panel(imbalance=0.8)
    res = sp.negd(df, group="treated", pre="pre", post="post", method="ancova")
    assert abs(res.estimate - 1.5) < 0.12


# --------------------------------------------------------------------- #
#  Discoverability
# --------------------------------------------------------------------- #
def test_exports_and_registry():
    assert hasattr(sp, "ancova") and hasattr(sp, "negd")
    names = [str(getattr(f, "name", f)) for f in sp.list_functions()]
    assert "ancova" in names
    assert "negd" in names
