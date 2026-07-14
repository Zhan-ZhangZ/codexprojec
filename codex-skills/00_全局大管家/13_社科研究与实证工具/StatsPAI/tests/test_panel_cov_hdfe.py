"""Coverage campaign — HDFE backend selection and multi-way clustering.

Part of the core-module ≥95% coverage initiative
(see ``.coverage_campaign/CAMPAIGN.md``). Imports the optional Rust-backend shim
(``panel/hdfe_rust.py``) to cover its module-level availability flag, and drives
``sp.hdfe_ols`` with two-way clustering (the Cameron–Gelbach–Miller multiway
sandwich in ``panel/hdfe.py``).

The numba-compiled demeaning kernels in ``_hdfe_kernels.py`` and the Rust-only
``group_demean_rust`` body are ``# pragma: no cover`` (compiled code is not
traceable by coverage.py; the Rust extension is not built in CI).
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

import statspai as sp


def test_hdfe_rust_backend_flag():
    from statspai.panel import hdfe_rust

    # availability is a bool; the demean entry point exists either way
    assert isinstance(hdfe_rust.HAS_RUST, bool)
    assert callable(hdfe_rust.group_demean_rust)
    assert "HAS_RUST" in hdfe_rust.__all__


@pytest.fixture(scope="module")
def df():
    rng = np.random.default_rng(0)
    n_e, n_t = 50, 8
    N = n_e * n_t
    ent = np.repeat(np.arange(n_e), n_t)
    tm = np.tile(np.arange(n_t), n_e)
    x1 = rng.standard_normal(N)
    fe = np.repeat(rng.standard_normal(n_e), n_t)
    y = 2.0 * x1 + fe + rng.standard_normal(N)
    return pd.DataFrame({"y": y, "x1": x1, "id": ent, "time": tm})


def test_hdfe_twoway_cluster(df):
    # two-way (multiway) clustering → Cameron-Gelbach-Miller sandwich
    res = sp.hdfe_ols("y ~ x1 | id", df, cluster=["id", "time"])
    assert abs(float(res.params["x1"]) - 2.0) < 0.5
    assert res.std_errors["x1"] > 0


def test_demean_multiple_fe(df):
    x = df[["y", "x1"]].to_numpy(dtype=float)
    out = sp.demean(x, fe=df[["id", "time"]])
    arr = out[0] if isinstance(out, tuple) else out
    assert np.asarray(arr).shape[0] == len(df)
