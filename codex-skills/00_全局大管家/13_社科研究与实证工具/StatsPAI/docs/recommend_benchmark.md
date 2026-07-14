# Recommendation hit-rate benchmark

> The moat is not "the agent loop runs" — it is **"the agent loop is right."** A
> plausible-but-wrong recommendation is worse than no recommendation, because it
> carries authority. If StatsPAI recommends TWFE on a staggered design, or an
> audit misses a robustness check a good referee would ask, the moat reverses
> into a trust collapse. This benchmark is the public, agent-native quality
> metric that keeps that from happening.

## What it measures

`sp.recommend_benchmark()` scores `sp.recommend` (and `sp.audit` coverage)
against a ground-truth corpus of published and archetypal empirical designs:

- **recommend hit-rate** — does the top-k recommendation contain an
  econometrically *acceptable* estimator for the design? A **hard miss** is
  leading (top-1) with a *disqualifying* estimator (e.g. TWFE on a staggered
  design). `hard-miss = 0` is the non-negotiable invariant.
- **audit recall** — does `sp.audit` know the design's ground-truth robustness
  checks? Measured both statically (catalog coverage) and dynamically (fit the
  top-1 estimator, run `sp.audit`, confirm it surfaces them with an actionable
  `suggest_function`).

## Querying it

Humans and agents query the hit-rate the same way they query everything else:

```python
import statspai as sp

card = sp.recommend_benchmark()           # full run (recommend + dynamic audit)
card["summary"]["hit_rate_top1"]          # e.g. 1.0
card["summary"]["hard_miss_rate"]         # 0.0 — the invariant
card["summary"]["audit_dynamic_mean_recall"]

# per-design rows
for r in card["recommend"]:
    print(r["id"], r["status"], r["top1_tag"])
```

The CLI regenerates the human-readable scorecard and runs the CI ratchet:

```bash
python benchmarks/recommend_hit_rate/harness.py            # report + scorecard
python benchmarks/recommend_hit_rate/harness.py --check --min-hit-rate 0.9
```

## Current results

15 designs — 8 Tier-A (bundled real data: Callaway-Sant'Anna `mpdta`,
Card 1995, Angrist-Krueger 1991, Lee 2008, three Abadie synthetic-control
studies, Dehejia-Wahba 1995) and 7 Tier-B adversarial archetypes (synthetic
stubs via `sp.dgp_*`, each anchored to a DOI-verified method/critique paper):

| metric | value |
| --- | --- |
| top-1 hit-rate | **1.0** (15/15) |
| hard-miss rate | **0.0** |
| audit catalog mean recall (static) | 1.0 |
| audit dynamic mean recall (fit+audit) | **1.0** |

The engine resisted every adversarial trap: staggered + heterogeneous effects →
Callaway-Sant'Anna (never TWFE); weak instrument → LIML / Anderson-Rubin; strong
instrument → 2SLS; single-treated-unit panel → synthetic control; strong
confounding → propensity-score matching (never bare OLS). The live scorecard and
the findings that drove fixes live in
[`benchmarks/recommend_hit_rate/`](https://github.com/brycewang-stanford/StatsPAI/tree/main/benchmarks/recommend_hit_rate).

## Methodology and integrity

- **Ground truth is explicit and reviewable.** Per design, the corpus records
  the *acceptable* estimator equivalence class and the *disqualifying* set (e.g.
  CS ≈ Sun-Abraham ≈ did_imputation are all valid-staggered; TWFE-on-staggered
  is disqualifying). The prose-label → estimator-tag normalization is a single,
  explicit table.
- **Citation discipline (CLAUDE.md §10).** Every cited paper resolves to a
  DOI-verified `bib_key` in `paper.bib`; the benchmark reports a citation error
  if any corpus key is missing. Robustness-check provenance is labelled (the
  paper's own section, a published methodological critique, or a later method
  the field expects) and never fabricates a referee report.
- **Non-regressing.** The CI ratchet (`recommend-benchmark.yml`) fails the build
  on any hard-miss, error, citation error, or hit-rate below the pinned floor —
  so the moat cannot silently erode.
