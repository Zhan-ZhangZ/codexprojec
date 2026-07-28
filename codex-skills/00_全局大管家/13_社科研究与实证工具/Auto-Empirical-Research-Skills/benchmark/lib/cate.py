#!/usr/bin/env python3
"""Pure-stdlib heterogeneous-treatment-effect (CATE) computations.

Deterministic, noiseless stratified design with opposite-signed subgroup
effects. Two strata (x = 0 low-type, x = 1 high-type) with treatment
probabilities that differ BY STRATUM, so the naive pooled difference in means
is confounded by stratum composition. Within each stratum treatment is as good
as random (outcomes are constant within stratum-by-arm cells), so a stratified
estimator recovers each conditional effect exactly.

The lesson is twofold: (1) one pooled number is biased when assignment depends
on x, and (2) even the correct AVERAGE hides that the low-type effect is
negative while the high-type effect is positive. The untreated potential
outcome y0 ships as a column the estimators never read, so the checker can
recompute the true conditional effects.
"""

from __future__ import annotations

import csv
from pathlib import Path

N_PER_STRATUM = 100
TREATED_LOW = 25   # x = 0: 25 of 100 treated
TREATED_HIGH = 75  # x = 1: 75 of 100 treated
TAU_LOW = -1.0     # true effect for low-type units
TAU_HIGH = 3.0     # true effect for high-type units
BASE_LOW = 1.0     # untreated outcome, low type
BASE_HIGH = 3.0    # untreated outcome, high type


def generate() -> list[dict]:
    rows: list[dict] = []
    uid = 0
    for x, n_treated, base, tau in (
        (0, TREATED_LOW, BASE_LOW, TAU_LOW),
        (1, TREATED_HIGH, BASE_HIGH, TAU_HIGH),
    ):
        for i in range(1, N_PER_STRATUM + 1):
            uid += 1
            d = 1 if i <= n_treated else 0
            y0 = base
            y = y0 + (tau if d else 0.0)
            rows.append({
                "id": uid,
                "x": x,
                "treat": d,
                "y0": round(y0, 4),
                "y": round(y, 4),
            })
    return rows


def write_csv(path: Path) -> None:
    rows = generate()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=["id", "x", "treat", "y0", "y"])
        writer.writeheader()
        writer.writerows(rows)


def load(data_path: Path) -> list[dict]:
    with data_path.open(encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def _num(row: dict, key: str) -> float:
    return float(row[key])


def _mean(vals: list[float]) -> float:
    return sum(vals) / len(vals)


def true_cate(rows: list[dict], x: int) -> float:
    """True conditional effect for stratum x, from the unread y0 column."""
    diffs = [
        _num(r, "y") - _num(r, "y0")
        for r in rows
        if round(_num(r, "x")) == x and round(_num(r, "treat")) == 1
    ]
    return _mean(diffs)


def true_ate(rows: list[dict]) -> float:
    """True average effect over the FULL population (equal-weighted strata)."""
    strata = sorted({round(_num(r, "x")) for r in rows})
    parts = []
    for x in strata:
        n_x = sum(1 for r in rows if round(_num(r, "x")) == x)
        parts.append((n_x, true_cate(rows, x)))
    total = sum(n for n, _ in parts)
    return sum(n * tau for n, tau in parts) / total


def cate_hat(rows: list[dict], x: int) -> float:
    """Stratified estimator: difference in means within stratum x (observed y only)."""
    t = [_num(r, "y") for r in rows if round(_num(r, "x")) == x and round(_num(r, "treat")) == 1]
    c = [_num(r, "y") for r in rows if round(_num(r, "x")) == x and round(_num(r, "treat")) == 0]
    return _mean(t) - _mean(c)


def ate_stratified(rows: list[dict]) -> float:
    """Stratum-size-weighted average of the within-stratum estimates (recovers true ATE)."""
    strata = sorted({round(_num(r, "x")) for r in rows})
    parts = []
    for x in strata:
        n_x = sum(1 for r in rows if round(_num(r, "x")) == x)
        parts.append((n_x, cate_hat(rows, x)))
    total = sum(n for n, _ in parts)
    return sum(n * tau for n, tau in parts) / total


def naive_ate(rows: list[dict]) -> float:
    """Pooled difference in means ignoring x (biased: treatment share differs by stratum)."""
    t = [_num(r, "y") for r in rows if round(_num(r, "treat")) == 1]
    c = [_num(r, "y") for r in rows if round(_num(r, "treat")) == 0]
    return _mean(t) - _mean(c)


def cate_gap(rows: list[dict]) -> float:
    """Estimated heterogeneity gap between high- and low-type conditional effects."""
    return cate_hat(rows, 1) - cate_hat(rows, 0)


def true_cate_gap(rows: list[dict]) -> float:
    return true_cate(rows, 1) - true_cate(rows, 0)


if __name__ == "__main__":
    data_path = Path(__file__).resolve().parents[1] / "data" / "sim-cate.csv"
    write_csv(data_path)
    print(f"Wrote {data_path}")
