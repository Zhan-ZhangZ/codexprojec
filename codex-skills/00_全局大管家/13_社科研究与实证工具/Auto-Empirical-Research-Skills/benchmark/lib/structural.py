#!/usr/bin/env python3
"""Pure-stdlib structural demand estimation: logit demand with endogenous price.

The workhorse of empirical IO, stripped to the parts that can be checked
exactly. Consumers in market ``t`` choose among ``J`` products or an outside
good; product ``j`` has mean utility

    delta_jt = beta0 + beta_x * x_jt - alpha * p_jt + xi_jt

and market shares follow the multinomial logit

    s_jt = exp(delta_jt) / (1 + sum_k exp(delta_kt)),   s_0t = 1 / (1 + sum_k ...)

Berry's (1994) inversion makes this linear and therefore exactly checkable:

    ln(s_jt) - ln(s_0t) = delta_jt

so the demand system collapses to a regression of the inverted share on
``x`` and ``p``. That is the whole reason this task can have exact golds —
no simulation, no numerical optimization, no tolerance-by-luck.

**The endogeneity that defines the field.** Firms observe the demand shock
``xi`` and price against it, so ``p`` is set as

    p_jt = gamma0 + gamma_w * w_jt + gamma_xi * xi_jt

with ``w`` a cost shifter. Regressing the inverted share on price by OLS is
therefore biased: with ``gamma_xi > 0``, the price coefficient is pulled
*toward zero*, so the folk answer understates how price-sensitive demand is —
the direction that flatters a firm's pricing power. Instrumenting price with
the cost shifter recovers ``alpha`` exactly.

To make "exactly" literal rather than asymptotic, ``xi`` is residualized
in-sample against ``[1, x, w]`` when the dataset is generated, so the sample
moment conditions hold to machine precision and just-identified 2SLS returns
the design parameter itself. Nothing here depends on a random seed.

**Two more things a structural pipeline owes you**, both graded:

*Elasticities are not coefficients.* The own-price elasticity of logit demand
is ``-alpha * p_jt * (1 - s_jt)``, not ``alpha``. Quoting the coefficient as
an elasticity is a units error that survives in published work because both
numbers are "the price effect".

*Marginal costs are inverted, not observed.* Under single-product Bertrand-Nash
the first-order condition ``s_j + (p_j - mc_j) * ds_j/dp_j = 0`` with
``ds_j/dp_j = -alpha * s_j * (1 - s_j)`` gives

    mc_jt = p_jt - 1 / (alpha * (1 - s_jt))

so a wrong ``alpha`` propagates straight into the cost estimate: the
understated ``alpha`` from OLS implies an overstated markup and therefore an
understated marginal cost. The benchmark grades that propagation explicitly,
because "my demand estimate is only a little off" stops being true the moment
it is used for anything.

The dataset ships ``xi`` as a column the estimators never read, so the
honest-* golds can recompute every reported number from the CSV.
"""

from __future__ import annotations

import csv
import math
from pathlib import Path

# --- design constants (the truth the benchmark checks recovery against) ---
N_MARKETS = 20
N_PRODUCTS = 3

BETA0 = 1.0          # constant in mean utility
BETA_X = 0.8         # taste for the observed characteristic
ALPHA = 1.5          # price sensitivity; enters utility as -ALPHA * p

GAMMA0 = 2.0         # pricing intercept
GAMMA_W = 0.9        # cost shifter pass-through (instrument relevance)
GAMMA_XI = 0.7       # firms price against the demand shock -> endogeneity

FIELDNAMES = ["market", "product", "x", "w", "price", "share", "outside_share", "xi"]


# --------------------------------------------------------------------------
# tiny linear algebra (stdlib only)
# --------------------------------------------------------------------------
def _solve(matrix: list[list[float]], rhs: list[float]) -> list[float]:
    """Gaussian elimination with partial pivoting for a small dense system."""
    n = len(matrix)
    aug = [row[:] + [rhs[i]] for i, row in enumerate(matrix)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(aug[r][col]))
        if abs(aug[pivot][col]) < 1e-12:
            raise ValueError("singular system in structural benchmark")
        aug[col], aug[pivot] = aug[pivot], aug[col]
        pivot_value = aug[col][col]
        for r in range(n):
            if r == col:
                continue
            factor = aug[r][col] / pivot_value
            for c in range(col, n + 1):
                aug[r][c] -= factor * aug[col][c]
    return [aug[i][n] / aug[i][i] for i in range(n)]


