"""End-to-end numerical-coherence test for the sharp-RD workflow.

On a sharp design with a known discontinuity of 3.0 at the cutoff, the
estimate must recover the jump with a CI that excludes zero, while a placebo
cutoff placed where there is no discontinuity must return a near-zero effect.
"""

import numpy as np
import pandas as pd
import pytest

import statspai as sp

TRUE_JUMP = 3.0


@pytest.fixture
def rd_data():
    rng = np.random.RandomState(3)
    n = 3000
    x = rng.uniform(-1, 1, n)  # running variable, cutoff at 0
    y = 1.0 + 2.0 * x + TRUE_JUMP * (x >= 0) + rng.randn(n) * 0.5
    return pd.DataFrame({"y": y, "x": x})


def test_sharp_rd_recovers_jump(rd_data):
    r = sp.rdrobust(rd_data, y="y", x="x", c=0.0)
    assert r.estimate == pytest.approx(TRUE_JUMP, abs=0.6)
    lo, hi = r.ci
    # The discontinuity is real and large: the CI excludes zero.
    assert lo > 0
    assert r.pvalue < 0.01


def test_placebo_cutoff_has_no_effect(rd_data):
    # Restrict to the left of the true cutoff and test a fake cutoff there:
    # there is no discontinuity, so the estimated jump should hug zero.
    left = rd_data[rd_data["x"] < 0]
    placebo = sp.rdrobust(left, y="y", x="x", c=-0.5)
    real = sp.rdrobust(rd_data, y="y", x="x", c=0.0)
    assert abs(placebo.estimate) < 1.0
    # And it is far smaller than the genuine discontinuity.
    assert abs(placebo.estimate) < abs(real.estimate)
