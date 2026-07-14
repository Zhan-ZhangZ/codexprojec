"""Shared bootstrap-SE helper.

Replaces the silent ``float(np.nanstd(boot, ddof=1)) or 1e-6`` antipattern
that recurs across ~15 estimators. That idiom:

* swallows per-replicate failures with no count or warning, and
* when survivors are few, reports an over-narrow SE (and thus an
  over-confident CI) with zero signal to the user.

``bootstrap_se`` keeps the *exact* behavior on a healthy run (every replicate
finite → ``np.nanstd`` of all replicates, same number as before) but:

* warns when any replicate failed (NaN), reporting the failure fraction, and
* returns ``np.nan`` — not a fabricated tiny SE — when the number of
  successful replicates falls below a floor, so downstream CIs are honestly
  undefined rather than spuriously narrow.

This follows the loud-failure templates already used by
``decomposition.yu_elwert`` and ``surrogate.index`` (CLAUDE.md §7).
"""

from __future__ import annotations

import warnings
from typing import Any

import numpy as np

__all__ = ["bootstrap_se"]


def bootstrap_se(
    boot: Any,
    n_attempted: int | None = None,
    label: str = "bootstrap",
    *,
    min_success: int = 2,
    min_success_frac: float = 0.0,
    ddof: int = 1,
    warn: bool = True,
) -> float:
    """Standard error from bootstrap replicates, surfacing failures loudly.

    Parameters
    ----------
    boot : array-like
        Bootstrap replicate estimates. Failed replicates should be stored as
        ``np.nan`` (the common pre-fill pattern ``np.full(B, np.nan)``).
    n_attempted : int, optional
        Number of replicates attempted. Defaults to ``len(boot)``. Pass this
        when ``boot`` is not pre-sized to the full attempt count.
    label : str
        Human-readable estimator/section name used in warning messages.
    min_success : int
        Absolute minimum number of finite replicates required to return a
        finite SE. Below this, returns ``np.nan``.
    min_success_frac : float
        Fractional floor on success rate (e.g. ``0.5`` requires ≥50% of
        attempts to succeed). The effective floor is
        ``max(min_success, ceil(min_success_frac * n_attempted))``.
    ddof : int
        Delta degrees of freedom for ``np.std`` (default 1, sample SD).
    warn : bool
        Emit ``RuntimeWarning`` on failures / floor breach.

    Returns
    -------
    float
        ``np.std(successful_replicates, ddof=ddof)``, or ``np.nan`` when too
        few replicates succeeded.
    """
    boot = np.asarray(boot, dtype=float)
    finite = np.isfinite(boot)
    n_success = int(finite.sum())
    n_total = len(boot) if n_attempted is None else int(n_attempted)
    n_failed = max(n_total - n_success, 0)

    floor = max(int(min_success), int(np.ceil(min_success_frac * n_total)))

    if n_success < floor:
        if warn:
            warnings.warn(
                f"{label}: only {n_success}/{n_total} bootstrap replicates "
                f"succeeded (need ≥{floor}); standard error is undefined "
                f"and reported as NaN rather than a fabricated value.",
                RuntimeWarning,
                stacklevel=2,
            )
        return float("nan")

    if n_failed > 0 and warn:
        warnings.warn(
            f"{label}: {n_failed}/{n_total} bootstrap replicates failed; "
            f"SE/CI computed over {n_success} successful replicates.",
            RuntimeWarning,
            stacklevel=2,
        )

    return float(np.nanstd(boot, ddof=ddof))