def _ols(design: list[list[float]], y: list[float]) -> list[float]:
    """Least squares via the normal equations; the systems here are 3x3."""
    k = len(design[0])
    xtx = [[sum(row[a] * row[b] for row in design) for b in range(k)] for a in range(k)]
    xty = [sum(row[a] * yi for row, yi in zip(design, y)) for a in range(k)]
    return _solve(xtx, xty)


def _two_stage_least_squares(
    design: list[list[float]], instruments: list[list[float]], y: list[float]
) -> list[float]:
    """Just-identified 2SLS: project the design on the instruments, then OLS."""
    fitted = []
    for col in range(len(design[0])):
        coefficients = _ols(instruments, [row[col] for row in design])
        fitted.append([sum(c * z for c, z in zip(coefficients, zrow)) for zrow in instruments])
    projected = [[fitted[c][i] for c in range(len(design[0]))] for i in range(len(design))]
    return _ols(projected, y)


def _residualize(values: list[float], design: list[list[float]]) -> list[float]:
    """Return ``values`` orthogonal to ``design`` in-sample, to machine precision.

    This is what makes the golds exact rather than asymptotic: after this, the
    sample moments the instruments rely on are zero, so just-identified 2SLS
    returns the design parameter itself instead of an estimate near it.
    """
    coefficients = _ols(design, values)
    return [
        v - sum(c * d for c, d in zip(coefficients, row)) for v, row in zip(values, design)
    ]


# --------------------------------------------------------------------------
# data generation
# --------------------------------------------------------------------------
def generate() -> list[dict]:
    markets = range(1, N_MARKETS + 1)
    products = range(1, N_PRODUCTS + 1)

    # Deterministic, spread-out characteristics and cost shifters.
    x = {}
    w = {}
    raw_xi = {}
    for t in markets:
        for j in products:
            x[(t, j)] = 1.0 + 0.25 * ((t + 2 * j) % 7)
            w[(t, j)] = 0.5 + 0.20 * ((3 * t + j) % 5)
            raw_xi[(t, j)] = 0.30 * math.sin(1.7 * t + 0.9 * j)

    keys = [(t, j) for t in markets for j in products]
    design = [[1.0, x[k], w[k]] for k in keys]
    xi_values = _residualize([raw_xi[k] for k in keys], design)
    xi = dict(zip(keys, xi_values))

    price = {k: GAMMA0 + GAMMA_W * w[k] + GAMMA_XI * xi[k] for k in keys}
    delta = {k: BETA0 + BETA_X * x[k] - ALPHA * price[k] + xi[k] for k in keys}

    rows: list[dict] = []
    for t in markets:
        denominator = 1.0 + sum(math.exp(delta[(t, j)]) for j in products)
        outside = 1.0 / denominator
        for j in products:
            k = (t, j)
            rows.append(
                {
                    "market": t,
                    "product": j,
                    "x": round(x[k], 10),
                    "w": round(w[k], 10),
                    "price": round(price[k], 10),
                    "share": round(math.exp(delta[k]) / denominator, 12),
                    "outside_share": round(outside, 12),
                    "xi": round(xi[k], 12),
                }
            )
    return rows


