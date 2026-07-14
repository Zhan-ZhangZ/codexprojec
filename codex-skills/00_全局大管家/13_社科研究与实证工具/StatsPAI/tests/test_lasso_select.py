"""Tests for ``sp.lasso_select`` — LASSO variable selection with BIC/AIC/CV
penalty choice (previously untested public function).

On a sparse linear DGP the selected set must contain the true support (no
false negatives), the recovered coefficients must be close to the truth, and
BIC — the most aggressive criterion — must not over-select relative to AIC.
"""

import numpy as np
import pandas as pd
import pytest

import statspai as sp

TRUE_SUPPORT = {"x0", "x3", "x7"}


def _sparse_data(n=400, p=12, seed=0):
    rng = np.random.default_rng(seed)
    X = rng.normal(size=(n, p))
    y = 2.0 * X[:, 0] - 1.5 * X[:, 3] + 0.8 * X[:, 7] + rng.normal(0, 0.5, n)
    df = pd.DataFrame(X, columns=[f"x{i}" for i in range(p)])
    df["y"] = y
    return df, [f"x{i}" for i in range(p)]


@pytest.mark.parametrize("method", ["bic", "aic", "cv"])
def test_lasso_select_recovers_true_support(method):
    df, x = _sparse_data()
    res = sp.lasso_select(df, y="y", x=x, method=method, verbose=False, seed=0)
    # No false negatives: every truly-relevant variable is retained.
    assert TRUE_SUPPORT <= set(res.selected)


def test_lasso_select_coefficients_close_to_truth():
    df, x = _sparse_data()
    res = sp.lasso_select(df, y="y", x=x, method="bic", verbose=False, seed=0)
    coef = res.coefficients
    assert coef["x0"] == pytest.approx(2.0, abs=0.2)
    assert coef["x3"] == pytest.approx(-1.5, abs=0.2)
    assert coef["x7"] == pytest.approx(0.8, abs=0.2)


def test_lasso_select_result_contract():
    df, x = _sparse_data()
    res = sp.lasso_select(df, y="y", x=x, method="bic", verbose=False, seed=0)
    assert set(res.selected) <= set(x)
    # selected and dropped partition the candidate set.
    assert set(res.selected).isdisjoint(set(res.dropped))
    assert set(res.selected) | set(res.dropped) == set(x)
    assert res.method == "lasso_bic"


def test_lasso_select_bic_no_larger_than_aic():
    df, x = _sparse_data()
    bic = sp.lasso_select(df, y="y", x=x, method="bic", verbose=False, seed=0)
    aic = sp.lasso_select(df, y="y", x=x, method="aic", verbose=False, seed=0)
    # BIC's heavier penalty -> at most as many variables as AIC.
    assert len(bic.selected) <= len(aic.selected)


def test_lasso_select_is_seed_reproducible():
    df, x = _sparse_data()
    a = sp.lasso_select(df, y="y", x=x, method="cv", verbose=False, seed=42)
    b = sp.lasso_select(df, y="y", x=x, method="cv", verbose=False, seed=42)
    assert a.selected == b.selected
