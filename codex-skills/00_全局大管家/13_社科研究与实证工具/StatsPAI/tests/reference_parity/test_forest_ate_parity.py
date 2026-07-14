"""Analytical parity: sp.average_treatment_effect recovers a known ATE.

``sp.average_treatment_effect`` computes the AIPW ATE from a fitted
``sp.causal_forest``. On a deterministic confounded DGP with a known constant
treatment effect (ATE = 2.0), the doubly-robust estimate must recover the truth
within a bounded number of standard errors. This is an analytical-only record:
verified against a known DGP truth, no cross-package reference required.

The forest is seeded (``random_state=0``) so the test is deterministic.
"""

from __future__ import annotations

import numpy as np

import statspai as sp


def test_forest_ate_recovers_known_effect():
    rng = np.random.default_rng(3)
    n = 2000
    X = rng.normal(0, 1, (n, 3))
    ps = 1.0 / (1.0 + np.exp(-(0.4 * X[:, 0] - 0.3 * X[:, 1])))
    T = (rng.uniform(size=n) < ps).astype(int)
    Y = 1.0 + 2.0 * T + 0.7 * X[:, 0] - 0.5 * X[:, 1] + rng.normal(0, 1, n)

    cf = sp.causal_forest(Y=Y, T=T, X=X, random_state=0)
    res = sp.average_treatment_effect(cf)

    est, se = float(res["estimate"]), float(res["se"])
    # 4-sigma recovery band: P(false failure) ~ 6e-5.
    assert abs(est - 2.0) <= 4.0 * se, f"ATE {est:.4f} not within 4 SE of truth 2.0"
    # SE must be positive and finite (calibrated inference, not a point mass).
    assert 0.0 < se < 1.0
