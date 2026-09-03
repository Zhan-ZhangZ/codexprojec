#!/usr/bin/env python3
"""Pure-stdlib partial interference: what a within-cluster comparison cannot see.

SUTVA — no interference between units — is the assumption almost every applied
paper states in one sentence and then never returns to. This design is what
happens when it fails in the ordinary way: a program is rolled out to some
people in a village, and the *untreated* people in that village benefit too.

Following Hudgens and Halloran (2008), interference is partial: it happens
within clusters and not across them. Unit ``i`` in cluster ``c`` has outcome

    Y_i = b_i + TAU * D_i + GAMMA * p_c

where ``D_i`` is i's own treatment, ``p_c`` is the treated *share* of i's
cluster, ``TAU`` is the direct effect of being treated, and ``GAMMA`` scales the
spillover onto everyone in a treated cluster. Half the clusters are **pure
controls** with ``p_c = 0``; the rest are treated at ``p_c = 0.5``.

That gives four different quantities that all get called "the treatment effect",
and this task is about not confusing them:

============================  =================================  =====
Estimand                      Contrast                           Value
============================  =================================  =====
Direct effect                 treated vs untreated, same cluster  2.0
Spillover effect              untreated in a treated cluster vs
                              anyone in a pure-control cluster    1.5
Total effect on the treated   treated vs pure-control cluster     3.5
Overall (policy) effect       treated cluster vs pure-control
                              cluster, everyone                   2.5
============================  =================================  =====

**The trap.** The within-cluster comparison — the one a field experiment
naturally produces, because both arms are right there — recovers 2.0. That
number is a perfectly good *direct* effect. It is not the effect of the program,
and reporting it as one understates the benefit to a treated person by 43% and
the benefit of rolling the program out by 20%, because the comparison group is
already receiving 1.5 of spillover. The untreated in a treated village are not
controls; they are partially exposed.

A pipeline that gets this right needs pure-control clusters in the design, has
to report the spillover as a quantity rather than assume it away, and has to say
which estimand each number is. A pipeline that gets it wrong reports one number.

**Why the golds are exact.** Baselines are balanced by construction — treated
and untreated units within a cluster have identical mean ``b``, and treated and
pure-control clusters have identical mean cluster effect — so every contrast is
the design parameter with no residual. The dataset also ships ``y0``, each
unit's outcome with no treatment anywhere in its cluster, as a column no
estimator reads, so the checker recomputes the truth from the data.
"""

from __future__ import annotations

import csv
from pathlib import Path

# --- design constants -----------------------------------------------------
N_CLUSTERS = 40           # half pure control, half treated
UNITS_PER_CLUSTER = 20
TREATED_SHARE = 0.5       # within a treated cluster
TAU = 2.0                 # direct effect of own treatment
GAMMA = 3.0               # spillover scale; realized spillover is GAMMA * p_c

FIELDNAMES = ["cluster", "unit", "cluster_treated", "treated", "share_treated", "y", "y0"]


def _unit_baseline(unit: int) -> float:
    """Balanced across the within-cluster treated/untreated split.

    Treatment goes to even unit indices, and this takes the same mean over even
    and over odd indices, so the within-cluster contrast carries no baseline
    difference. That is what makes the recovered direct effect exactly TAU.
    """
    return 0.5 * (unit % 5)


