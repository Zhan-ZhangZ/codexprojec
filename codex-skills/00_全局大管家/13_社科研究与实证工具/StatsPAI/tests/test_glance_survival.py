"""Regression: ``.glance()`` must not crash on survival results.

Cox and parametric-survival (``survreg``) results deliberately store
``df_resid = inf`` to signal a large-sample (normal) reference distribution.
``glance()`` cast it with ``int()`` unconditionally, raising
``OverflowError: cannot convert float infinity to integer`` — even though both
result classes advertise ``.glance()`` (a §3 unified-result-object method).
"""

import numpy as np
import pandas as pd
import pytest

import statspai as sp


@pytest.fixture
def survival_data():
    rng = np.random.RandomState(2)
    n = 300
    return pd.DataFrame(
        {
            "dur": rng.exponential(5, n),
            "event": rng.binomial(1, 0.7, n),
            "x1": rng.randn(n),
        }
    )


@pytest.mark.parametrize("estimator", ["cox", "survreg"])
def test_glance_handles_infinite_df_resid(survival_data, estimator):
    fn = getattr(sp, estimator)
    res = fn(formula="dur ~ x1", data=survival_data, duration="dur", event="event")
    glance = res.glance()  # previously OverflowError
    assert len(glance) == 1
    # The infinite residual df is preserved (not silently coerced to a bogus int).
    assert not np.isfinite(glance["df_resid"].iloc[0])


def test_finite_df_resid_stays_integer():
    rng = np.random.RandomState(0)
    df = pd.DataFrame({"x": rng.randn(60)})
    df["y"] = 1.0 + 2.0 * df["x"] + rng.randn(60)
    glance = sp.regress("y ~ x", df).glance()
    # Ordinary results keep an integer residual df — the fix is non-finite-only.
    assert float(glance["df_resid"].iloc[0]).is_integer()
    assert glance["df_resid"].iloc[0] == 58
