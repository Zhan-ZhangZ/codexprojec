#!/usr/bin/env python3
"""End-to-end replication of Card (1995) returns to schooling, pure stdlib.

Card, David (1995), "Using Geographic Variation in College Proximity to Estimate
the Return to Schooling", in Christofides, Grant and Swidinsky (eds.), *Aspects
of Labour Market Behaviour: Essays in Honour of John Vanderkamp*. The canonical
NLSYM extract (3,010 men with a valid 1976 wage) is vendored at
`demo-StatsPAI-skill/data/card.csv`.

Reproduces the paper's headline comparison:

    OLS log-wage return to a year of schooling  : 0.075  (se 0.003)
    First-stage coefficient on nearc4           : 0.32   (se 0.088)
    2SLS return instrumenting with nearc4       : 0.132  (se 0.055)

The whole point of the paper is the *gap* between the two: instrumenting
schooling with growing up near a four-year college nearly doubles the estimated
return, the opposite of what a simple ability-bias story predicts. Reproducing
0.075 alone would demonstrate nothing.

Three things this script does that a benchmark point-estimate check does not,
and that a replication has to get right:

1. **Standard errors, not just coefficients.** A return of 0.132 with a
   standard error of 0.055 is a different paper from 0.132 with 0.005. The 2SLS
   variance uses the *structural* residuals — y minus X times beta with the
   actual schooling variable — not the residuals of the second-stage regression
   on fitted schooling. Running that second stage as plain OLS and reading its
   standard error off the output is the classic manual-2SLS error; it is
   reported below as `iv_se_naive_second_stage` so the size of the mistake is
   visible (0.0565 against the correct 0.0550) rather than merely warned about.

2. **Instrument strength.** The first-stage F on the single excluded instrument
   is 13.3 — above the rule-of-thumb 10 and nowhere near the ~23 an
   Anderson-Rubin-equivalent standard would want. Card's own reading is
   cautious for this reason, and a replication that omits the first stage has
   not replicated the argument.

3. **The comparison the paper is about.** `iv_exceeds_ols` is checked
   explicitly, because a pipeline can hit both point estimates and still bury
   the finding.

Everything is closed-form OLS over lists (Gauss-Jordan), so this runs on any
Python 3 with zero dependencies. The script writes `estimates.json` and EXITS
NON-ZERO if any published anchor is missed — the demo is itself a gate.
"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DATA = ROOT / "demo-StatsPAI-skill" / "data" / "card.csv"
OUT = HERE / "estimates.json"

OUTCOME = "lwage"
ENDOGENOUS = "educ"
INSTRUMENT = "nearc4"
# Card's wage equation: experience and its square, race, region and urban
# controls, plus the 1966 region dummies. reg661 is the omitted category.
CONTROLS = [
    "exper", "expersq", "black", "south", "smsa", "smsa66",
    "reg662", "reg663", "reg664", "reg665", "reg666", "reg667", "reg668", "reg669",
]

# Published anchors, with the tolerance each is checked at. These are the values
# the paper reports and that the standard NLSYM extract reproduces; they are the
# same literature constants the repo's `card-iv-recovery` benchmark task uses.
PUBLISHED = {
    "n":                  (3010,   0),
    "ols_return":         (0.075,  0.002),
    "ols_se":             (0.003,  0.001),
    "first_stage_coef":   (0.32,   0.02),
    "first_stage_se":     (0.088,  0.005),
    "iv_return":          (0.132,  0.005),
    "iv_se":              (0.055,  0.003),
}
# Below the ~23 an Anderson-Rubin-equivalent threshold would ask for; the point
# is that this instrument is not comfortably strong, which is why Card is
# careful about it.
MIN_FIRST_STAGE_F = 10.0


# --------------------------------------------------------------------------
# linear algebra (stdlib only)
# --------------------------------------------------------------------------
def invert(matrix: list[list[float]]) -> list[list[float]]:
    """Gauss-Jordan inverse of a small dense square matrix."""
    n = len(matrix)
    aug = [row[:] + [1.0 if i == j else 0.0 for j in range(n)] for i, row in enumerate(matrix)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(aug[r][col]))
        if abs(aug[pivot][col]) < 1e-14:
            raise ValueError("singular design matrix")
        aug[col], aug[pivot] = aug[pivot], aug[col]
        divisor = aug[col][col]
        aug[col] = [v / divisor for v in aug[col]]
        for row in range(n):
            if row == col:
                continue
            factor = aug[row][col]
            aug[row] = [aug[row][j] - factor * aug[col][j] for j in range(2 * n)]
    return [row[n:] for row in aug]


def ols(design: list[list[float]], y: list[float]) -> tuple[list[float], list[float]]:
    """Return (coefficients, homoskedastic standard errors)."""
    n, p = len(design), len(design[0])
    xtx = [[sum(design[i][a] * design[i][b] for i in range(n)) for b in range(p)] for a in range(p)]
    xty = [sum(design[i][a] * y[i] for i in range(n)) for a in range(p)]
    inv = invert(xtx)
    beta = [sum(inv[a][b] * xty[b] for b in range(p)) for a in range(p)]
    resid = [y[i] - sum(design[i][j] * beta[j] for j in range(p)) for i in range(n)]
    sigma2 = sum(e * e for e in resid) / (n - p)
    se = [(sigma2 * inv[j][j]) ** 0.5 for j in range(p)]
    return beta, se


# --------------------------------------------------------------------------
# data
# --------------------------------------------------------------------------
def load(path: Path) -> list[dict]:
    """The estimation sample: men with an observed 1976 wage.

    Card's sample restriction. Rows without `lwage` are the men who did not
    report a wage in the 1976 interview; dropping them is what makes N = 3,010
    rather than the 3,613 rows in the extract.
    """
    with path.open(encoding="utf-8") as fh:
        return [row for row in csv.DictReader(fh) if row.get(OUTCOME) not in (None, "", "NA")]


def column(rows: list[dict], key: str) -> list[float]:
    return [float(row[key]) for row in rows]


def design(rows: list[dict], regressors: list[str]) -> list[list[float]]:
    return [[1.0] + [float(row[key]) for key in regressors] for row in rows]


# --------------------------------------------------------------------------
# estimation
# --------------------------------------------------------------------------
def replicate(rows: list[dict]) -> dict:
    n = len(rows)
    y = column(rows, OUTCOME)

    # (1) OLS — the "ability bias should make this too high" benchmark.
    ols_beta, ols_se = ols(design(rows, [ENDOGENOUS] + CONTROLS), y)

    # (2) First stage — does college proximity move schooling at all?
    instruments = design(rows, [INSTRUMENT] + CONTROLS)
    fs_beta, fs_se = ols(instruments, column(rows, ENDOGENOUS))
    first_stage_t = fs_beta[1] / fs_se[1]

    # (3) 2SLS. The point estimate is OLS of y on fitted schooling; the variance
    #     is not, because the residual that belongs in sigma^2 is the structural
    #     one, formed with actual schooling.
    fitted_educ = [
        sum(instruments[i][j] * fs_beta[j] for j in range(len(fs_beta))) for i in range(n)
    ]
    x_hat = [[1.0, fitted_educ[i]] + [float(rows[i][k]) for k in CONTROLS] for i in range(n)]
    x_actual = [
        [1.0, float(rows[i][ENDOGENOUS])] + [float(rows[i][k]) for k in CONTROLS]
        for i in range(n)
    ]
    p = len(x_actual[0])
    xtx = [[sum(x_hat[i][a] * x_hat[i][b] for i in range(n)) for b in range(p)] for a in range(p)]
    xty = [sum(x_hat[i][a] * y[i] for i in range(n)) for a in range(p)]
    inv = invert(xtx)
    iv_beta = [sum(inv[a][b] * xty[b] for b in range(p)) for a in range(p)]

    structural_resid = [
        y[i] - sum(x_actual[i][j] * iv_beta[j] for j in range(p)) for i in range(n)
    ]
    sigma2 = sum(e * e for e in structural_resid) / (n - p)
    iv_se = (sigma2 * inv[1][1]) ** 0.5

    # The mistake this script exists partly to make visible: taking the second
    # stage at face value and reading its OLS standard error off the output.
    naive_resid = [y[i] - sum(x_hat[i][j] * iv_beta[j] for j in range(p)) for i in range(n)]
    sigma2_naive = sum(e * e for e in naive_resid) / (n - p)
    iv_se_naive = (sigma2_naive * inv[1][1]) ** 0.5

    return {
        "n": n,
        "ols_return": ols_beta[1],
        "ols_se": ols_se[1],
        "first_stage_coef": fs_beta[1],
        "first_stage_se": fs_se[1],
        "first_stage_t": first_stage_t,
        "first_stage_F": first_stage_t ** 2,
        "iv_return": iv_beta[1],
        "iv_se": iv_se,
        "iv_se_naive_second_stage": iv_se_naive,
        "iv_minus_ols": iv_beta[1] - ols_beta[1],
    }


# --------------------------------------------------------------------------
# report + gate
# --------------------------------------------------------------------------
def main() -> int:
    if not DATA.exists():
        print(f"missing dataset: {DATA}", file=sys.stderr)
        return 1
    got = replicate(load(DATA))

    print("Card (1995) returns to schooling — computed vs published")
    print("-" * 62)
    failures = []
    for key, (published, tol) in PUBLISHED.items():
        value = got[key]
        if key == "n":
            ok = int(value) == int(published)
            shown = f"{int(value):,} vs {int(published):,}"
        else:
            ok = abs(value - published) <= tol
            shown = f"{value:.4f} vs {published:.3f} (tol {tol})"
        print(f"  [{'PASS' if ok else 'FAIL'}] {key:<18} {shown}")
        if not ok:
            failures.append(key)

    # The comparison the paper is about, and the caveat that goes with it.
    checks = [
        (
            "iv_exceeds_ols",
            got["iv_return"] > got["ols_return"],
            f"IV {got['iv_return']:.4f} > OLS {got['ols_return']:.4f} "
            f"(+{got['iv_minus_ols']:.4f})",
        ),
        (
            "instrument_relevant",
            got["first_stage_F"] >= MIN_FIRST_STAGE_F,
            f"first-stage F {got['first_stage_F']:.2f} (>= {MIN_FIRST_STAGE_F})",
        ),
    ]
    for name, ok, detail in checks:
        print(f"  [{'PASS' if ok else 'FAIL'}] {name:<18} {detail}")
        if not ok:
            failures.append(name)

    print(
        f"\n  note: the naive manual-2SLS standard error (second-stage OLS residuals)\n"
        f"        would be {got['iv_se_naive_second_stage']:.4f} instead of the correct "
        f"{got['iv_se']:.4f}."
    )
    print(
        f"  note: first-stage F = {got['first_stage_F']:.2f} clears the rule-of-thumb 10 but\n"
        "        not the ~23 an Anderson-Rubin-equivalent standard would ask for."
    )

    OUT.write_text(
        json.dumps(
            {
                "candidate": "aers-card1995-replication",
                "source": (
                    "demo-notebooks/card-1995-iv/replicate_card1995.py "
                    "(pure stdlib, vendored NLSYM extract)"
                ),
                "coefficients": {
                    "ols_return": {"value": round(got["ols_return"], 4),
                                   "se": round(got["ols_se"], 4)},
                    "iv_return": {"value": round(got["iv_return"], 4),
                                  "se": round(got["iv_se"], 4)},
                    "first_stage_coef": {"value": round(got["first_stage_coef"], 4),
                                         "se": round(got["first_stage_se"], 4)},
                },
                "all_computed": {k: round(v, 4) for k, v in got.items()},
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"\nwrote {OUT.relative_to(ROOT)}")

    if failures:
        print(f"FAIL: missed published anchors: {', '.join(failures)}", file=sys.stderr)
        return 1
    print("OK: all published anchors reproduced from the vendored extract")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