def _cluster_baseline(cluster: int) -> float:
    """Balanced across the treated/pure-control cluster split.

    Clusters are paired (0,1), (2,3), … with the even member a pure control and
    the odd member treated, and both members of a pair share this value — so the
    between-cluster contrasts carry no cluster-composition difference either.
    """
    return 0.25 * ((cluster // 2) % 5)


def is_treated_cluster(cluster: int) -> bool:
    return cluster % 2 == 1


def is_treated_unit(cluster: int, unit: int) -> bool:
    return is_treated_cluster(cluster) and unit % 2 == 0


def generate() -> list[dict]:
    rows: list[dict] = []
    for cluster in range(N_CLUSTERS):
        share = TREATED_SHARE if is_treated_cluster(cluster) else 0.0
        for unit in range(UNITS_PER_CLUSTER):
            treated = is_treated_unit(cluster, unit)
            baseline = _unit_baseline(unit) + _cluster_baseline(cluster)
            rows.append(
                {
                    "cluster": cluster,
                    "unit": unit,
                    "cluster_treated": int(is_treated_cluster(cluster)),
                    "treated": int(treated),
                    "share_treated": round(share, 6),
                    "y": round(baseline + TAU * treated + GAMMA * share, 8),
                    # The counterfactual with no treatment anywhere in the
                    # cluster. No estimator below reads it.
                    "y0": round(baseline, 8),
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
# estimators (these read only observable columns)
# --------------------------------------------------------------------------
def _mean(rows: list[dict], field: str = "y") -> float:
    return sum(float(r[field]) for r in rows) / len(rows)


def _select(rows: list[dict], *, cluster_treated: int, treated: int | None = None):
    out = [r for r in rows if int(r["cluster_treated"]) == cluster_treated]
    if treated is not None:
        out = [r for r in out if int(r["treated"]) == treated]
    return out


def direct_effect(rows: list[dict]) -> float:
    """Treated vs untreated *within the treated clusters*.

    The comparison a cluster-randomized rollout hands you for free, and the one
    that answers "what did being treated do for me, given my village was in the
    program" — not "what did the program do".
    """
    treated = _select(rows, cluster_treated=1, treated=1)
    untreated = _select(rows, cluster_treated=1, treated=0)
    return _mean(treated) - _mean(untreated)


def spillover_effect(rows: list[dict]) -> float:
    """Untreated in a treated cluster vs units in a pure-control cluster.

    Invisible to a within-cluster design: both of its arms sit inside treated
    clusters, so this contrast has no representative there at all.
    """
    exposed = _select(rows, cluster_treated=1, treated=0)
    pure = _select(rows, cluster_treated=0)
    return _mean(exposed) - _mean(pure)


def total_effect_on_treated(rows: list[dict]) -> float:
    """Treated units vs pure-control clusters: direct effect plus spillover."""
    treated = _select(rows, cluster_treated=1, treated=1)
    pure = _select(rows, cluster_treated=0)
    return _mean(treated) - _mean(pure)


def overall_effect(rows: list[dict]) -> float:
    """Whole treated cluster vs whole pure-control cluster.

    The policy-relevant number: what changes if the program is rolled out to a
    village at this saturation, averaged over everyone in it.
    """
    return _mean(_select(rows, cluster_treated=1)) - _mean(_select(rows, cluster_treated=0))


def naive_spillover(rows: list[dict]) -> float:
    """What a SUTVA-assuming pipeline reports for the spillover: zero.

    Not a strawman — assuming it away is the default, and it is what "we assume
    no interference between units" means when nothing follows it.
    """
    return 0.0


# --- truth, recomputed from the unread y0 column --------------------------
def true_direct_effect(rows: list[dict]) -> float:
    treated = _select(rows, cluster_treated=1, treated=1)
    return _mean(treated) - _mean(treated, "y0") - (
        _mean(_select(rows, cluster_treated=1, treated=0))
        - _mean(_select(rows, cluster_treated=1, treated=0), "y0")
    )


def true_spillover_effect(rows: list[dict]) -> float:
    exposed = _select(rows, cluster_treated=1, treated=0)
    return _mean(exposed) - _mean(exposed, "y0")


def true_total_effect_on_treated(rows: list[dict]) -> float:
    treated = _select(rows, cluster_treated=1, treated=1)
    return _mean(treated) - _mean(treated, "y0")


def true_overall_effect(rows: list[dict]) -> float:
    treated_clusters = _select(rows, cluster_treated=1)
    return _mean(treated_clusters) - _mean(treated_clusters, "y0")


def n_pure_control_clusters(rows: list[dict]) -> int:
    return len({int(r["cluster"]) for r in rows if int(r["cluster_treated"]) == 0})


if __name__ == "__main__":
    data_path = Path(__file__).resolve().parents[1] / "data" / "sim-spillover.csv"
    write_csv(data_path)
    print(f"Wrote {data_path}")
