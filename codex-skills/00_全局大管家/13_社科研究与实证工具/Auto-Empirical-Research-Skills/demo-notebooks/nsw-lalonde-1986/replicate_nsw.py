#!/usr/bin/env python3
"""End-to-end replication of the NSW experimental benchmark, and of LaLonde's problem.

Two estimates of the *same* treatment effect, on the *same* 185 treated men:

    against the randomized NSW controls (260 men)  :  +$1,794
    against a PSID comparison sample (429 men)     :    -$635

That gap is LaLonde (1986). Non-experimental comparison groups did not
reproduce the experimental answer — they did not even get the sign right — and
that finding is why the matching, weighting and doubly-robust literature exists.
Dehejia & Wahba (1999) later showed the re74 subsample used here can be brought
back to the experimental number by conditioning on pre-treatment earnings, which
is what the repo's `lalonde-recovery` benchmark task grades.

Why this script exists: until now the +$1,794 experimental benchmark lived in
the repo only as a hand-transcribed literature constant in
`benchmark/tasks/lalonde-recovery.toml`. A transcribed constant is a claim. This
derives it from the randomized data — 185 treated minus 260 controls, no model,
no covariates — so the constant the benchmark grades against is reproducible
rather than asserted. `tests/test_nsw_replication.py` pins the two to each
other, so editing the constant without the data (or vice versa) fails the suite.

The script also runs the randomization check that licenses the simple
difference: with random assignment, pre-treatment earnings should be balanced
across arms, and they are (re74 differs by $11 on a base of ~$2,100). The same
check against the PSID comparison group fails by $3,500 — which is the visible
symptom of the problem, available before anyone looks at the outcome.

Pure stdlib, one command, and it EXITS NON-ZERO if any anchor is missed.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
TREATED = HERE / "data" / "nswre74_treated.txt"
CONTROL = HERE / "data" / "nswre74_control.txt"
# The observational arm: same 185 treated men, PSID-1 comparison group.
OBSERVATIONAL = ROOT / "demo-notebooks" / "_lalonde_data.csv"
OUT = HERE / "estimates.json"

# Column order of the Dehejia NSW files (see data/PROVENANCE.md).
COLUMNS = [
    "treat", "age", "education", "black", "hispanic",
    "married", "nodegree", "re74", "re75", "re78",
]

PUBLISHED = {
    # Sample sizes of the re74 subsample (Dehejia & Wahba 1999).
    "n_treated": (185, 0),
    "n_control": (260, 0),
    # The experimental benchmark the repo's lalonde-recovery task cites.
    "experimental_att": (1794.0, 1.0),
}

# Randomization should leave pre-treatment earnings balanced. $150 on a base of
# ~$2,100 is a loose bound chosen to be a real check without being brittle; the
# actual imbalance is an order of magnitude smaller.
MAX_EXPERIMENTAL_RE74_GAP = 150.0
# The PSID comparison group is not remotely balanced, and this is detectable
# before looking at the outcome at all.
MIN_OBSERVATIONAL_RE74_GAP = 1000.0


# --------------------------------------------------------------------------
# data
# --------------------------------------------------------------------------
def load_nsw(path: Path) -> list[dict]:
    """Parse one of Dehejia's whitespace-delimited NSW files."""
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        values = [float(v) for v in line.split()]
        if len(values) != len(COLUMNS):
            raise ValueError(f"{path.name}: expected {len(COLUMNS)} columns, got {len(values)}")
        rows.append(dict(zip(COLUMNS, values)))
    return rows