def write_csv(path: Path) -> None:
    rows = generate()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def load(data_path: Path) -> list[dict]:
    with data_path.open(encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


# --------------------------------------------------------------------------
# estimators (everything below reads only observable columns)
# --------------------------------------------------------------------------
def _f(row: dict, key: str) -> float:
    return float(row[key])


def inverted_shares(rows: list[dict]) -> list[float]:
    """Berry inversion: ln(s_j) - ln(s_0), which equals mean utility exactly."""
    return [math.log(_f(r, "share")) - math.log(_f(r, "outside_share")) for r in rows]


def _demand_design(rows: list[dict]) -> list[list[float]]:
    return [[1.0, _f(r, "x"), _f(r, "price")] for r in rows]


def _demand_instruments(rows: list[dict]) -> list[list[float]]:
    # x is its own instrument (exogenous); w is the excluded cost shifter.
    return [[1.0, _f(r, "x"), _f(r, "w")] for r in rows]


def oracle_alpha(rows: list[dict]) -> float:
    """The truth, recomputed from the data using the hidden ``xi`` column.

    ``xi`` ships in the CSV but no estimator above reads it. Regressing the
    inverted share on ``[1, x, p, xi]`` therefore closes the model exactly and
    returns the design parameter — the same role ``y0`` plays in the RD task.
    It is what the checker compares candidates against, so the truth is derived
    from the committed dataset rather than asserted by the task spec.
    """
    design = [[1.0, _f(r, "x"), _f(r, "price"), _f(r, "xi")] for r in rows]
    coefficients = _ols(design, inverted_shares(rows))
    return -coefficients[2]


def ols_alpha(rows: list[dict]) -> float:
    """Price sensitivity from OLS on the inverted shares — the biased answer."""
    coefficients = _ols(_demand_design(rows), inverted_shares(rows))
    return -coefficients[2]


def iv_alpha(rows: list[dict]) -> float:
    """Price sensitivity from 2SLS with the cost shifter as the instrument."""
    coefficients = _two_stage_least_squares(
        _demand_design(rows), _demand_instruments(rows), inverted_shares(rows)
    )
    return -coefficients[2]


def first_stage_f(rows: list[dict]) -> float:
    """F statistic for the excluded cost shifter in the price equation."""
    y = [_f(r, "price") for r in rows]
    n = len(rows)
    full = [[1.0, _f(r, "x"), _f(r, "w")] for r in rows]
    restricted = [[1.0, _f(r, "x")] for r in rows]

    def rss(design: list[list[float]]) -> float:
        coefficients = _ols(design, y)
        total = 0.0
        for row, yi in zip(design, y):
            fitted = sum(c * d for c, d in zip(coefficients, row))
            total += (yi - fitted) ** 2
        return total

    rss_restricted = rss(restricted)
    rss_full = rss(full)
    df_residual = n - len(full[0])
    if rss_full <= 0 or df_residual <= 0:
        return float("inf")
    return ((rss_restricted - rss_full) / 1.0) / (rss_full / df_residual)


def own_price_elasticities(rows: list[dict], alpha: float) -> list[float]:
    """Logit own-price elasticity: -alpha * p * (1 - s), one per observation."""
    return [-alpha * _f(r, "price") * (1.0 - _f(r, "share")) for r in rows]


def mean_own_elasticity(rows: list[dict], alpha: float | None = None) -> float:
    a = iv_alpha(rows) if alpha is None else alpha
    values = own_price_elasticities(rows, a)
    return sum(values) / len(values)


def naive_elasticity(rows: list[dict]) -> float:
    """The folk answer: quote the (OLS) price coefficient as the elasticity.

    Two errors at once — an endogenous coefficient, and a coefficient read as
    an elasticity. Reported as a negative number so it is comparable to the
    real elasticity rather than differing only in sign.
    """
    return -ols_alpha(rows)


def marginal_costs(rows: list[dict], alpha: float) -> list[float]:
    """Invert the single-product Bertrand FOC: mc = p - 1 / (alpha * (1 - s))."""
    return [
        _f(r, "price") - 1.0 / (alpha * (1.0 - _f(r, "share")))
        for r in rows
    ]


def mean_marginal_cost(rows: list[dict], alpha: float | None = None) -> float:
    a = iv_alpha(rows) if alpha is None else alpha
    values = marginal_costs(rows, a)
    return sum(values) / len(values)


def naive_marginal_cost(rows: list[dict]) -> float:
    """Cost inversion carried out with the biased OLS alpha.

    This is the number that shows why the endogeneity matters: a price
    coefficient that is only "somewhat" understated implies a markup that is
    substantially overstated, and the cost estimate inherits all of it.
    """
    return mean_marginal_cost(rows, ols_alpha(rows))


if __name__ == "__main__":
    data_path = Path(__file__).resolve().parents[1] / "data" / "sim-structural.csv"
    write_csv(data_path)
    print(f"Wrote {data_path}")
