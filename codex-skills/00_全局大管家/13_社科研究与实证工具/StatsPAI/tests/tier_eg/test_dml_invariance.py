"""Tier E — invariance / metamorphic tests for ``sp.dml`` (double ML, PLR).

This complements ``tests/test_dml_orthogonality_invariants.py`` (which pins the
DML2 pooled identity, Neyman moment ≈ 0, the sandwich-SE identity and the
repeated-cross-fitting aggregation). Here we add the *metamorphic* invariances:

* **Seed determinism** — identical ``random_state`` ⇒ bit-identical θ̂ and SE.
* **Outcome scale / shift equivariance** and **treatment-scale equivariance**,
  which are *exact* for the partially-linear model when the nuisance learners
  are linear (``LinearRegression``): θ = cov(ỹ, d̃)/var(d̃).
* **Covariate column-reordering** invariance.

Note on row permutation: DML cross-fitting assigns folds by *positional* index,
so shuffling rows reshuffles folds and perturbs θ̂ by Monte-Carlo cross-fit
noise — it is **not** an exact invariance. We assert instead that the
perturbation stays well inside one standard error (a robustness statement about
cross-fit stability), and pin exact determinism via the seed.

References
----------
- Chernozhukov, V. et al. (2018). Double/debiased machine learning for
  treatment and structural parameters. *The Econometrics Journal*, 21(1),
  C1-C68. [@chernozhukov2018double]
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

import statspai as sp

from ._helpers import assert_invariant, assert_scaled

pytest.importorskip("sklearn")
from sklearn.linear_model import LinearRegression  # noqa: E402

pytestmark = pytest.mark.filterwarnings("ignore")

_P = 5
_XCOLS = [f"x{i}" for i in range(_P)]


def _make(n=600, theta=2.0, seed=0):
    rng = np.random.default_rng(seed)
    X = rng.normal(size=(n, _P))
    g = X @ np.array([1.0, -1.0, 0.5, 0.0, 0.3])
    m = X @ np.array([0.5, 0.2, 0.0, -0.4, 0.1])
    d = m + rng.normal(size=n)
    y = theta * d + g + rng.normal(size=n)
    df = pd.DataFrame(X, columns=_XCOLS)
    df["d"] = d
    df["y"] = y
    return df


def _fit(df, *, covariates=None, seed=42):
    return sp.dml(
        data=df,
        y="y",
        treat="d",
        covariates=covariates or _XCOLS,
        model="plr",
        ml_g=LinearRegression(),
        ml_m=LinearRegression(),
        n_folds=4,
        n_rep=1,
        random_state=seed,
    )


@pytest.fixture(scope="module")
def base_df():
    return _make(seed=11)


# --------------------------------------------------------------------------- #
# E11 — seed determinism (exact)                                              #
# --------------------------------------------------------------------------- #
def test_dml_seed_determinism(base_df):
    a = _fit(base_df, seed=7)
    b = _fit(base_df, seed=7)
    assert a.estimate == b.estimate, "same seed gave different θ̂"
    assert a.se == b.se, "same seed gave different SE"


def test_dml_distinct_seeds_within_cross_fit_band(base_df):
    """Different fold seeds perturb θ̂ only by cross-fit Monte-Carlo noise —
    well inside one SE for a well-identified linear DGP."""
    a = _fit(base_df, seed=1)
    b = _fit(base_df, seed=999)
    assert abs(a.estimate - b.estimate) < a.se, (
        f"cross-fit seed change moved θ̂ by ≥1 SE: "
        f"{a.estimate} vs {b.estimate} (se={a.se})"
    )


# --------------------------------------------------------------------------- #
# E2 / E3 — outcome shift & scale equivariance (exact with linear learners)   #
# --------------------------------------------------------------------------- #
def test_dml_outcome_shift_invariant(base_df):
    base = _fit(base_df)
    got = _fit(base_df.assign(y=base_df["y"] + 12.0))
    assert_invariant(base.estimate, got.estimate, what="θ̂ (y shift)")
    assert_invariant(base.se, got.se, what="SE (y shift)")


@pytest.mark.parametrize("a", [3.0, -2.0, 0.25])
def test_dml_outcome_scale_equivariant(base_df, a):
    base = _fit(base_df)
    got = _fit(base_df.assign(y=a * base_df["y"]))
    assert_scaled(base.estimate, got.estimate, a, what="θ̂ (y scale)")
    assert_scaled(base.se, got.se, abs(a), what="SE (y scale)")


# --------------------------------------------------------------------------- #
# E (DML-specific) — treatment-scale equivariance                            #
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize("c", [2.0, 0.5])
def test_dml_treatment_scale_equivariant(base_df, c):
    """d -> d/c scales θ̂ by c (θ = cov(ỹ,d̃)/var(d̃))."""
    base = _fit(base_df)
    got = _fit(base_df.assign(d=base_df["d"] / c))
    assert_scaled(base.estimate, got.estimate, c, what="θ̂ (d scale)")


# --------------------------------------------------------------------------- #
# E8 — covariate column reordering invariance                                 #
# --------------------------------------------------------------------------- #
def test_dml_covariate_reorder_invariant(base_df):
    base = _fit(base_df, covariates=_XCOLS)
    got = _fit(base_df, covariates=list(reversed(_XCOLS)))
    assert_invariant(base.estimate, got.estimate, rtol=1e-9, what="θ̂ (reorder)")
    assert_invariant(base.se, got.se, rtol=1e-9, what="SE (reorder)")


# --------------------------------------------------------------------------- #
# cross-fit robustness — permutation stays within an SE                       #
# --------------------------------------------------------------------------- #
def test_dml_row_permutation_within_one_se(base_df):
    base = _fit(base_df)
    perm = base_df.sample(frac=1.0, random_state=3).reset_index(drop=True)
    got = _fit(perm)
    assert (
        abs(got.estimate - base.estimate) < base.se
    ), "row permutation moved θ̂ by ≥1 SE — cross-fit instability"
