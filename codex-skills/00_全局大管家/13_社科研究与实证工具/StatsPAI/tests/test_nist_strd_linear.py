"""NIST StRD certified-value validation for the OLS kernel (Tier F).

The NIST Statistical Reference Datasets (StRD) are the international benchmark
for the numerical accuracy of statistical software. The 11 Linear Least
Squares datasets ship certified parameter estimates, standard errors, and
residual standard deviations to ~15 significant digits, including deliberately
ill-conditioned designs (Longley's collinearity, Filip's degree-10 polynomial,
the Wampler family) that break naive normal-equation solvers.

This suite fits each dataset through the public ``sp.regress`` API and scores
agreement with the NIST-standard **log relative error**::

    LRE = -log10(|computed - certified| / |certified|)

i.e. roughly "how many leading digits are correct". Per-dataset LRE floors are
set by NIST difficulty tier with headroom over the observed double-precision
accuracy of the current QR-based kernel, so the test catches a genuine
numerical regression (reverting to normal equations squares the condition
number and roughly halves the accurate digits on the ill-conditioned rows)
without being brittle to cross-platform float differences.

Certified values are parsed straight out of the original NIST ``.dat`` files
under ``tests/fixtures/nist_strd/`` (see that directory's README for
provenance) — they are never transcribed by hand, consistent with the
project's zero-fabrication policy for reference numbers.
"""

from __future__ import annotations

import math
import re
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

import statspai as sp

FIXTURES = Path(__file__).parent / "fixtures" / "nist_strd"

# A token that float() can parse: 1.23, .5, 760., -3.0E-12, 12
_NUM = re.compile(r"^[+-]?(\d+\.?\d*|\.\d+)([Ee][+-]?\d+)?$")
_PARAM = re.compile(r"\s*B(\d+)\s+([-+\d.Ee]+)\s+([-+\d.Ee]+)\s*$")
_RESID_SD = re.compile(r"Standard Deviation\s+([-+\d.Ee]+)\s*$")


# name -> (poly_degree | None, n_predictors, has_intercept, est_floor, se_floor)
# poly_degree set  => single predictor x, design = [x, x^2, ..., x^deg]
# poly_degree None => multiple regression, design = data columns x1..xK
# Floors are LRE (correct-digit) minimums by NIST difficulty tier:
#   Lower    -> 10   Higher(well-behaved) -> 7   Extreme ill-cond -> 4
SPEC = {
    "Norris": dict(deg=1, npred=1, intercept=True, est=10.0, se=10.0),
    "Pontius": dict(deg=2, npred=1, intercept=True, est=10.0, se=10.0),
    "NoInt1": dict(deg=1, npred=1, intercept=False, est=10.0, se=10.0),
    "NoInt2": dict(deg=1, npred=1, intercept=False, est=10.0, se=10.0),
    "Longley": dict(deg=None, npred=6, intercept=True, est=9.0, se=9.0),
    "Wampler1": dict(deg=5, npred=1, intercept=True, est=7.0, se=None),
    "Wampler2": dict(deg=5, npred=1, intercept=True, est=9.0, se=None),
    "Wampler3": dict(deg=5, npred=1, intercept=True, est=8.0, se=9.0),
    "Wampler4": dict(deg=5, npred=1, intercept=True, est=6.0, se=9.0),
    "Wampler5": dict(deg=5, npred=1, intercept=True, est=4.0, se=9.0),
    "Filip": dict(deg=10, npred=1, intercept=True, est=5.0, se=5.0),
}


def _parse(name: str, ncol: int):
    """Return (certified_params, certified_resid_sd, data_array).

    ``certified_params`` is a list of (estimate, std_dev) in B0, B1, ... order.
    """
    lines = (FIXTURES / f"{name}.dat").read_text(encoding="utf-8").splitlines()
    params: list[tuple[float, float]] = []
    resid_sd = None
    for line in lines:
        m = _PARAM.match(line)
        if m:
            params.append((float(m.group(2)), float(m.group(3))))
        m2 = _RESID_SD.search(line)
        if m2:
            resid_sd = float(m2.group(1))
    # The data block follows the LAST line starting with "Data:" (an earlier
    # "Data:" line appears in the file's metadata summary).
    data_hdr = max(i for i, l in enumerate(lines) if l.strip().startswith("Data:"))
    rows = [
        [float(p) for p in line.split()]
        for line in lines[data_hdr + 1 :]
        if len(line.split()) == ncol and all(_NUM.match(p) for p in line.split())
    ]
    return params, resid_sd, np.array(rows)


