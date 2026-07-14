"""SAR/SEM spatial-parameter standard errors must equal the information
matrix (i.e. the inverse numerical Hessian of the exact log-likelihood).

Regression test for the SE fix: the earlier ``_spatial_se_rho`` /
``_spatial_se_lambda`` dropped the ``tr(G'G)`` term, overstating the spatial
parameter SE by ~40-50%. Here we compute the *exact* asymptotic SE from a
numerical Hessian of the full Gaussian log-likelihood (using ``slogdet`` for
the Jacobian) and require the reported SE to match it closely.
"""

import numpy as np
import pandas as pd
import pytest

from statspai.spatial import sar, sem


def _make_W(n, seed, cutoff=0.13):
    rng = np.random.default_rng(seed)
    coords = rng.uniform(0, 1, (n, 2))
    d = np.sqrt(((coords[:, None, :] - coords[None, :, :]) ** 2).sum(-1))
    W = (d < cutoff).astype(float)
    np.fill_diagonal(W, 0.0)
    return W / np.maximum(W.sum(1, keepdims=True), 1.0)


def _num_hessian_se(negll, theta, idx, steps):
    p = len(theta)
    H = np.zeros((p, p))
    for i in range(p):
        for j in range(p):
            ei = np.zeros(p)
            ei[i] = steps[i]
            ej = np.zeros(p)
            ej[j] = steps[j]
            H[i, j] = (
                negll(theta + ei + ej)
                - negll(theta + ei - ej)
                - negll(theta - ei + ej)
                + negll(theta - ei - ej)
            ) / (4 * steps[i] * steps[j])
    return float(np.sqrt(np.linalg.inv(H)[idx, idx]))


def test_sar_rho_se_matches_information_matrix():
    n = 400
    W = _make_W(n, seed=1)
    rng = np.random.default_rng(2)
    x = rng.normal(size=n)
    I = np.eye(n)
    Xd = np.column_stack([np.ones(n), x])
    Y = np.linalg.solve(I - 0.6 * W, 1.0 + 0.8 * x + rng.normal(size=n))
    df = pd.DataFrame({"y": Y, "x": x})

    res = sar(W, df, "y ~ x")
    rho_hat = float(res.params["rho"])
    reported = float(res.std_errors["rho"])

    beta = np.array([res.params["const"], res.params["x"]])
    e = (I - rho_hat * W) @ Y - Xd @ beta
    s2 = float(e @ e) / n

    def negll(th):  # th = [b0, b1, rho, s2]
        b, rho, sig2 = th[:2], th[2], th[3]
        if sig2 <= 0 or abs(rho) >= 0.999:
            return 1e12
        A = I - rho * W
        resid = A @ Y - Xd @ b
        _, ld = np.linalg.slogdet(A)
        return -(-n / 2 * np.log(2 * np.pi * sig2) + ld - resid @ resid / (2 * sig2))

    theta = np.array([beta[0], beta[1], rho_hat, s2])
    steps = np.array([1e-4, 1e-4, 1e-4, s2 * 1e-3])
    exact = _num_hessian_se(negll, theta, 2, steps)

    # analytic information-matrix SE must match the numerical Hessian
    assert reported == pytest.approx(
        exact, rel=0.05
    ), f"SAR rho SE {reported:.4f} vs information-matrix {exact:.4f}"


def test_sem_lambda_se_matches_information_matrix():
    n = 400
    W = _make_W(n, seed=3)
    rng = np.random.default_rng(4)
    x = rng.normal(size=n)
    I = np.eye(n)
    Xd = np.column_stack([np.ones(n), x])
    eps = np.linalg.solve(I - 0.5 * W, rng.normal(size=n))
    Y = 1.0 + 0.8 * x + eps
    df = pd.DataFrame({"y": Y, "x": x})

    res = sem(W, df, "y ~ x")
    lam_hat = float(res.params["lambda"])
    reported = float(res.std_errors["lambda"])

    def negll(th):  # th = [b0, b1, lam, s2]
        b, lam, sig2 = th[:2], th[2], th[3]
        if sig2 <= 0 or abs(lam) >= 0.999:
            return 1e12
        B = I - lam * W
        resid = B @ (Y - Xd @ b)
        _, ld = np.linalg.slogdet(B)
        return -(-n / 2 * np.log(2 * np.pi * sig2) + ld - resid @ resid / (2 * sig2))

    B = I - lam_hat * W
    bgls = np.linalg.lstsq(B @ Xd, B @ Y, rcond=None)[0]
    e = B @ (Y - Xd @ bgls)
    s2 = float(e @ e) / n
    theta = np.array([bgls[0], bgls[1], lam_hat, s2])
    steps = np.array([1e-4, 1e-4, 1e-4, s2 * 1e-3])
    exact = _num_hessian_se(negll, theta, 2, steps)

    assert reported == pytest.approx(
        exact, rel=0.05
    ), f"SEM lambda SE {reported:.4f} vs information-matrix {exact:.4f}"
