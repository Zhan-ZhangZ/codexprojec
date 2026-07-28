#!/usr/bin/env python3
"""Pure-stdlib causal-mediation computations.

Deterministic randomized design with a MEASURED mediator-outcome confounder w:

    M = A_COEF * T + w + e        (e: extra mediator variation, balanced)
    Y = C_COEF * T + B_COEF * M + D_COEF * w

Treatment T is randomized (w and e are identically distributed across arms).
The total effect is c + a*b. The trap: regressing Y on T and M alone — the
folk "control for the mediator to get the direct effect" move — conditions on
a collider-like path (w moves both M and Y), and here it flips the SIGN of the
direct effect. Adjusting for w as well recovers the direct effect exactly, and
the product method (a-hat from M~T, b-hat from Y~T+M+w) recovers the indirect
effect exactly.

Two potential-outcome columns ship for the checker and are never read by the
estimators: y0 (T=0, mediator at its T=0 value) and y_m0 (T as observed,
mediator held at its T=0 value). true total = mean(y - y0 | T=1),
true NDE = mean(y_m0 - y0 | T=1), true NIE = mean(y - y_m0 | T=1).
"""

from __future__ import annotations

import csv
from pathlib import Path

import lalonde  # sibling module in benchmark/lib

N_PER_ARM = 100
A_COEF = 2.0   # T -> M
B_COEF = 1.5   # M -> Y
C_COEF = 1.0   # T -> Y direct
D_COEF = 2.0   # w -> Y (and w -> M with coefficient 1)


def _w(i: int) -> float:
    return float(i % 10)  # 0..9, identical distribution in both arms


def _e(i: int) -> float:
    return 1.0 if i % 2 == 0 else -1.0  # +/-1, balanced within each w cell


def generate() -> list[dict]:
    rows: list[dict] = []
    uid = 0
    for t in (1, 0):
        for i in range(N_PER_ARM):
            uid += 1
            w, e = _w(i), _e(i)
            m = A_COEF * t + w + e
            m0 = w + e  # mediator value had T been 0
            y = C_COEF * t + B_COEF * m + D_COEF * w
            y_m0 = C_COEF * t + B_COEF * m0 + D_COEF * w
            y0 = B_COEF * m0 + D_COEF * w
            rows.append({
                "id": uid,
                "treat": t,
                "w": round(w, 4),
                "m": round(m, 4),
                "y": round(y, 4),
                "y0": round(y0, 4),
                "y_m0": round(y_m0, 4),
            })
    return rows


def write_csv(path: Path) -> None:
    rows = generate()
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = ["id", "treat", "w", "m", "y", "y0", "y_m0"]
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


def _treated_mean_gap(rows: list[dict], hi: str, lo: str) -> float:
    diffs = [
        _num(r, hi) - _num(r, lo)
        for r in rows
        if round(_num(r, "treat")) == 1
    ]
    return _mean(diffs)


def true_total(rows: list[dict]) -> float:
    return _treated_mean_gap(rows, "y", "y0")


def true_nde(rows: list[dict]) -> float:
    """Natural direct effect from the unread potential-outcome columns."""
    return _treated_mean_gap(rows, "y_m0", "y0")


def true_nie(rows: list[dict]) -> float:
    """Natural indirect effect from the unread potential-outcome columns."""
    return _treated_mean_gap(rows, "y", "y_m0")


def total_effect(rows: list[dict]) -> float:
    """Difference in mean outcomes by arm (T is randomized)."""
    t = [_num(r, "y") for r in rows if round(_num(r, "treat")) == 1]
    c = [_num(r, "y") for r in rows if round(_num(r, "treat")) == 0]
    return _mean(t) - _mean(c)


def naive_direct(rows: list[dict]) -> float:
    """Y ~ T + M without the mediator-outcome confounder w (the folk move)."""
    X = [[1.0, _num(r, "treat"), _num(r, "m")] for r in rows]
    y = [_num(r, "y") for r in rows]
    return lalonde.ols(X, y)[1]


def nde_hat(rows: list[dict]) -> float:
    """Y ~ T + M + w: coefficient on T (recovers the direct effect)."""
    X = [[1.0, _num(r, "treat"), _num(r, "m"), _num(r, "w")] for r in rows]
    y = [_num(r, "y") for r in rows]
    return lalonde.ols(X, y)[1]


def nie_hat(rows: list[dict]) -> float:
    """Product method: (M ~ T slope) x (Y ~ T + M + w mediator slope)."""
    Xa = [[1.0, _num(r, "treat")] for r in rows]
    m = [_num(r, "m") for r in rows]
    a_hat = lalonde.ols(Xa, m)[1]
    Xb = [[1.0, _num(r, "treat"), _num(r, "m"), _num(r, "w")] for r in rows]
    y = [_num(r, "y") for r in rows]
    b_hat = lalonde.ols(Xb, y)[2]
    return a_hat * b_hat


if __name__ == "__main__":
    data_path = Path(__file__).resolve().parents[1] / "data" / "sim-mediation.csv"
    write_csv(data_path)
    print(f"Wrote {data_path}")
