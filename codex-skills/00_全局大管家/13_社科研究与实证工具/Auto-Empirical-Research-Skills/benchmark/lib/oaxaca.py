#!/usr/bin/env python3
"""Pure-stdlib Oaxaca–Blinder decomposition computations.

Deterministic, noiseless two-group wage design. Each group's outcome is an
exact linear function of a single skill measure x, so within-group OLS
recovers the group intercept and slope with zero error:

    group A (advantaged): y = 2.0 + 2.0 * x,  x in {1..5} x 20 units, mean 3.0
    group B:              y = 1.0 + 1.5 * x,  x in {0,1,2} (40/20/40), mean 1.0

Raw gap = mean(y_A) - mean(y_B) = 8.0 - 2.5 = 5.5. The twofold decomposition
splits it into an "explained" endowment part and an "unexplained" coefficient
part — but the split depends on the reference coefficient vector:

    reference A: explained = b1_A * (xbar_A - xbar_B)            = 4.0
                 unexplained = (b0_A - b0_B) + xbar_B * (b1_A - b1_B) = 1.5
    reference B: explained = b1_B * (xbar_A - xbar_B)            = 3.0
                 unexplained = (b0_A - b0_B) + xbar_A * (b1_A - b1_B) = 2.5

The lessons are numeric, not rhetorical: (1) most of the raw gap is explained
by endowments, so reading the whole 5.5 as "discrimination" overstates the
unexplained part by ~2-4x; and (2) the explained share swings from 73% to 55%
purely by switching the reference (the classic index-number problem), so an
answer that reports a single decomposition without the reference choice is
incomplete. Both references' components add up to the same raw gap, which the
gold checks exploit.
"""

from __future__ import annotations

import csv
from pathlib import Path

GROUP_A = {"b0": 2.0, "b1": 2.0, "x_counts": {1: 20, 2: 20, 3: 20, 4: 20, 5: 20}}
GROUP_B = {"b0": 1.0, "b1": 1.5, "x_counts": {0: 40, 1: 20, 2: 40}}


def generate() -> list[dict]:
    rows: list[dict] = []
    uid = 0
    for group, spec in (("A", GROUP_A), ("B", GROUP_B)):
        for x, count in spec["x_counts"].items():
            for _ in range(count):
                uid += 1
                y = spec["b0"] + spec["b1"] * x
                rows.append({
                    "id": uid,
                    "group": group,
                    "x": x,
                    "y": round(y, 4),
                })
    return rows


def write_csv(path: Path) -> None:
    rows = generate()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=["id", "group", "x", "y"])
        writer.writeheader()
        writer.writerows(rows)


def load(data_path: Path) -> list[dict]:
    with data_path.open(encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def _num(row: dict, key: str) -> float:
    return float(row[key])


def _mean(vals: list[float]) -> float:
    return sum(vals) / len(vals)


def _group_rows(rows: list[dict], group: str) -> list[dict]:
    out = [r for r in rows if r["group"] == group]
    if not out:
        raise ValueError(f"no rows for group {group!r}")
    return out


def mean_x(rows: list[dict], group: str) -> float:
    return _mean([_num(r, "x") for r in _group_rows(rows, group)])


def mean_y(rows: list[dict], group: str) -> float:
    return _mean([_num(r, "y") for r in _group_rows(rows, group)])


def coefs(rows: list[dict], group: str) -> tuple[float, float]:
    """Exact within-group OLS (b0, b1) via the covariance formula.

    The design is noiseless and exactly linear, so this recovers the group's
    structural intercept and slope with zero error.
    """
    grp = _group_rows(rows, group)
    xs = [_num(r, "x") for r in grp]
    ys = [_num(r, "y") for r in grp]
    xbar, ybar = _mean(xs), _mean(ys)
    sxx = sum((x - xbar) ** 2 for x in xs)
    sxy = sum((x - xbar) * (y - ybar) for x, y in zip(xs, ys))
    b1 = sxy / sxx
    b0 = ybar - b1 * xbar
    return b0, b1


def gap(rows: list[dict]) -> float:
    """Raw mean-outcome gap, group A minus group B."""
    return mean_y(rows, "A") - mean_y(rows, "B")


def explained(rows: list[dict], reference: str) -> float:
    """Endowment (explained) component using the reference group's slope."""
    _, b1_ref = coefs(rows, reference)
    return b1_ref * (mean_x(rows, "A") - mean_x(rows, "B"))


def unexplained(rows: list[dict], reference: str) -> float:
    """Coefficient (unexplained) component under the given reference.

    Evaluated at the OTHER group's mean x, so explained + unexplained
    reproduces the raw gap exactly for either reference.
    """
    b0_a, b1_a = coefs(rows, "A")
    b0_b, b1_b = coefs(rows, "B")
    at_x = mean_x(rows, "B") if reference == "A" else mean_x(rows, "A")
    return (b0_a - b0_b) + at_x * (b1_a - b1_b)


def explained_reference_swing(rows: list[dict]) -> float:
    """How much the explained component moves when the reference flips (index-number problem)."""
    return explained(rows, "A") - explained(rows, "B")


if __name__ == "__main__":
    data_path = Path(__file__).resolve().parents[1] / "data" / "sim-oaxaca.csv"
    write_csv(data_path)
    print(f"Wrote {data_path}")
