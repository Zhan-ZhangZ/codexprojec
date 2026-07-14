"""Shared harness for the Tier E (invariance) + Tier G (robustness) campaign.

This module deliberately holds **no test functions** — only

* result accessors that normalise ``EconometricResults`` (``.params`` /
  ``.std_errors`` pandas Series) and ``CausalResult`` (``.estimate`` / ``.se``
  scalars) onto one interface,
* seeded data generators for each core design (cross-section IV, panel, 2x2 &
  staggered DiD, sharp/fuzzy RD, synthetic-control donor panels),
* small assertion helpers for metamorphic relations,
* a ``hypothesis`` profile tuned for numerical estimators (no deadline, modest
  example budget so the full campaign stays CI-friendly).

Everything here is import-only; pytest will not collect it.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

# --------------------------------------------------------------------------- #
# hypothesis profile (registered once, opt-in via settings(profile="tier_eg")) #
# --------------------------------------------------------------------------- #
try:  # hypothesis is a dev-extra; keep import soft so non-dev installs skip.
    from hypothesis import HealthCheck, settings

    settings.register_profile(
        "tier_eg",
        deadline=None,  # estimator fits are far slower than hypothesis' 200ms
        max_examples=25,  # property + a 6-module campaign: keep CI bounded
        suppress_health_check=[HealthCheck.too_slow, HealthCheck.data_too_large],
    )
    HAS_HYPOTHESIS = True
except Exception:  # pragma: no cover - exercised only on non-dev installs
    HAS_HYPOTHESIS = False


# --------------------------------------------------------------------------- #
# Result accessors                                                            #
# --------------------------------------------------------------------------- #
def coef(result, term=None):
    """Point estimate for ``term``.

    For ``EconometricResults`` (iv / panel / feols) ``term`` indexes the
    ``.params`` Series. For ``CausalResult`` (did / rd / synth / dml) ``term``
    is ignored and the scalar treatment effect ``.estimate`` is returned.
    """
    params = getattr(result, "params", None)
    if params is not None and term is not None:
        return float(np.asarray(params[term]))
    est = getattr(result, "estimate", None)
    if est is not None:
        return float(est)
    if params is not None and term is None:
        raise ValueError(
            "multi-coefficient result needs an explicit `term`; "
            f"available: {list(params.index)}"
        )
    raise AttributeError(f"{type(result).__name__} exposes no point estimate")


def stderr(result, term=None):
    """Standard error matching :func:`coef`."""
    ses = getattr(result, "std_errors", None)
    if ses is not None and term is not None:
        return float(np.asarray(ses[term]))
    se = getattr(result, "se", None)
    if se is not None:
        return float(se)
    if ses is not None and term is None:
        raise ValueError("multi-coefficient result needs an explicit `term`")
    raise AttributeError(f"{type(result).__name__} exposes no standard error")


def tstat(result, term=None):
    return coef(result, term) / stderr(result, term)


# --------------------------------------------------------------------------- #
# Assertion helpers                                                           #
# --------------------------------------------------------------------------- #
def assert_invariant(a, b, *, rtol=1e-7, atol=1e-9, what="estimate"):
    """Assert two scalars are equal up to FP reordering noise."""
    a, b = float(a), float(b)
    assert np.isfinite(a) and np.isfinite(b), f"{what}: non-finite ({a}, {b})"
    np.testing.assert_allclose(
        a,
        b,
        rtol=rtol,
        atol=atol,
        err_msg=f"{what} not invariant: {a!r} vs {b!r}",
    )


def assert_scaled(a, b, factor, *, rtol=1e-7, atol=1e-9, what="estimate"):
    """Assert ``b == factor * a`` (equivariance under a known scaling)."""
    np.testing.assert_allclose(
        float(b),
        factor * float(a),
        rtol=rtol,
        atol=atol,
        err_msg=f"{what} not scaled by {factor}: {a!r} -> {b!r}",
    )


def assert_finite_estimate(result, term=None):
    """A successful fit must report a finite point estimate AND SE (no silent
    NaN — CLAUDE.md §7)."""
    c, s = coef(result, term), stderr(result, term)
    assert np.isfinite(c), f"point estimate is non-finite: {c}"
    assert np.isfinite(s) and s >= 0, f"SE is non-finite/negative: {s}"


# --------------------------------------------------------------------------- #
# Robustness (Tier G) helpers                                                 #
# --------------------------------------------------------------------------- #
# Philosophy: the *forbidden* outcome on corrupt / degenerate input is a
# finite, plausible-looking, WRONG number (CLAUDE.md §7 — 失败要响亮). Raising
# an exception or surfacing NaN are both acceptable because a downstream
# consumer (human or agent) can detect them; a silent finite estimate cannot.


def classify_degenerate(fn, term=None, allow=(Exception,)):
    """Run ``fn`` (a no-arg fit on corrupt input) and classify its handling.

    Returns ``"raised"`` if it raised one of ``allow``, ``"nan"`` if it
    returned a result whose point estimate is non-finite or unextractable, or
    the finite ``float`` estimate otherwise.
    """
    try:
        r = fn()
    except allow:
        return "raised"
    try:
        c = coef(r, term)
    except Exception:
        return "nan"
    return "nan" if not np.isfinite(float(c)) else float(c)


def assert_no_silent_wrong(fn, term=None, allow=(Exception,)):
    """Assert corrupt input does not yield a silent finite estimate."""
    out = classify_degenerate(fn, term, allow)
    assert out in ("raised", "nan"), (
        f"corrupt input produced a silent finite estimate {out!r}; "
        "expected a raised exception or NaN (CLAUDE.md §7)"
    )


def assert_raises_clean(fn, *exc_types, match=None):
    """Assert ``fn`` raises one of ``exc_types`` with a non-empty message.

    Unlike ``pytest.raises`` this also rejects empty / unhelpful messages, so
    the §8 'usable error message' contract is enforced, not just the type.
    """
    if not exc_types:
        exc_types = (Exception,)
    try:
        fn()
    except exc_types as e:  # noqa: B902 - test helper
        msg = str(e)
        assert msg.strip(), f"{type(e).__name__} raised with an empty message"
        if match is not None:
            import re

            assert re.search(
                match, msg, re.I
            ), f"message {msg!r} does not match /{match}/"
        return e
    except Exception as e:  # pragma: no cover - wrong type is a hard failure
        raise AssertionError(f"expected {exc_types}, got {type(e).__name__}: {e}")
    raise AssertionError(f"expected one of {exc_types}, but no exception raised")


# --------------------------------------------------------------------------- #
# Seeded data generators                                                      #
# --------------------------------------------------------------------------- #
def make_iv(n=400, beta=2.0, pi=0.7, seed=0, n_exog=1):
    """Just-identified linear IV: y = a + beta*x + exog'g + u, x = pi*z + v,
    with corr(u,v) so OLS is biased and the instrument z is relevant."""
    rng = np.random.default_rng(seed)
    z = rng.normal(size=n)
    shared = rng.normal(size=n)  # induces endogeneity corr(u, v)
    v = 0.6 * shared + rng.normal(size=n)
    x = pi * z + v
    u = 0.6 * shared + rng.normal(size=n)
    cols = {"z": z, "x": x}
    mu = 1.0 + beta * x
    for j in range(n_exog):
        ej = rng.normal(size=n)
        cols[f"w{j+1}"] = ej
        mu = mu + (0.5 + 0.3 * j) * ej
    y = mu + u
    cols["y"] = y
    return pd.DataFrame(cols)


def make_panel(n_units=60, n_periods=6, beta=1.5, seed=0):
    """Balanced panel with unit + time effects and one regressor x."""
    rng = np.random.default_rng(seed)
    units = np.repeat(np.arange(n_units), n_periods)
    periods = np.tile(np.arange(n_periods), n_units)
    alpha = rng.normal(size=n_units)[units]  # unit FE
    gamma = rng.normal(size=n_periods)[periods]  # time FE
    x = 0.5 * alpha + rng.normal(size=n_units * n_periods)  # correlated w/ FE
    y = 1.0 + beta * x + alpha + gamma + rng.normal(size=n_units * n_periods)
    return pd.DataFrame({"unit": units, "period": periods, "x": x, "y": y})


def make_did_2x2(n_units=200, att=2.0, seed=0):
    """Canonical 2x2 DiD panel: id, time∈{0,1}, treat (post×group), y."""
    rng = np.random.default_rng(seed)
    ids = np.repeat(np.arange(n_units), 2)
    time = np.tile([0, 1], n_units)
    group = (np.arange(n_units) < n_units // 2).astype(int)[ids]  # treated cohort
    treat = group * time
    fe = rng.normal(size=n_units)[ids]
    y = 1.0 + att * treat + 0.4 * time + 0.8 * group + fe + rng.normal(size=2 * n_units)
    return pd.DataFrame(
        {"id": ids, "time": time, "group": group, "treat": treat, "y": y}
    )


def make_staggered_did(n_units=120, n_periods=8, att=2.0, seed=0):
    """Staggered adoption panel for callaway_santanna / event-study:
    columns id, time, g (first-treated period; 0 = never), treat, y."""
    rng = np.random.default_rng(seed)
    cohorts = rng.choice([0, 3, 5, 7], size=n_units, p=[0.25, 0.25, 0.25, 0.25])
    rows = []
    unit_fe = rng.normal(size=n_units)
    time_fe = rng.normal(size=n_periods)
    for i in range(n_units):
        g = cohorts[i]
        for t in range(n_periods):
            treated = int(g != 0 and t >= g)
            y = 1.0 + att * treated + unit_fe[i] + time_fe[t] + rng.normal()
            rows.append((i, t, g, treated, y))
    return pd.DataFrame(rows, columns=["id", "time", "g", "treat", "y"])


def make_rd(n=1000, tau=3.0, cutoff=0.0, seed=0, fuzzy=False):
    """Sharp (or fuzzy) RD: running var x, outcome y with a jump tau at cutoff."""
    rng = np.random.default_rng(seed)
    x = rng.uniform(-1, 1, size=n) + cutoff
    above = (x >= cutoff).astype(float)
    if fuzzy:
        # compliance < 1: treatment prob jumps but isn't deterministic
        p = 0.15 + 0.7 * above
        d = (rng.uniform(size=n) < p).astype(float)
        y = 1.0 + 0.8 * (x - cutoff) + tau * d + rng.normal(0, 0.5, size=n)
        return pd.DataFrame({"x": x, "y": y, "d": d})
    y = 1.0 + 0.8 * (x - cutoff) + tau * above + rng.normal(0, 0.5, size=n)
    return pd.DataFrame({"x": x, "y": y})


def make_synth(n_donors=18, n_periods=20, treat_period=15, effect=-4.0, seed=0):
    """Synthetic-control donor panel: unit, time, y; treated unit 0 gets a
    post-`treat_period` effect. Donors follow a low-rank factor structure so a
    convex combination can track the treated unit pre-period."""
    rng = np.random.default_rng(seed)
    n_units = n_donors + 1
    # 2-factor structure
    loadings = rng.uniform(0.2, 1.0, size=(n_units, 2))
    factors = np.cumsum(rng.normal(size=(n_periods, 2)), axis=0)
    base = loadings @ factors.T  # (n_units, n_periods)
    base += rng.normal(0, 0.3, size=base.shape)
    rows = []
    for u in range(n_units):
        for t in range(n_periods):
            y = base[u, t]
            if u == 0 and t >= treat_period:
                y += effect
            rows.append((u, t, y))
    return pd.DataFrame(rows, columns=["unit", "time", "y"])
