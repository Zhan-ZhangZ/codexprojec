#!/usr/bin/env python3
"""Pure-stdlib shift-share (Bartik) instrument computations.

Deterministic regional design: each region's employment growth x is the sum of
a shift-share component (industry shares times national industry shocks) and a
local demand shock eta that ALSO moves the outcome directly. OLS of y on x is
therefore biased upward, while the Bartik instrument z = sum_i share_ri * g_i
isolates the share-weighted national shocks and recovers the true effect.

The local shock eta is constructed to be exactly orthogonal to z in-sample
(so the exclusion restriction holds by construction) but enters both x and y
(so x is endogenous). The untreated potential outcome y0 = y - BETA * x ships
as a column the estimators never read, so the checker can recompute the true
effect. Shares and national shocks ship per-region so a candidate must build
the instrument rather than invent one.
"""

from __future__ import annotations

import csv
from pathlib import Path

BETA = 0.5          # true effect of employment growth on wage growth
GAMMA = 1.0         # direct effect of the local demand shock on the outcome
SHOCKS = (4.0, 1.0, -2.0)  # national industry shocks g_i (three industries)

# 12 regions: industry share triplets (sum to 1) and a local demand shock eta.
# eta is chosen orthogonal in-sample to the implied Bartik instrument z but
# correlated with x (x = z + eta), which is what makes OLS biased.
REGIONS = [
    # (s1,   s2,   s3,   eta)
    (0.60, 0.30, 0.10, 1.0),
    (0.50, 0.30, 0.20, -1.0),
    (0.40, 0.40, 0.20, 1.0),
    (0.30, 0.50, 0.20, -1.0),
    (0.20, 0.50, 0.30, 1.0),
    (0.10, 0.60, 0.30, -1.0),
    (0.60, 0.20, 0.20, -1.0),
    (0.50, 0.20, 0.30, 1.0),
    (0.40, 0.30, 0.30, -1.0),
    (0.30, 0.40, 0.30, 1.0),
    (0.20, 0.40, 0.40, -1.0),
    (0.10, 0.50, 0.40, 1.0),
]


def _z(shares: tuple[float, float, float]) -> float:
    return sum(s * g for s, g in zip(shares, SHOCKS))


def generate() -> list[dict]:
    rows: list[dict] = []
    for rid, (s1, s2, s3, eta) in enumerate(REGIONS, start=1):
        shares = (s1, s2, s3)
        z = _z(shares)
        x = z + eta
        y = BETA * x + GAMMA * eta
        y0 = y - BETA * x  # untreated potential outcome (the confounded part)
        rows.append({
            "region": rid,
            "share1": s1, "share2": s2, "share3": s3,
            "shock1": SHOCKS[0], "shock2": SHOCKS[1], "shock3": SHOCKS[2],
            "x": round(x, 6),
            "y": round(y, 6),
            "y0": round(y0, 6),
        })
    return rows


def write_csv(path: Path) -> None:
    rows = generate()
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = ["region", "share1", "share2", "share3",
              "shock1", "shock2", "shock3", "x", "y", "y0"]
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def load(data_path: Path) -> list[dict]:
    with data_path.open(encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def _num(row: dict, key: str) -> float:
    return float(row[key])


def _mean(vals: list[float]) -> float:
    return sum(vals) / len(vals)


def _cov(a: list[float], b: list[float]) -> float:
    ma, mb = _mean(a), _mean(b)
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / len(a)


def instrument(rows: list[dict]) -> list[float]:
    """Bartik instrument per region: sum of shares times national shocks."""
    return [
        sum(_num(r, f"share{i}") * _num(r, f"shock{i}") for i in (1, 2, 3))
        for r in rows
    ]


def true_beta(rows: list[dict]) -> float:
    """True effect from the unread y0 column: slope of (y - y0) on x."""
    x = [_num(r, "x") for r in rows]
    effect = [_num(r, "y") - _num(r, "y0") for r in rows]
    return _cov(x, effect) / _cov(x, x)


def ols_beta(rows: list[dict]) -> float:
    """OLS of y on x (biased: the local shock eta moves both x and y)."""
    x = [_num(r, "x") for r in rows]
    y = [_num(r, "y") for r in rows]
    return _cov(x, y) / _cov(x, x)


def bartik_beta(rows: list[dict]) -> float:
    """IV using the shift-share instrument (recovers BETA)."""
    z = instrument(rows)
    x = [_num(r, "x") for r in rows]
    y = [_num(r, "y") for r in rows]
    return _cov(z, y) / _cov(z, x)


def first_stage_coef(rows: list[dict]) -> float:
    """First stage: slope of x on the instrument (equals 1 by construction)."""
    z = instrument(rows)
    x = [_num(r, "x") for r in rows]
    return _cov(z, x) / _cov(z, z)


if __name__ == "__main__":
    data_path = Path(__file__).resolve().parents[1] / "data" / "sim-bartik.csv"
    write_csv(data_path)
    print(f"Wrote {data_path}")
