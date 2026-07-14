import numpy as np
import pandas as pd
import pytest

import statspai as sp
from statspai.exceptions import DataInsufficient, MethodIncompatibility


def _ltmle_frame(n: int = 80) -> pd.DataFrame:
    rng = np.random.default_rng(137)
    l0 = rng.normal(size=n)
    a0 = rng.binomial(1, 1 / (1 + np.exp(-0.4 * l0)))
    l1 = 0.3 * l0 + 0.2 * a0 + rng.normal(size=n)
    a1 = rng.binomial(1, 1 / (1 + np.exp(-0.4 * l1)))
    y = 1.0 + 0.4 * a0 + 0.3 * a1 + 0.2 * l1 + rng.normal(scale=0.2, size=n)
    return pd.DataFrame({"L0": l0, "A0": a0, "L1": l1, "A1": a1, "Y": y})


def test_ltmle_rejects_mismatched_time_blocks_with_taxonomy() -> None:
    df = _ltmle_frame()
    with pytest.raises(MethodIncompatibility, match="equal length"):
        sp.ltmle(
            df,
            y="Y",
            treatments=["A0", "A1"],
            covariates_time=[["L0"]],
        )


def test_ltmle_rejects_missing_columns_with_taxonomy() -> None:
    df = _ltmle_frame()
    with pytest.raises(MethodIncompatibility, match="Missing columns"):
        sp.ltmle(
            df,
            y="Y",
            treatments=["A0", "missing"],
            covariates_time=[["L0"], ["L1"]],
        )


def test_ltmle_rejects_bad_bounds_and_empty_data_with_taxonomy() -> None:
    df = _ltmle_frame()
    with pytest.raises(MethodIncompatibility, match="propensity_bounds"):
        sp.ltmle(
            df,
            y="Y",
            treatments=["A0", "A1"],
            covariates_time=[["L0"], ["L1"]],
            propensity_bounds=(0.8, 0.2),
        )
    with pytest.raises(DataInsufficient, match="at least two"):
        sp.ltmle(
            df.iloc[:1],
            y="Y",
            treatments=["A0"],
            covariates_time=[["L0"]],
        )


def test_ltmle_rejects_bad_dynamic_regime_with_taxonomy() -> None:
    df = _ltmle_frame()

    def bad_policy(k, hist):
        return np.ones(10, dtype=int)

    with pytest.raises(MethodIncompatibility, match="returned length"):
        sp.ltmle(
            df,
            y="Y",
            treatments=["A0", "A1"],
            covariates_time=[["L0"], ["L1"]],
            regime_treated=bad_policy,
        )
