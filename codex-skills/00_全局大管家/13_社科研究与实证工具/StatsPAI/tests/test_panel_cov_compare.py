"""Coverage campaign — PanelResults.compare() and long-T unit-root internals.

Part of the core-module ≥95% coverage initiative
(see ``.coverage_campaign/CAMPAIGN.md``). ``PanelResults.compare(other)`` builds
a ``PanelCompareResults`` (its ``summary`` / coefficient table in
``panel_reg.py``); and the IPS / LLC / Fisher / Hadri unit-root statistics only
reach their combination formulas when each unit has enough periods, so this uses
a longer panel (T=14) than the smoke fixture.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

import statspai as sp


@pytest.fixture(scope="module")
def panel_df():
    rng = np.random.default_rng(0)
    n_e, n_t = 40, 14
    N = n_e * n_t
    ent = np.repeat(np.arange(n_e), n_t)
    tm = np.tile(np.arange(n_t), n_e)
    x1 = rng.standard_normal(N)
    fe = np.repeat(rng.standard_normal(n_e), n_t)
    y = 2.0 * x1 + fe + rng.standard_normal(N)
    return pd.DataFrame({"y": y, "x1": x1, "id": ent, "time": tm})


def test_panel_results_compare(panel_df):
    fe = sp.panel(panel_df, formula="y ~ x1", entity="id", time="time", method="fe")
    # compare() re-estimates with the named method and returns PanelCompareResults
    cmp = fe.compare("re")
    assert cmp is not None
    s = cmp.summary() if hasattr(cmp, "summary") else str(cmp)
    assert isinstance(s, str) and len(s) > 0
    assert isinstance(str(cmp), str)


@pytest.mark.parametrize("test", ["ips", "llc", "fisher", "hadri"])
def test_unitroot_long_panel(panel_df, test):
    out = sp.panel_unitroot(
        panel_df, variable="x1", id="id", time="time", test=test, lags=1
    )
    assert out is not None
    pv = getattr(out, "p_value", None)
    if pv is not None and np.isfinite(pv):
        assert 0.0 <= float(pv) <= 1.0
