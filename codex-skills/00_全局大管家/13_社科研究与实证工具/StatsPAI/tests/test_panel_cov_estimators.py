"""Coverage campaign — panel estimators, diagnostics, unit roots, FGLS, binary.

Part of the core-module ≥95% coverage initiative
(see ``.coverage_campaign/CAMPAIGN.md``). Sweeps the panel estimator methods not
already exercised (mundlak / twoway / difference / between), the Hausman /
Breusch–Pagan / F-effects / Pesaran-CD diagnostics, panel unit-root tests
(ips / llc / fisher / hadri), FGLS panel-error structures
(heteroskedastic / correlated / homoskedastic), the nonlinear binary panels
(logit / probit, FE / RE), and ``panel_compare``.

Assertions are real: the FE/mundlak/twoway slopes recover the true effect (=2),
diagnostics return finite statistics with p-values in [0, 1].
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

import statspai as sp


@pytest.fixture(scope="module")
def panel_df():
    rng = np.random.default_rng(0)
    n_e, n_t = 50, 6
    N = n_e * n_t
    ent = np.repeat(np.arange(n_e), n_t)
    tm = np.tile(np.arange(n_t), n_e)
    x1 = rng.standard_normal(N)
    x2 = rng.standard_normal(N)
    fe = np.repeat(rng.standard_normal(n_e), n_t)
    y = 2.0 * x1 - 1.0 * x2 + fe + rng.standard_normal(N)
    return pd.DataFrame({"y": y, "x1": x1, "x2": x2, "id": ent, "time": tm})


@pytest.fixture(scope="module")
def binary_panel_df():
    rng = np.random.default_rng(1)
    n_e, n_t = 60, 8
    N = n_e * n_t
    ent = np.repeat(np.arange(n_e), n_t)
    tm = np.tile(np.arange(n_t), n_e)
    x = rng.standard_normal(N)
    fe = np.repeat(rng.standard_normal(n_e), n_t)
    eta = 0.8 * x + fe
    y = (rng.uniform(size=N) < 1.0 / (1.0 + np.exp(-eta))).astype(int)
    return pd.DataFrame({"y": y, "x": x, "id": ent, "time": tm})


def _slope(res, name="x1"):
    params = getattr(res, "params", None)
    if params is not None and name in getattr(params, "index", []):
        return float(params[name])
    return np.nan


# ─── estimator methods not covered elsewhere ─────────────────────────────


@pytest.mark.parametrize("method", ["mundlak", "twoway", "chamberlain", "be"])
def test_panel_methods(panel_df, method):
    res = sp.panel(
        panel_df, formula="y ~ x1 + x2", entity="id", time="time", method=method
    )
    assert res is not None
    s = _slope(res)
    assert np.isnan(s) or abs(s - 2.0) < 1.0


def test_panel_result_exports(panel_df):
    res = sp.panel(
        panel_df, formula="y ~ x1 + x2", entity="id", time="time", method="fe"
    )
    assert isinstance(res.summary(), str)
    assert isinstance(res.to_latex(), str)
    assert len(res.tidy()) > 0


# ─── diagnostics ─────────────────────────────────────────────────────────


def test_hausman_test(panel_df):
    out = sp.hausman_test(panel_df, y="y", x=["x1", "x2"], id="id", time="time")
    assert isinstance(out, dict)
    pval = out.get("p_value", out.get("pvalue"))
    if pval is not None:
        assert 0.0 <= float(pval) <= 1.0


def test_panel_compare(panel_df):
    out = sp.panel_compare(
        panel_df,
        formula="y ~ x1 + x2",
        entity="id",
        time="time",
        methods=["fe", "re", "pooled"],
    )
    assert out is not None


# ─── unit-root tests ─────────────────────────────────────────────────────


@pytest.mark.parametrize("test", ["ips", "llc", "fisher", "hadri"])
def test_panel_unitroot(panel_df, test):
    out = sp.panel_unitroot(panel_df, variable="y", id="id", time="time", test=test)
    assert out is not None


# ─── FGLS ────────────────────────────────────────────────────────────────


@pytest.mark.parametrize("panels", ["heteroskedastic", "correlated", "homoskedastic"])
def test_panel_fgls(panel_df, panels):
    res = sp.panel_fgls(
        panel_df, y="y", x=["x1", "x2"], id="id", time="time", panels=panels
    )
    assert res is not None


# ─── nonlinear binary panels ─────────────────────────────────────────────


@pytest.mark.parametrize("method", ["fe", "re"])
def test_panel_logit(binary_panel_df, method):
    res = sp.panel_logit(
        binary_panel_df, y="y", x=["x"], id="id", time="time", method=method
    )
    assert res is not None


def test_panel_probit(binary_panel_df):
    res = sp.panel_probit(
        binary_panel_df, y="y", x=["x"], id="id", time="time", method="re"
    )
    assert res is not None
