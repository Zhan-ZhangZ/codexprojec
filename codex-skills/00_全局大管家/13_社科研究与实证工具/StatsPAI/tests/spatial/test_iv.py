"""Spatial IV known-truth tests."""

from __future__ import annotations

import numpy as np
import pandas as pd

from statspai.spatial.iv import spatial_iv


def test_spatial_iv_matches_noiseless_2sls_without_spatial_lag():
    n = 12
    x = np.linspace(-1.0, 1.0, n)
    z = np.linspace(-2.0, 2.0, n) + np.r_[np.zeros(n // 2), np.full(n - n // 2, 0.3)]
    d = 0.5 * x + 2.0 * z
    y = 1.0 + 1.5 * d + 0.25 * x
    data = pd.DataFrame({"y": y, "d": d, "x": x, "z": z})

    res = spatial_iv(
        data,
        y="y",
        endog=["d"],
        exog=["x"],
        W=np.eye(n),
        instruments=["z"],
        include_WY=False,
    )

    coefs = res.coefficients.set_index("variable")["coef"]
    np.testing.assert_allclose(coefs["d"], 1.5, atol=1e-10)
    np.testing.assert_allclose(coefs["(Intercept)"], 1.0, atol=1e-10)
    np.testing.assert_allclose(coefs["x"], 0.25, atol=1e-10)
