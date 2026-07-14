"""Correctness tests for the structural-break sup-F test.

Regression guard for the fix that replaced the naive ``F(k, n-2k)`` p-value
(which rejected on ~35% of white-noise series at the 5% level because it
ignored the maximisation over candidate break points) with the Andrews (1993)
sup-F asymptotic null.

Reference for the limit law:
    Andrews, D.W.K. (1993). "Tests for Parameter Instability and Structural
    Change with Unknown Change Point." Econometrica, 61(4), 821-856.
    doi:10.2307/2951764.
"""

import numpy as np
import pandas as pd

from statspai.timeseries.structural_break import (
    structural_break,
    _supf_null_distribution,
    _supf_pvalue,
)


def test_supf_null_matches_andrews_critical_value():
    """The simulated null reproduces the Andrews (1993) sup-F 5% point.

    For q=1, symmetric trimming pi0=0.15 the asymptotic 5% critical value is
    ~8.85 (Andrews 1993, Table I, corrected). The discrete-grid simulation
    sits a hair below the continuous value; a generous bracket is enough to
    catch a broken implementation.
    """
    null = _supf_null_distribution(1, 500, 0.15)
    c95 = float(np.quantile(null, 0.95))
    assert 8.0 < c95 < 9.6, c95
    # Monotone tail ordering as a structural sanity check.
    c90, c99 = np.quantile(null, [0.90, 0.99])
    assert c90 < c95 < c99


def test_supf_pvalue_monotone_and_bounded():
    p_small = _supf_pvalue(2.0, q=1, n=200, trimming=0.15)
    p_large = _supf_pvalue(20.0, q=1, n=200, trimming=0.15)
    assert 0.0 < p_large <= p_small <= 1.0
    # A tiny / non-positive statistic is never significant.
    assert _supf_pvalue(0.0, q=1, n=200, trimming=0.15) == 1.0
    assert _supf_pvalue(-np.inf, q=2, n=200, trimming=0.15) == 1.0


def test_supf_size_on_white_noise():
    """False-positive rate under H0 must be near alpha, not ~35%."""
    rng = np.random.default_rng(2024)
    n, reps, alpha = 150, 250, 0.05
    rejections = 0
    for _ in range(reps):
        df = pd.DataFrame({"y": rng.normal(0, 1, n)})
        res = structural_break(data=df, y="y", method="sup-f", alpha=alpha)
        rejections += int(res.p_values < alpha)
    fp = rejections / reps
    # Buggy implementation gave ~0.33-0.37; nominal is 0.05. The bracket is
    # comfortably between the two and robust to Monte-Carlo noise at reps=250.
    assert fp < 0.15, f"false-positive rate {fp:.3f} too high (size not controlled)"


def test_supf_power_on_mean_shift():
    """A clear mean shift is detected at the correct location."""
    rng = np.random.default_rng(7)
    y = np.concatenate([rng.normal(0, 1, 100), rng.normal(3, 1, 100)])
    df = pd.DataFrame({"y": y})
    res = structural_break(data=df, y="y", method="sup-f")
    assert res.p_values < 0.01
    assert res.break_dates and abs(res.break_dates[0] - 100) <= 10


def test_supf_pvalue_is_deterministic():
    rng = np.random.default_rng(1)
    df = pd.DataFrame({"y": rng.normal(0, 1, 180)})
    p1 = structural_break(data=df, y="y", method="sup-f").p_values
    p2 = structural_break(data=df, y="y", method="sup-f").p_values
    assert p1 == p2


def test_bai_perron_exposes_aligned_stats():
    """Bai-Perron now returns per-break sup-F stats / p-values, sorted."""
    rng = np.random.default_rng(3)
    y = np.concatenate(
        [rng.normal(0, 1, 80), rng.normal(4, 1, 80), rng.normal(0, 1, 80)]
    )
    df = pd.DataFrame({"y": y})
    res = structural_break(data=df, y="y", method="bai-perron", max_breaks=5)
    assert res.n_breaks >= 1
    assert res.f_stats is not None and res.p_values is not None
    assert len(res.f_stats) == len(res.break_dates) == len(res.p_values)
    assert res.break_dates == sorted(res.break_dates)
    assert all(p < 0.05 for p in res.p_values)


def test_bai_perron_no_false_breaks_on_white_noise():
    rng = np.random.default_rng(99)
    n, reps = 150, 120
    any_break = 0
    for _ in range(reps):
        df = pd.DataFrame({"y": rng.normal(0, 1, n)})
        res = structural_break(data=df, y="y", method="bai-perron")
        any_break += int(res.n_breaks > 0)
    rate = any_break / reps
    assert rate < 0.15, f"spurious-break rate {rate:.3f} too high"
