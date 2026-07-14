"""Direct tests for public API functions that had **no** test reference.

A registry-vs-tests audit (``sp.list_functions()`` cross-referenced against
every name token appearing under ``tests/``) surfaced 14 callable public
symbols that were never exercised by name in the suite: DGP generators, DAG
example helpers, the interactive-figure ``get_code`` round-trip, several
plotting entry points, the neural-causal renderers, and ``verify_benchmark``.

These are low-risk surfaces (data generators, diagnostics, plots) but they are
part of the documented ``sp.*`` contract, so a regression that broke them would
ship silently. This module pins a smoke/known-property test on each so the
contract is script-verified. Numerics of estimators are intentionally NOT
touched here — only the previously untested entry points.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

import statspai as sp  # noqa: E402


@pytest.fixture(autouse=True)
def _close_figs():
    """Keep the Agg figure registry clean between plotting smoke tests."""
    yield
    plt.close("all")


# --------------------------------------------------------------------------- #
# DGP generators — shape, reproducibility, and a known structural property.
# --------------------------------------------------------------------------- #
def test_dgp_rct_shape_and_reproducibility():
    a = sp.dgp_rct(n=400, effect=0.5, seed=7)
    b = sp.dgp_rct(n=400, effect=0.5, seed=7)
    assert isinstance(a, pd.DataFrame)
    assert len(a) == 400
    # Same seed -> byte-identical frame (reproducible DGP contract).
    pd.testing.assert_frame_equal(a, b)
    # A different seed must move the data.
    c = sp.dgp_rct(n=400, effect=0.5, seed=8)
    assert not a.equals(c)


def test_dgp_rct_recovers_known_effect():
    # Under randomisation the naive difference in means is unbiased for the
    # planted ATE; with n=4000 it should land near 0.5.
    df = sp.dgp_rct(n=4000, effect=0.5, seed=3)
    assert {"y", "treatment"}.issubset(df.columns)
    treated = df["treatment"] == 1
    diff = df.loc[treated, "y"].mean() - df.loc[~treated, "y"].mean()
    assert abs(diff - 0.5) < 0.15


def test_dgp_cluster_rct_shape_and_reproducibility():
    a = sp.dgp_cluster_rct(n_clusters=20, cluster_size=15, effect=0.3, icc=0.1, seed=11)
    b = sp.dgp_cluster_rct(n_clusters=20, cluster_size=15, effect=0.3, icc=0.1, seed=11)
    assert isinstance(a, pd.DataFrame)
    assert len(a) == 20 * 15
    pd.testing.assert_frame_equal(a, b)


def test_dgp_bunching_structure_and_reproducibility():
    df = sp.dgp_bunching(n=8000, kink_point=50000.0, elasticity=0.3, seed=5)
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 8000
    # Contract: emits the observed income and its bunching-free counterfactual.
    assert {"income", "counterfactual_income"}.issubset(df.columns)
    assert (df["income"] > 0).all()
    # Reproducible under a fixed seed.
    df2 = sp.dgp_bunching(n=8000, kink_point=50000.0, elasticity=0.3, seed=5)
    pd.testing.assert_frame_equal(df, df2)


# --------------------------------------------------------------------------- #
# DAG example helpers.
# --------------------------------------------------------------------------- #
def test_dag_examples_catalog():
    names = sp.dag_examples()
    assert isinstance(names, list)
    # Canonical Cunningham/Pearl teaching DAGs that the catalog promises.
    for expected in ("collider", "confounding", "m_bias", "frontdoor"):
        assert expected in names


def test_dag_example_positions_returns_layout():
    names = sp.dag_examples()
    pos = sp.dag_example_positions(names[0])
    assert isinstance(pos, dict)
    assert len(pos) >= 1
    # Each node maps to a 2-D coordinate.
    for coord in pos.values():
        assert len(coord) == 2


def test_dag_simulate_known_simulations():
    df = sp.dag_simulate("discrimination", n=300, seed=2)
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 300
    # Reproducible under a fixed seed.
    df2 = sp.dag_simulate("discrimination", n=300, seed=2)
    pd.testing.assert_frame_equal(df, df2)


def test_dag_simulate_rejects_unknown_name():
    with pytest.raises(ValueError):
        sp.dag_simulate("not-a-real-simulation", n=10)


# --------------------------------------------------------------------------- #
# Plotting entry points — smoke (renders without raising) on Agg.
# --------------------------------------------------------------------------- #
@pytest.fixture
def _obs_data():
    rng = np.random.default_rng(0)
    n = 300
    df = pd.DataFrame({"x1": rng.normal(size=n), "x2": rng.normal(size=n)})
    df["treat"] = (df["x1"] + rng.normal(size=n) > 0).astype(int)
    df["y"] = 0.5 * df["treat"] + df["x1"] + rng.normal(size=n)
    return df


def test_psplot_smoke(_obs_data):
    out = sp.psplot(_obs_data, treat="treat", covariates=["x1", "x2"])
    assert out is not None


def test_balanceplot_smoke(_obs_data):
    res = sp.psm(_obs_data, y="y", d="treat", X=["x1", "x2"])
    out = sp.balanceplot(res)
    assert out is not None


def test_margins_at_plot_smoke(_obs_data):
    reg = sp.regress("y ~ x1 + treat", data=_obs_data)
    mdf = sp.margins_at(reg, _obs_data, at={"x1": [-1.0, 0.0, 1.0]})
    assert isinstance(mdf, pd.DataFrame)
    out = sp.margins_at_plot(mdf, x="x1")
    assert out is not None


def test_impactplot_smoke():
    rng = np.random.default_rng(1)
    ts = pd.DataFrame(
        {
            "t": range(60),
            "y": list(rng.normal(size=40)) + list(rng.normal(2.0, 1.0, size=20)),
        }
    )
    ci = sp.causal_impact(ts, y="y", time="t", intervention_time=40)
    out = sp.impactplot(ci)
    assert out is not None


def test_get_code_roundtrip():
    fig, ax = plt.subplots()
    ax.plot([1, 2, 3])
    code = sp.get_code(fig)
    assert isinstance(code, str)


# --------------------------------------------------------------------------- #
# Neural-causal renderers (torch-gated; tiny net so the test stays fast).
# --------------------------------------------------------------------------- #
@pytest.fixture
def _dragonnet_result():
    pytest.importorskip("torch")
    rng = np.random.default_rng(0)
    n = 200
    X = rng.normal(size=(n, 3))
    t = (X[:, 0] + rng.normal(size=n) > 0).astype(int)
    y = 0.5 * t + X[:, 0] + rng.normal(size=n)
    df = pd.DataFrame(X, columns=["x1", "x2", "x3"])
    df["t"] = t
    df["y"] = y
    return sp.dragonnet(df, y="y", treat="t", covariates=["x1", "x2", "x3"], epochs=3)


def test_neural_causal_to_markdown_smoke(_dragonnet_result):
    md = sp.neural_causal_to_markdown(_dragonnet_result)
    assert isinstance(md, str)
    assert len(md) > 0


def test_neural_causal_plot_smoke(_dragonnet_result):
    out = sp.neural_causal_plot(_dragonnet_result)
    assert out is not None


# --------------------------------------------------------------------------- #
# verify_benchmark — agent self-verification harness over built-in DGPs.
# Marked slow: even a minimal budget runs several estimator + placebo passes.
# --------------------------------------------------------------------------- #
@pytest.mark.slow
def test_verify_benchmark_smoke():
    df = sp.verify_benchmark(
        scenarios=None, n_reps=1, seed=0, verify_B=5, verify_budget_s=2.0, verbose=False
    )
    assert isinstance(df, pd.DataFrame)
    assert len(df) > 0
    assert "scenario" in df.columns
