"""Reliability + correctness for the orthogonal network-interference family.

`sp.network_hte` and `sp.inward_outward_spillover` were exposed to the
registry in the 2026-06 discoverability repair but had not been hardened:
`inward_outward_spillover` carried **no row-count floor** (a 3-row frame
returned a silent garbage decomposition and an all-NaN frame returned a
silent NaN) and used a cryptic bare-`ValueError` for missing columns.

This suite pins, for both estimators:

1. **Fail-loud** — missing column / non-DataFrame raise `sp.StatsPAIError`,
   and too-few / all-NaN rows raise `DataInsufficient`, via the shared
   `statspai._input_validation` guard.
2. **Correctness-by-construction** — on a known linear DGP the direct,
   spillover, inward and outward coefficients are recovered.
3. **Agent-native cards** — assumptions / failure modes / alternatives are
   exposed through `sp.describe_function`.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

import statspai as sp
from statspai.exceptions import DataInsufficient, StatsPAIError


@pytest.fixture(scope="module")
def io_data():
    """Directed-network DGP: Y = 1 + 0.6 D + 0.4 E_in + 0.2 E_out + noise."""
    rng = np.random.default_rng(0)
    n = 3000
    d = (rng.uniform(size=n) < 0.5).astype(float)
    e_in = rng.uniform(size=n)
    e_out = rng.uniform(size=n)
    y = 1.0 + 0.6 * d + 0.4 * e_in + 0.2 * e_out + rng.normal(scale=0.5, size=n)
    return pd.DataFrame(dict(y=y, d=d, e_in=e_in, e_out=e_out))


@pytest.fixture(scope="module")
def nh_data():
    """Network HTE DGP: Y = 1 + 0.8 D + 0.5 E + 0.3 X1 + noise."""
    rng = np.random.default_rng(0)
    n = 900
    d = (rng.uniform(size=n) < 0.5).astype(float)
    e = rng.uniform(size=n)
    x1 = rng.normal(size=n)
    x2 = rng.normal(size=n)
    y = 1.0 + 0.8 * d + 0.5 * e + 0.3 * x1 + rng.normal(scale=0.5, size=n)
    return pd.DataFrame(dict(y=y, d=d, e=e, x1=x1, x2=x2))


def _io(data, inward="e_in"):
    return sp.inward_outward_spillover(
        data, y="y", treatment="d", inward_exposure=inward, outward_exposure="e_out"
    )


def _nh(data, neighbor="e"):
    return sp.network_hte(
        data,
        y="y",
        treatment="d",
        neighbor_exposure=neighbor,
        covariates=["x1", "x2"],
        n_folds=5,
        random_state=0,
    )


class TestInwardOutwardFailLoud:
    def test_three_rows_raises(self, io_data):
        # n=3 <= 4 params: previously a silent garbage decomposition.
        with pytest.raises(DataInsufficient):
            _io(io_data.iloc[:3])

    def test_all_nan_raises(self, io_data):
        # previously returned inward=nan / outward=nan silently.
        with pytest.raises(DataInsufficient):
            _io(io_data.assign(y=np.nan))

    def test_missing_column_raises_statspai(self, io_data):
        with pytest.raises(StatsPAIError):
            _io(io_data, inward="NOPE")

    def test_non_dataframe_raises(self):
        with pytest.raises(StatsPAIError):
            _io([1, 2, 3])


class TestNetworkHteFailLoud:
    def test_tiny_n_raises_for_cv(self, nh_data):
        with pytest.raises(DataInsufficient):
            _nh(nh_data.iloc[:5])

    def test_missing_column_raises_statspai(self, nh_data):
        with pytest.raises(StatsPAIError):
            _nh(nh_data, neighbor="NOPE")


class TestCorrectness:
    def test_inward_outward_recovers_coefficients(self, io_data):
        r = _io(io_data)
        assert abs(r.inward_effect - 0.4) < 0.15
        assert abs(r.outward_effect - 0.2) < 0.15
        assert r.inward_se > 0 and r.outward_se > 0

    def test_network_hte_recovers_direct_and_spillover(self, nh_data):
        r = _nh(nh_data)
        assert abs(r.direct_effect - 0.8) < 0.25
        assert abs(r.spillover_effect - 0.5) < 0.25
        assert r.direct_se > 0 and r.spillover_se > 0

    def test_happy_path_numerics_finite(self, io_data, nh_data):
        assert np.isfinite(_io(io_data).ratio_in_out)
        assert np.isfinite(_nh(nh_data).individual_direct).all()


class TestAgentNativeCards:
    @pytest.mark.parametrize("name", ["network_hte", "inward_outward_spillover"])
    def test_cards_present(self, name):
        d = sp.describe_function(name)
        assert d["assumptions"]
        assert d["failure_modes"]
        assert d["alternatives"]
