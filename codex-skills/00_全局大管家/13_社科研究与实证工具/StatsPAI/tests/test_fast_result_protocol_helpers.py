"""Tests for fast-result JSON helper edge cases."""

from __future__ import annotations

import math

import numpy as np
import pandas as pd

from statspai.fast._result_protocol import (
    distribution_summary,
    jsonable,
    tidy_records,
)


def test_jsonable_converts_nonfinite_numpy_scalars_to_none():
    payload = {"finite": np.float64(1.25), "bad": np.float64(math.inf)}

    out = jsonable(payload)

    assert out == {"finite": 1.25, "bad": None}


def test_tidy_records_returns_json_safe_record_dicts():
    df = pd.DataFrame(
        {"estimate": [np.float64(2.0), np.nan]},
        index=["x1", "x2"],
    )

    out = tidy_records(df)

    assert out == [
        {"term": "x1", "estimate": 2.0},
        {"term": "x2", "estimate": None},
    ]


def test_distribution_summary_ignores_nonfinite_draws():
    out = distribution_summary([1.0, 2.0, np.nan, np.inf])

    assert out["n"] == 4
    assert out["mean"] == 1.5
    assert out["sd"] > 0.0
