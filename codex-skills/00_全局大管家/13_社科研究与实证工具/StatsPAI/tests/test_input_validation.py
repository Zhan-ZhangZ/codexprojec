"""Contract tests for the shared fail-loud input-validation primitive.

``statspai._input_validation`` centralises the "validate columns + enforce an
identification floor" guard that estimators previously re-implemented (or, more
often, omitted — letting a typo'd column raise a cryptic ``KeyError`` and an
empty / degenerate frame return a silent NaN).  This suite pins the primitive
directly and pins ``four_way_decomposition`` as a representative consumer, so
the guard cannot regress for either.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

import statspai as sp
from statspai._input_validation import clean_frame, require_columns
from statspai.exceptions import DataInsufficient, StatsPAIError


@pytest.fixture
def frame():
    return pd.DataFrame({"a": [1.0, 2.0, 3.0, 4.0], "b": [5.0, 6.0, 7.0, 8.0]})


class TestRequireColumns:
    def test_passes_when_all_present(self, frame):
        require_columns(frame, ["a", "b"], function="f")  # no raise

    def test_missing_column_names_the_offender(self, frame):
        with pytest.raises(StatsPAIError) as exc:
            require_columns(frame, ["a", "zzz"], function="f")
        msg = str(exc.value)
        assert "zzz" in msg and "not found" in msg

    def test_non_dataframe_raises(self):
        with pytest.raises(StatsPAIError):
            require_columns([1, 2, 3], ["a"], function="f")


class TestCleanFrame:
    def test_returns_complete_cases_reindexed(self, frame):
        dirty = frame.copy()
        dirty.loc[1, "a"] = np.nan
        out = clean_frame(dirty, ["a", "b"], function="f", n_params=1)
        assert len(out) == 3
        assert list(out.index) == [0, 1, 2]  # reset

    def test_floor_is_strict(self, frame):
        # n_params == n_rows must raise (need strictly more rows than params).
        with pytest.raises(DataInsufficient):
            clean_frame(frame, ["a", "b"], function="f", n_params=4)
        # one fewer parameter is fine.
        clean_frame(frame, ["a", "b"], function="f", n_params=3)

    def test_empty_after_dropna_raises(self, frame):
        allnan = frame.assign(a=np.nan)
        with pytest.raises(DataInsufficient):
            clean_frame(allnan, ["a", "b"], function="f", n_params=1)

    def test_datainsufficient_is_valueerror(self, frame):
        with pytest.raises(ValueError):
            clean_frame(frame.iloc[:0], ["a", "b"], function="f", n_params=1)


@pytest.fixture(scope="module")
def med_data():
    rng = np.random.default_rng(0)
    n = 600
    X = rng.normal(size=n)
    D = rng.integers(0, 2, size=n)
    M = 0.5 * D + 0.3 * X + rng.normal(size=n) * 0.5
    Y = 1.0 * D + 0.8 * M + 0.2 * X + rng.normal(size=n) * 0.5
    return pd.DataFrame(dict(Y=Y, D=D, M=M, X=X))


class TestFourWayConsumer:
    def test_missing_mediator_raises_statspai(self, med_data):
        with pytest.raises(StatsPAIError):
            sp.four_way_decomposition(med_data, y="Y", treat="D", mediator="NOPE")

    def test_single_row_raises_datainsufficient(self, med_data):
        with pytest.raises(DataInsufficient):
            sp.four_way_decomposition(med_data.iloc[:1], y="Y", treat="D", mediator="M")

    def test_non_dataframe_raises(self):
        with pytest.raises(StatsPAIError):
            sp.four_way_decomposition([1, 2, 3], y="Y", treat="D", mediator="M")

    def test_happy_path_additive_identity_unchanged(self, med_data):
        fw = sp.four_way_decomposition(
            med_data, y="Y", treat="D", mediator="M", covariates=["X"]
        )
        total = fw.cde + fw.int_ref + fw.int_med + fw.pie
        assert fw.total_effect == pytest.approx(total, abs=1e-9)
        assert fw.cde == pytest.approx(1.0, abs=0.2)  # known-truth DGP
