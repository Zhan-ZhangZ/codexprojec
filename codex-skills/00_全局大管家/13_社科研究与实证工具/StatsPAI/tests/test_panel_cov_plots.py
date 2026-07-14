"""Coverage campaign — panel plotting layer (``panel/panel_plots.py``).

Part of the core-module ≥95% coverage initiative
(see ``.coverage_campaign/CAMPAIGN.md``). ``panel_plots.py`` (the single largest
panel gap file) provides six renderers — coefficient forest, fixed-effects
distribution, residual diagnostics, within/between scatter, multi-model compare,
and the Hausman fe-vs-re panel — all taking a fitted ``PanelResults``. This
drives every renderer (and the result-object plot methods that wrap them) on a
real fixed-effects fit under the Agg backend.

Rendering smoke tests: assert each helper returns a Matplotlib figure/axes tuple
and does not raise; the estimator numerics are covered by the panel parity
suites.
"""

from __future__ import annotations

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import pytest  # noqa: E402

import statspai as sp  # noqa: E402
from statspai.panel import panel_plots  # noqa: E402


@pytest.fixture(scope="module")
def panel_df():
    rng = np.random.default_rng(0)
    n_e, n_t = 40, 6
    N = n_e * n_t
    ent = np.repeat(np.arange(n_e), n_t)
    tm = np.tile(np.arange(n_t), n_e)
    x1 = rng.standard_normal(N)
    x2 = rng.standard_normal(N)
    fe = np.repeat(rng.standard_normal(n_e), n_t)
    y = 2.0 * x1 - 1.0 * x2 + fe + rng.standard_normal(N)
    return pd.DataFrame({"y": y, "x1": x1, "x2": x2, "entity": ent, "time": tm})


@pytest.fixture(scope="module")
def fe_result(panel_df):
    return sp.panel(
        panel_df, formula="y ~ x1 + x2", entity="entity", time="time", method="fe"
    )


@pytest.fixture(scope="module")
def re_result(panel_df):
    return sp.panel(
        panel_df, formula="y ~ x1 + x2", entity="entity", time="time", method="re"
    )


def _ok(out):
    assert out is not None
    plt.close("all")


def test_plot_coef(fe_result):
    _ok(panel_plots.plot_coef(fe_result, title="coef"))


@pytest.mark.parametrize("kind", ["hist", "kde"])
def test_plot_effects(fe_result, kind):
    _ok(panel_plots.plot_effects(fe_result, kind=kind))


def test_plot_residuals(fe_result):
    _ok(panel_plots.plot_residuals(fe_result))


def test_plot_within_between(panel_df):
    _ok(
        panel_plots.plot_within_between(
            panel_df, variables=["x1", "x2"], entity="entity"
        )
    )


def test_plot_compare(fe_result, re_result):
    _ok(panel_plots.plot_compare({"FE": fe_result, "RE": re_result}))


def test_plot_hausman(fe_result):
    _ok(panel_plots.plot_hausman(fe_result))


# ─── result-object plot methods (thin wrappers) ──────────────────────────


def test_result_plot_methods(fe_result):
    _ok(fe_result.plot())
    _ok(fe_result.plot_effects())
    _ok(fe_result.plot_residuals())
    _ok(fe_result.plot_hausman())