def _lre(computed: float, certified: float) -> float:
    """NIST log relative error: ~number of correct leading digits, capped 15."""
    if certified == 0.0:
        # Exact-fit certified value: judge on an absolute floor instead.
        return 15.0 if abs(computed) < 1e-6 else 0.0
    rel = abs(computed - certified) / abs(certified)
    return 15.0 if rel == 0.0 else min(15.0, -math.log10(rel))


def _fit(name: str):
    spec = SPEC[name]
    ncol = 2 if spec["deg"] is not None else 1 + spec["npred"]
    params, resid_sd, arr = _parse(name, ncol)
    assert arr.ndim == 2 and len(arr), f"{name}: failed to parse data block"

    frame = {"y": arr[:, 0]}
    cols: list[str] = []
    if spec["deg"] is not None:  # polynomial in a single x
        x = arr[:, 1]
        for d in range(1, spec["deg"] + 1):
            frame[f"p{d}"] = x**d
            cols.append(f"p{d}")
    else:  # multiple regression
        for j in range(1, spec["npred"] + 1):
            frame[f"x{j}"] = arr[:, j]
            cols.append(f"x{j}")
    formula = "y ~ " + " + ".join(cols) + ("" if spec["intercept"] else " - 1")
    res = sp.regress(formula, data=pd.DataFrame(frame))

    # NIST orders B0=intercept (if present) then predictors in column order.
    names = ["Intercept"] if spec["intercept"] else []
    names += [c for c in res.params.index if c != "Intercept"]
    return spec, params, resid_sd, arr, res, names


@pytest.mark.parametrize("name", list(SPEC), ids=list(SPEC))
def test_nist_strd_coefficients(name):
    """Coefficient estimates match NIST certified values to the tier LRE floor."""
    spec, params, _resid_sd, _arr, res, names = _fit(name)
    assert len(params) == len(names), f"{name}: param count mismatch"
    worst = min(
        _lre(float(res.params[nm]), est) for (est, _se), nm in zip(params, names)
    )
    assert worst >= spec["est"], (
        f"{name}: worst coefficient LRE {worst:.2f} below floor {spec['est']} "
        f"(certified vs sp.regress disagree in the leading digits)"
    )


@pytest.mark.parametrize("name", list(SPEC), ids=list(SPEC))
def test_nist_strd_standard_errors(name):
    """Standard errors match NIST certified values (or are ~0 on exact fits)."""
    spec, params, _resid_sd, _arr, res, names = _fit(name)
    if spec["se"] is None:
        # Exact-fit design (Wampler1/2): certified SEs are exactly 0.
        worst_abs = max(abs(float(res.std_errors[nm])) for nm in names)
        assert worst_abs < 1e-3, (
            f"{name}: exact-fit certified SE is 0 but sp.regress reports "
            f"max |SE| = {worst_abs:.2e}"
        )
        return
    worst = min(
        _lre(float(res.std_errors[nm]), se) for (_est, se), nm in zip(params, names)
    )
    assert (
        worst >= spec["se"]
    ), f"{name}: worst standard-error LRE {worst:.2f} below floor {spec['se']}"


@pytest.mark.parametrize("name", list(SPEC), ids=list(SPEC))
def test_nist_strd_residual_sd(name):
    """Residual standard deviation matches the NIST certified value.

    Computed from the regression residuals as sqrt(SSR / (n - k)); for the
    exact-fit Wampler1/2 designs the certified value is 0 and we assert a
    near-zero residual instead.
    """
    spec, params, resid_sd, _arr, res, _names = _fit(name)
    resid = np.asarray(
        res.residuals() if callable(res.residuals) else res.residuals, float
    )
    n, k = len(resid), len(params)
    sigma = math.sqrt(max((resid**2).sum(), 0.0) / (n - k))
    if resid_sd == 0.0:
        assert sigma < 1e-3, (
            f"{name}: exact-fit certified residual SD is 0 but computed "
            f"sigma = {sigma:.2e}"
        )
        return
    floor = min(spec["est"], spec["se"] or spec["est"])
    worst = _lre(sigma, resid_sd)
    assert worst >= floor, (
        f"{name}: residual-SD LRE {worst:.2f} below floor {floor} "
        f"(computed {sigma:.6g} vs certified {resid_sd:.6g})"
    )
