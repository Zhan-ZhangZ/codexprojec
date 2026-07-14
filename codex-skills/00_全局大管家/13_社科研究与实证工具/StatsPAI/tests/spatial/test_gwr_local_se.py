"""GWR must report local standard errors / t-values, not just local coefs.

Regression test for the inference gap: ``gwr`` previously returned only the
local coefficient matrix ``params (n, k)`` with no measure of local
uncertainty, so a user could not tell *where* a covariate's effect is
significant — the whole point of geographically weighted regression. Local
SEs now follow Fotheringham, Brunsdon & Charlton (2002, §2.4):

    Var(β̂_i) = σ̂² C_i C_i',   C_i = (X'W_iX)^{-1} X'W_i,
    σ̂² = RSS / (n - 2 tr(S) + tr(S'S)).

Correctness anchor: in the global (very large bandwidth) limit every local
regression becomes ordinary least squares, so the local SE must collapse to
the OLS standard error, identical across all locations.
"""

import numpy as np

from statspai.spatial.gwr.gwr import gwr


def _spatially_varying(seed=0, n=250):
    rng = np.random.default_rng(seed)
    coords = rng.uniform(0, 10, (n, 2))
    x = rng.normal(size=n)
    beta_local = 0.5 + 0.15 * coords[:, 0]
    y = 1 + beta_local * x + rng.normal(size=n) * 0.5
    return coords, y, x.reshape(-1, 1)


def test_local_se_and_tvals_present():
    coords, y, X = _spatially_varying()
    r = gwr(coords, y, X, bw=4.0)
    assert r.se is not None and r.tvals is not None
    assert r.se.shape == r.params.shape == r.tvals.shape
    assert np.all(np.isfinite(r.se))
    assert np.all(r.se > 0)


def test_global_limit_matches_ols_se():
    coords, y, X = _spatially_varying()
    r = gwr(coords, y, X, bw=1e6)  # huge bandwidth -> global OLS

    # OLS SE computed directly (no statsmodels dependency)
    n = len(y)
    Xc = np.column_stack([np.ones(n), X])
    XtX_inv = np.linalg.inv(Xc.T @ Xc)
    beta = XtX_inv @ Xc.T @ y
    resid = y - Xc @ beta
    sigma2 = float(resid @ resid) / (n - Xc.shape[1])
    ols_se = np.sqrt(np.diag(sigma2 * XtX_inv))

    # every location's local SE collapses to the OLS SE
    np.testing.assert_allclose(r.se.mean(axis=0), ols_se, rtol=0.02)
    # ...and barely varies across locations
    assert np.all(r.se.std(axis=0) < 0.01)


def test_tvals_consistent_with_params_over_se():
    coords, y, X = _spatially_varying()
    r = gwr(coords, y, X, bw=4.0)
    np.testing.assert_allclose(r.tvals, r.params / r.se, rtol=1e-10)