def load_observational(path: Path) -> tuple[list[dict], list[dict]]:
    """The composite file: NSW treated + PSID-1 comparison group."""
    import csv

    with path.open(encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    treated = [r for r in rows if r["treat"] == "1"]
    control = [r for r in rows if r["treat"] == "0"]
    return treated, control


def mean(rows: list[dict], field: str) -> float:
    return sum(float(row[field]) for row in rows) / len(rows)


# --------------------------------------------------------------------------
# estimation
# --------------------------------------------------------------------------
def replicate() -> dict:
    treated = load_nsw(TREATED)
    control = load_nsw(CONTROL)
    obs_treated, psid_control = load_observational(OBSERVATIONAL)

    experimental_att = mean(treated, "re78") - mean(control, "re78")
    observational_att = mean(obs_treated, "re78") - mean(psid_control, "re78")

    return {
        "n_treated": len(treated),
        "n_control": len(control),
        "n_psid_control": len(psid_control),
        # The experiment.
        "treated_re78": mean(treated, "re78"),
        "control_re78": mean(control, "re78"),
        "experimental_att": experimental_att,
        # The randomization check that licenses the simple difference.
        "experimental_re74_gap": mean(treated, "re74") - mean(control, "re74"),
        "experimental_re75_gap": mean(treated, "re75") - mean(control, "re75"),
        "experimental_age_gap": mean(treated, "age") - mean(control, "age"),
        # The observational contrast, same treated arm.
        "psid_control_re78": mean(psid_control, "re78"),
        "observational_att": observational_att,
        "observational_re74_gap": mean(obs_treated, "re74") - mean(psid_control, "re74"),
        "observational_re75_gap": mean(obs_treated, "re75") - mean(psid_control, "re75"),
        # What LaLonde's problem costs, in dollars.
        "selection_bias": observational_att - experimental_att,
    }


def same_treated_arm() -> bool:
    """Both arms of this script must use the identical 185 treated men.

    The whole comparison is meaningless if the experimental and observational
    estimates are of different treatment groups, so this is verified rather
    than assumed: the treated mean of every shared pre-treatment covariate and
    of the outcome must agree between the two files.
    """
    treated = load_nsw(TREATED)
    obs_treated, _ = load_observational(OBSERVATIONAL)
    if len(treated) != len(obs_treated):
        return False
    pairs = [("age", "age"), ("education", "educ"), ("married", "married"),
             ("nodegree", "nodegree"), ("re74", "re74"), ("re75", "re75"),
             ("re78", "re78")]
    return all(
        abs(mean(treated, nsw) - mean(obs_treated, csv)) < 0.01 for nsw, csv in pairs
    )


# --------------------------------------------------------------------------
# report + gate
# --------------------------------------------------------------------------
def main() -> int:
    for path in (TREATED, CONTROL, OBSERVATIONAL):
        if not path.exists():
            print(f"missing dataset: {path}", file=sys.stderr)
            return 1
    got = replicate()

    print("NSW experimental benchmark — computed vs published")
    print("-" * 62)
    failures = []
    for key, (published, tol) in PUBLISHED.items():
        value = got[key]
        if tol == 0:
            ok = int(value) == int(published)
            shown = f"{int(value)} vs {int(published)}"
        else:
            ok = abs(value - published) <= tol
            shown = f"{value:,.2f} vs {published:,.2f} (tol {tol})"
        print(f"  [{'PASS' if ok else 'FAIL'}] {key:<24} {shown}")
        if not ok:
            failures.append(key)

    checks = [
        (
            "randomization_balanced",
            abs(got["experimental_re74_gap"]) <= MAX_EXPERIMENTAL_RE74_GAP,
            f"pre-treatment re74 gap ${got['experimental_re74_gap']:+,.0f} "
            f"(|gap| <= ${MAX_EXPERIMENTAL_RE74_GAP:,.0f})",
        ),
        (
            "psid_group_is_imbalanced",
            abs(got["observational_re74_gap"]) >= MIN_OBSERVATIONAL_RE74_GAP,
            f"pre-treatment re74 gap ${got['observational_re74_gap']:+,.0f} "
            f"(|gap| >= ${MIN_OBSERVATIONAL_RE74_GAP:,.0f})",
        ),
        (
            "observational_flips_the_sign",
            got["observational_att"] < 0 < got["experimental_att"],
            f"experimental ${got['experimental_att']:+,.0f} vs "
            f"observational ${got['observational_att']:+,.0f}",
        ),
        (
            "same_treated_arm",
            same_treated_arm(),
            "both estimates use the identical 185 treated men",
        ),
    ]
    for name, ok, detail in checks:
        print(f"  [{'PASS' if ok else 'FAIL'}] {name:<24} {detail}")
        if not ok:
            failures.append(name)

    print()
    print(f"  Experimental controls  (n={got['n_control']}): re78 = ${got['control_re78']:,.0f}")
    print(f"  PSID-1 comparison      (n={got['n_psid_control']}): re78 = ${got['psid_control_re78']:,.0f}")
    print(f"  Treated                (n={got['n_treated']}): re78 = ${got['treated_re78']:,.0f}")
    print(
        f"  Selection bias: ${got['selection_bias']:,.0f} — the distance between what the "
        "experiment\n                  says and what the comparison group says, on the same men."
    )

    OUT.write_text(
        json.dumps(
            {
                "candidate": "aers-nsw-experimental-benchmark",
                "source": (
                    "demo-notebooks/nsw-lalonde-1986/replicate_nsw.py "
                    "(pure stdlib, Dehejia NSW re74 subsample + vendored PSID-1 composite)"
                ),
                "coefficients": {
                    "experimental_att": {"value": round(got["experimental_att"], 2)},
                    "observational_att": {"value": round(got["observational_att"], 2)},
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
        print(f"FAIL: missed anchors: {', '.join(failures)}", file=sys.stderr)
        return 1
    print("OK: the experimental benchmark is derived from the randomized data, not cited")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
