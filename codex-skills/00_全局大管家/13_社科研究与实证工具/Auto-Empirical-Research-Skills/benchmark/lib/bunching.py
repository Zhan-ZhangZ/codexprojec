#!/usr/bin/env python3
"""Pure-stdlib bunching estimator for a kink at a known threshold.

Deterministic, noiseless design. Baseline density over the kink support
(support = {0..2*K}, half below the threshold and half above) is the linear
f = 1 + 0.5*x. The agent in question acts on a kink: the marginal return
moves from alpha_low = 1.0 below K to alpha_high = 1.5 above K, so a
rational agent maximizes after-tax utility by bunching exactly at the
threshold K. Population density under the agent's behavior is therefore:

    f*(x) =
        f_bunch                          if x = K
        (1 - B) * f(x) / (1 - f(K))       otherwise, x != K

where B is the (known) bunching mass at K chosen so that the counterfactual
density (re-normalized to keep total mass at 1) integrates to 1.

The lesson is the exact answer for excess mass (E = B), the population
density above the kink, and the elasticity implied by the bunching shape.
All three golds are recomputed from the data by the checker; a candidate
that reports the unmodified f at the kink or forgets the counterfactual
renormalization misses the load-bearing facts.

The untreated potential density f_0 ships as a column the estimators never
read, so honest-* golds check the recomputation directly.
"""

from __future__ import annotations

import csv
import math
from pathlib import Path

K = 10                        # kink at x = 10
SUPPORT = list(range(0, 2 * K + 1))   # 0..20
ALPHA_LOW = 1.0
ALPHA_HIGH = 1.5
BUNCH_MASS = 0.20            # known share that bunches exactly at K


def baseline_density(x: int) -> float:
    """Untreated density f(x) = 1 + 0.5*x, normalized over the support."""
    f = 1.0 + 0.5 * x
    return f


def _normalize(values: list[float]) -> list[float]:
    z = sum(values)
    return [v / z for v in values]


def _renormalized_counterfactual(bunch_at_K: float, support: list[int]) -> list[float]:
    """Counterfactual density f_cf: zero out K, rescale non-K mass to 1 - B."""
    non_k_total = sum(baseline_density(x) for x in support if x != K)
    out = []
    for x in support:
        if x == K:
            out.append(0.0)
        else:
            out.append(baseline_density(x) / non_k_total * (1.0 - bunch_at_K))
    return out


def generate() -> list[dict]:
    non_k_total = sum(baseline_density(x) for x in SUPPORT if x != K)
    f_bunch = BUNCH_MASS
    rows: list[dict] = []
    uid = 0
    for x in SUPPORT:
        uid += 1
        if x == K:
            f_obs = f_bunch
        else:
            f_obs = (1.0 - BUNCH_MASS) * baseline_density(x) / non_k_total
        # The untreated density is the would-be baseline at that x.
        f0 = baseline_density(x) / sum(baseline_density(v) for v in SUPPORT)
        rows.append({
            "id": uid,
            "x": x,
            "f_obs": round(f_obs, 6),
            "f0": round(f0, 6),
        })
    return rows


def write_csv(path: Path) -> None:
    rows = generate()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=["id", "x", "f_obs", "f0"])
        writer.writeheader()
        writer.writerows(rows)


def load(data_path: Path) -> list[dict]:
    with data_path.open(encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def _num(row: dict, key: str) -> float:
    return float(row[key])


def observed_density_at(rows: list[dict], x: int) -> float:
    return next(_num(r, "f_obs") for r in rows if int(round(_num(r, "x"))) == x)


def counterfactual_density_at(rows: list[dict], x: int) -> float:
    """Counterfactual density at x (non-K: re-normalized to 1 - B; K: zero)."""
    if x == K:
        return 0.0
    cf = _renormalized_counterfactual(BUNCH_MASS, SUPPORT)
    return next(v for v, xv in zip(cf, SUPPORT) if xv == x)


def excess_mass(rows: list[dict]) -> float:
    """Excess mass at the kink: f_obs(K) - f_cf(K)."""
    return observed_density_at(rows, K) - counterfactual_density_at(rows, K)


def observed_density_above(rows: list[dict]) -> float:
    """Total observed mass above the kink (should be depleted relative to baseline)."""
    return sum(_num(r, "f_obs") for r in rows if int(round(_num(r, "x"))) > K)


def naive_density_at(rows: list[dict], x: int) -> float:
    """The 'no kink recognized' answer: quote the unmodified baseline at x."""
    return baseline_density(x) / sum(baseline_density(v) for v in SUPPORT)


def implied_elasticity(rows: list[dict]) -> float:
    """Elasticity implied by the bunching shape under a tight support.

    E_lon = (excess_mass) / |alpha_low - alpha_high| / mass_in_baseline_neighborhood,
    using a +/- 1 window around K as the conventional kink neighborhood.
    """
    b = excess_mass(rows)
    dalpha = abs(ALPHA_HIGH - ALPHA_LOW)
    mass_window = sum(
        observed_density_at(rows, K - 1) + observed_density_at(rows, K + 1)
        for _ in [0]
    )
    return b / dalpha / mass_window if mass_window > 0 else 0.0


if __name__ == "__main__":
    data_path = Path(__file__).resolve().parents[1] / "data" / "sim-bunching.csv"
    write_csv(data_path)
    print(f"Wrote {data_path}")