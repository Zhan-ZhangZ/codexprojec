"""Unit tests for the DoubleML-compatible ``sp.dml`` score / IPW options.

Covers the additive options introduced for the DoubleML reference
alignment: ``score`` (PLR ``'IV-type'``, IRM ``'ATTE'``),
``normalize_ipw`` and ``trimming_threshold`` (IRM / IIVM). These are
behaviour / API guards — the numerical pins against ``doubleml-for-py``
live in ``tests/external_parity/test_dml_python_parity.py``.

The defining contract: leaving every new option at its default must
reproduce the historical estimate bit-for-bit. ``test_*_default_*``
encode that as same-data, same-seed equality.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

import statspai as sp
from statspai.exceptions import MethodIncompatibility


@pytest.fixture(scope="module")
def irm_data() -> pd.DataFrame:
    rng = np.random.default_rng(20260624)
    n, p = 1200, 6
    X = rng.normal(size=(n, p))
    ps = 1.0 / (1.0 + np.exp(-(0.7 * X[:, 0] - 0.5 * X[:, 1])))
    d = (rng.uniform(size=n) < ps).astype(int)
    y = 1.0 * d + X[:, 0] + 0.5 * X[:, 1] + rng.normal(size=n)
    df = pd.DataFrame(X, columns=[f"x{i}" for i in range(p)])
    df["y"] = y
    df["d"] = d
    return df


@pytest.fixture(scope="module")
def plr_data() -> pd.DataFrame:
    rng = np.random.default_rng(424242)
    n, p = 1200, 6
    X = rng.normal(size=(n, p))
    d = 0.8 * X[:, 0] + rng.normal(size=n)
    y = 1.5 * d + X[:, 0] + 0.5 * X[:, 1] + rng.normal(size=n)
    df = pd.DataFrame(X, columns=[f"x{i}" for i in range(p)])
    df["y"] = y
    df["d"] = d
    return df


def _cols(df: pd.DataFrame) -> list[str]:
    return [c for c in df.columns if c.startswith("x")]


# --------------------------------------------------------------------- #
#  Defaults reproduce historical behaviour bit-for-bit
# --------------------------------------------------------------------- #
def test_irm_default_equals_explicit_ate(irm_data):
    """score=None / normalize_ipw=False / trim=0.01 ≡ explicit ATE call."""
    cols = _cols(irm_data)
    a = sp.dml(
        irm_data,
        y="y",
        treat="d",
        covariates=cols,
        model="irm",
        ml_g="linear",
        ml_m="logistic",
        n_folds=3,
        random_state=1,
    )
    b = sp.dml(
        irm_data,
        y="y",
        treat="d",
        covariates=cols,
        model="irm",
        ml_g="linear",
        ml_m="logistic",
        n_folds=3,
        random_state=1,
        score="ATE",
        normalize_ipw=False,
        trimming_threshold=0.01,
    )
    assert a.estimate == pytest.approx(b.estimate, abs=0, rel=0)
    assert a.se == pytest.approx(b.se, abs=0, rel=0)


def test_plr_default_equals_explicit_partialling_out(plr_data):
    cols = _cols(plr_data)
    a = sp.dml(
        plr_data,
        y="y",
        treat="d",
        covariates=cols,
        model="plr",
        ml_g="linear",
        ml_m="linear",
        n_folds=3,
        random_state=2,
    )
    b = sp.dml(
        plr_data,
        y="y",
        treat="d",
        covariates=cols,
        model="plr",
        ml_g="linear",
        ml_m="linear",
        n_folds=3,
        random_state=2,
        score="partialling out",
    )
    assert a.estimate == pytest.approx(b.estimate, abs=0, rel=0)
    assert a.se == pytest.approx(b.se, abs=0, rel=0)


# --------------------------------------------------------------------- #
#  New options run, are reported, and move the estimate sensibly
# --------------------------------------------------------------------- #
def test_irm_atte_runs_and_is_reported(irm_data):
    cols = _cols(irm_data)
    res = sp.dml(
        irm_data,
        y="y",
        treat="d",
        covariates=cols,
        model="irm",
        ml_g="linear",
        ml_m="logistic",
        n_folds=3,
        random_state=1,
        score="ATTE",
    )
    assert np.isfinite(res.estimate) and np.isfinite(res.se) and res.se > 0
    assert res.model_info["score"] == "ATTE"


def test_plr_ivtype_runs_and_is_reported(plr_data):
    cols = _cols(plr_data)
    res = sp.dml(
        plr_data,
        y="y",
        treat="d",
        covariates=cols,
        model="plr",
        ml_g="linear",
        ml_m="linear",
        n_folds=3,
        random_state=2,
        score="IV-type",
    )
    assert np.isfinite(res.estimate) and res.se > 0
    assert res.model_info["score"] == "IV-type"
    # On a linear DGP IV-type and partialling-out both recover ~1.5.
    assert abs(res.estimate - 1.5) < 0.2


def test_irm_normalize_ipw_reported_and_close(irm_data):
    cols = _cols(irm_data)
    base = sp.dml(
        irm_data,
        y="y",
        treat="d",
        covariates=cols,
        model="irm",
        ml_g="linear",
        ml_m="logistic",
        n_folds=3,
        random_state=1,
    )
    norm = sp.dml(
        irm_data,
        y="y",
        treat="d",
        covariates=cols,
        model="irm",
        ml_g="linear",
        ml_m="logistic",
        n_folds=3,
        random_state=1,
        normalize_ipw=True,
    )
    assert norm.model_info["normalize_ipw"] is True
    # Good overlap → normalization is a small adjustment, not a regime change.
    assert abs(norm.estimate - base.estimate) < 0.1


def test_trimming_threshold_reported(irm_data):
    cols = _cols(irm_data)
    res = sp.dml(
        irm_data,
        y="y",
        treat="d",
        covariates=cols,
        model="irm",
        ml_g="linear",
        ml_m="logistic",
        n_folds=3,
        random_state=1,
        trimming_threshold=0.05,
    )
    assert res.model_info["trimming_threshold"] == 0.05


# --------------------------------------------------------------------- #
#  Validation guards fail loudly (no silent no-ops)
# --------------------------------------------------------------------- #
def test_invalid_score_value_rejected(irm_data):
    cols = _cols(irm_data)
    with pytest.raises(MethodIncompatibility, match="score must be one of"):
        sp.dml(
            irm_data,
            y="y",
            treat="d",
            covariates=cols,
            model="irm",
            n_folds=3,
            score="ATET",
        )  # typo for ATTE


def test_score_rejected_on_pliv(plr_data):
    """PLIV accepts only 'partialling out'; 'IV-type' must be rejected."""
    cols = _cols(plr_data)
    df = plr_data.copy()
    df["z"] = df["x0"] + np.random.default_rng(0).normal(size=len(df))
    with pytest.raises(MethodIncompatibility, match="score must be one of"):
        sp.dml(
            df,
            y="y",
            treat="d",
            covariates=cols,
            model="pliv",
            instrument="z",
            n_folds=3,
            score="IV-type",
        )


def test_normalize_ipw_rejected_on_plr(plr_data):
    cols = _cols(plr_data)
    with pytest.raises(MethodIncompatibility, match="normalize_ipw only applies"):
        sp.dml(
            plr_data,
            y="y",
            treat="d",
            covariates=cols,
            model="plr",
            n_folds=3,
            normalize_ipw=True,
        )


def test_trimming_threshold_rejected_on_plr(plr_data):
    cols = _cols(plr_data)
    with pytest.raises(MethodIncompatibility, match="trimming_threshold only applies"):
        sp.dml(
            plr_data,
            y="y",
            treat="d",
            covariates=cols,
            model="plr",
            n_folds=3,
            trimming_threshold=0.05,
        )


def test_trimming_threshold_out_of_range(irm_data):
    cols = _cols(irm_data)
    with pytest.raises(MethodIncompatibility, match="open interval"):
        sp.dml(
            irm_data,
            y="y",
            treat="d",
            covariates=cols,
            model="irm",
            n_folds=3,
            trimming_threshold=0.8,
        )


def test_atte_with_sample_weight_fails_loudly(irm_data):
    cols = _cols(irm_data)
    w = np.ones(len(irm_data))
    with pytest.raises(MethodIncompatibility, match="score='ATE'"):
        sp.dml(
            irm_data,
            y="y",
            treat="d",
            covariates=cols,
            model="irm",
            n_folds=3,
            score="ATTE",
            sample_weight=w,
        )
