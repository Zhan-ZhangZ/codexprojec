#!/usr/bin/env python3
"""Pure-stdlib quantile-treatment-effect (QTE) computations.

Deterministic paired design: 100 distinct baseline outcomes (1..100), each
appearing once in the treated arm and once in the control arm, so both arms
share the SAME untreated outcome distribution by construction. Treatment
shifts only the upper tail (y0 > 80 gains +5), so the mean effect is a modest
+1.0 while the median QTE is exactly 0 and the 90th-percentile QTE is 5.0.

The lesson: a mean-only analysis reports "+1" and misses that all gains
concentrate in the top quintile. Quantile treatment effects make that legible.
The untreated potential outcome y0 ships as a column the estimators never
read, so the checker can recompute the true quantile effects against the full
population's y0 distribution rather than against the estimator's control arm.
"""

from __future__ import annotations

import csv
import math
from pathlib import Path

N_LEVELS = 100
TAIL_CUTOFF = 80.0
TAIL_SHIFT = 5.0


def generate() -> list[dict]:
    rows: list[dict] = []
    uid = 0
    for level in range(1, N_LEVELS + 1):
        for d in (1, 0):
            uid += 1
            y0 = float(level)
            y = y0 + (TAIL_SHIFT if d == 1 and y0 > TAIL_CUTOFF else 0.0)
            rows.append({
                "id": uid,
                "treat": d,
                "y0": round(y0, 4),
                "y": round(y, 4),
            })
    return rows


def write_csv(path: Path) -> None:
    rows = generate()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=["id", "treat", "y0", "y"])
        writer.writeheader()
        writer.writerows(rows)


def load(data_path: Path) -> list[dict]:
    with data_path.open(encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def _num(row: dict, key: str) -> float:
    return float(row[key])


def quantile(vals: list[float], q: float) -> float:
    """Deterministic linear-interpolation sample quantile (numpy default method)."""
    ordered = sorted(vals)
    if not ordered:
        raise ValueError("quantile of empty list")
    pos = (len(ordered) - 1) * q
    lo = math.floor(pos)
    hi = math.ceil(pos)
    if lo == hi:
        return ordered[lo]
    frac = pos - lo
    return ordered[lo] * (1.0 - frac) + ordered[hi] * frac


def qte_at(rows: list[dict], q: float) -> float:
    """Estimator: difference in observed-outcome quantiles between arms."""
    t = [_num(r, "y") for r in rows if round(_num(r, "treat")) == 1]
    c = [_num(r, "y") for r in rows if round(_num(r, "treat")) == 0]
    return quantile(t, q) - quantile(c, q)


def true_qte_at(rows: list[dict], q: float) -> float:
    """Truth: treated-arm outcome quantile minus the FULL population's y0 quantile."""
    t = [_num(r, "y") for r in rows if round(_num(r, "treat")) == 1]
    y0_all = [_num(r, "y0") for r in rows]
    return quantile(t, q) - quantile(y0_all, q)


def ate(rows: list[dict]) -> float:
    """Estimator: difference in observed-outcome means between arms."""
    t = [_num(r, "y") for r in rows if round(_num(r, "treat")) == 1]
    c = [_num(r, "y") for r in rows if round(_num(r, "treat")) == 0]
    return sum(t) / len(t) - sum(c) / len(c)


def true_ate(rows: list[dict]) -> float:
    """Truth: mean individual effect y - y0 among treated units (y0 unread by estimators)."""
    diffs = [_num(r, "y") - _num(r, "y0") for r in rows if round(_num(r, "treat")) == 1]
    return sum(diffs) / len(diffs)


if __name__ == "__main__":
    data_path = Path(__file__).resolve().parents[1] / "data" / "sim-qte.csv"
    write_csv(data_path)
    print(f"Wrote {data_path}")
