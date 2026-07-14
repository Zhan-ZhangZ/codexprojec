# Choosing a DID estimator

StatsPAI ships 18 DID variants. This guide is a decision tree: read the
first question, jump to the section it sends you to, and stop when you
have a recommendation. Every answer is grounded in the published
literature.

## 0. TL;DR flowchart

```
Is your panel staggered (units get treated at different times)?
  NO  -> classic 2x2 DID (sp.did)
          +-> Optional robustness: sp.honest_did, sp.drdid
  YES -> Is your treatment effect HOMOGENEOUS across cohorts?
          UNKNOWN -> sp.bacon_decomposition to find out
          YES     -> TWFE is fine, but CS/SA/Wooldridge also work
          NO      -> Do NOT use TWFE. See "Staggered + heterogeneous"
```

## 1. Two-period, two-group ("2x2 DID")

| Use case                                   | Recommended call                                                |
|--------------------------------------------|-----------------------------------------------------------------|
| Standard 2-period 2-group panel            | `sp.did(df, y='y', treat='treated', time='t', post='post')`     |
| With covariates, doubly-robust             | `sp.drdid(df, y='y', d='d', post='post', covariates=[...])`     |
| Repeated cross-section (no panel match)    | `sp.drdid(..., panel=False)` or `sp.did(..., repeated_cs=True)` |
| Unit-by-time cell-level data (DDD)         | `sp.ddd(df, y='y', t1='state', t2='age', t3='year', ...)`       |

**Minimum viable robustness suite for 2x2 DID:**
```python
r = sp.did(df, y='y', treat='treated', time='t', post='post')
r.next_steps()                      # model-specific checklist
sp.honest_did(r, max_M=0.2)         # Rambachan-Roth sensitivity
sp.pretrends_test(r)                # pre-treatment placebo
```

## 2. Staggered adoption

Staggered = units get treated at different calendar times. With
staggered adoption, classic TWFE:
```python
sp.panel(df, 'y ~ treat', entity='i', time='t', method='fe')
```
is biased whenever treatment effects are heterogeneous across cohorts
(Goodman-Bacon 2021; de Chaisemartin & D'Haultfoeuille 2020). Diagnose
first:

```python
bacon = sp.bacon_decomposition(df, y='y', treat='treat',
                               time='t', id='i')
# If most weight goes to "Earlier vs Later Treated" comparisons,
# TWFE is contaminated by already-treated units acting as controls.
```

### 2a. Staggered + homogeneous effects

TWFE is fine here. But CS / SA / Wooldridge are all also unbiased, and
give you event-study flexibility for free. There's no reason to pick
TWFE over them.

### 2b. Staggered + heterogeneous effects

| Scenario                                            | Pick                                                                                |
|-----------------------------------------------------|-------------------------------------------------------------------------------------|
| You want group-time ATT(g,t) + event study          | `sp.callaway_santanna(df, y, g, t, i)`                                              |
| Heavy-weight covariates                             | `sp.callaway_santanna(..., x=[...], estimator='dr')`                                |
| Sun-Abraham interaction-weighted event              | `sp.sun_abraham(df, y, g, t, i)`                                                    |
| Imputation-style (BJS untreated-only TWFE)          | `sp.did(df, y='y', treat='first_treat', time='t', id='i', method='bjs')`             |
| Two-stage regression (event study + covariate ix)   | `sp.gardner_did(df, y=..., group=..., time=..., first_treat=..., event_study=True)` |
| One-call harvesting + precision-weighted            | `sp.harvest_did(df, outcome=..., unit=..., time=..., cohort=...)`                   |
| Two-way Mundlak / ETWFE                             | `sp.wooldridge_did(df, y, group, time, first_treat)`                                |
| Always-treated + never-treated only                 | `sp.stacked_did(df, y, g, t, i, event_window=6)`                                    |
| Continuous / dose treatment                         | `sp.continuous_did(df, y, d, t, i)`                                                 |
| Changes-in-changes (CIC, not DID-in-mean)           | `sp.cic(df, y, g, t)`                                                               |
| de Chaisemartin-D'Haultfoeuille                     | `sp.did_multiplegt(df, y, treat, g, t, i)`                                          |

**Default recommendation when in doubt: `sp.callaway_santanna(..., estimator='dr')`.**
Doubly-robust CS is the modern "no-regret" default — it's robust to both
outcome-model and propensity-score misspecification, and its aggregation
weights (`sp.aggte`) let you switch between simple, group-weighted,
calendar-weighted, and event-study ATT without refitting.

### 2c. Event study with TWFE (legacy)

If you **must** use TWFE event studies for a reviewer:
```python
sp.event_study(df, y='y', d='d', t='t', i='i',
               method='twfe',  # naive; prints warning if staggered
               pretrend_test=True)
```
Prefer `method='sun_abraham'` or run `sp.sun_abraham` directly.

## 3. Sensitivity and robustness

Always run the three-step robustness suite for a publication-quality
DID result:

```python
# 1. Pre-trend test (are pre-treatment coefficients near zero?)
sp.pretrends_test(r, alpha=0.05)

# 2. Honest DID (Rambachan-Roth): how much pre-trend violation can the
#    causal conclusion survive?
hd = sp.honest_did(r, max_M=0.5, method='smoothness')

# 3. Full robustness report: combines pre-trend, placebo, leave-one-cohort-out
sp.robustness_report(r)
```

Optional but highly recommended for DID papers:
- `sp.bjs_pretrend_joint(r)`: Borusyak-Jaravel-Spiess joint pre-trend
  test (addresses multiple-testing issue in per-lag tests).
- `sp.bacon_decomposition`: shows *which* 2x2 comparisons drive your
  TWFE estimate.

## 4. When to avoid DID entirely

DID is the **wrong** tool if:

1. **Treatment is confounded by pre-trends:** use matched DID
   (`sp.drdid`) or synthetic control (`sp.synth`).
2. **Only one treated unit:** use `sp.synth` or `sp.causal_impact`.
3. **Treatment is continuous dose, not 0/1 onset:** use
   `sp.continuous_did` or `sp.bunching` (if at a threshold).
4. **Anticipation effects exist:** use `anticipation=h` parameter in
   CS2021 to backdate the reference period.

## 4.5 Frontier estimators (tracked, partial, or not-yet-landed)

Several post-2020 DiD advances are either **partially** shipped or on
the roadmap. Using them today means knowing what you're getting:

| What you want | Current state | Tracked in |
| --- | --- | --- |
| Continuous-dose DiD — heuristic | `sp.continuous_did(method='att_gt')` dose-quantile 2×2 rollup; **not** CGS (2024) ATT(d\|g,t) | `docs/rfc/continuous_did_cgs.md` |
| Continuous-dose DiD — CGS (2024) ATT(d\|g,t) / ACRT | `sp.continuous_did(method='cgs')` MVP exists; **not yet reference-parity** with R `contdid`, OR-only, bootstrap SE | `docs/rfc/continuous_did_cgs.md` |
| On/off switching — dCDH (2020) DID_M | `sp.did_multiplegt` — pair rollup + joint placebo + avg cumulative (2024 overlay) | shipped |
| On/off switching — dCDH (2024) `_dyn` event-study | `sp.did_multiplegt_dyn(...)` experimental MVP exists; **not yet paper-parity**, cluster-bootstrap SE, switch-on only | `docs/rfc/multiplegt_dyn.md` |
| LP-DiD (Dube, Girardi, Jordà, Taylor 2023) | **Not yet implemented** | `docs/rfc/did_roadmap_gap_audit.md` §4 |
| Triple-difference, heterogeneity-robust | `sp.ddd` textbook only; Olden-Møen / Strezhnev variants pending | `docs/rfc/did_roadmap_gap_audit.md` §4 |
| Time-varying covariates DiD (Caetano et al. 2022) | **Not yet implemented** | `docs/rfc/did_roadmap_gap_audit.md` §4 |

> **Why dCDH (2020) and dCDH (2024) are not the same estimator**: the 2024 ``_dyn`` version does a direct long-difference event-study with "not-yet-treated at horizon `l`" as the per-horizon control group, with its own influence-function variance. `sp.did_multiplegt(dynamic=H)` is the 2020 pair rollup extended to H horizons — numerically close in simple DGPs, but different in identification, control construction, and inference. Use `sp.did_multiplegt_dyn` only when you explicitly accept its current experimental/MVP limitations.

Until frontier items land with reference-parity tests, do not cite their
MVP outputs as fully paper-faithful CGS (2024) / dCDH (2024) estimates.
The current stable heuristics remain dose-bin / pair-rollup estimators;
the MVPs are useful for API and workflow development, but their
identification details and variance formulas are still tracked in the
RFCs with `[待核验]` markers.

## 5. Reading the output

All DID estimators in StatsPAI return a `CausalResult`. The common
interface:

```python
r.estimate    # Point estimate of the main estimand (usually ATT)
r.se          # Standard error (clustered at unit level by default)
r.ci          # (lower, upper) tuple for 95% CI
r.tidy()      # Long-format table (broom-compatible): main, event_study,
              # group_time rows all in one DataFrame
r.glance()    # One-row model-level summary (nobs, pretrend pvalue, etc.)
r.plot()      # Auto-selects event-study / trajectory / coefplot
r.summary()   # Human-readable summary
r.next_steps() # Prioritised robustness checklist
r.cite()      # BibTeX for the underlying paper
```

<!-- AGENT-BLOCK-START: did -->

## For Agents

**Pre-conditions**
- data is panel or repeated cross-section with a time column
- treat column is binary (0/1) for 2x2, or first-treatment-period (int) for staggered
- at least one pre-treatment period (≥ 2 periods for 2x2; ≥ 3 recommended for event study)
- for staggered designs: id column identifying units across time

**Identifying assumptions**
- Parallel trends: treated and control groups would have followed the same trajectory absent treatment
- No anticipation: outcomes in pre-treatment periods are unaffected by future treatment
- SUTVA: no spillovers between units
- For staggered / heterogeneous effects: use CS or SA — TWFE can produce negative weights (Goodman-Bacon)

**Failure modes → recovery**

| Symptom | Exception | Remedy | Try next |
| --- | --- | --- | --- |
| Pre-trend joint test p < 0.05 (or underpowered at 0.10) | `AssumptionViolation` | Use sp.sensitivity_rr (Rambachan & Roth honest CI) or switch to sp.callaway_santanna. | `sp.sensitivity_rr` |
| Staggered treatment timing with TWFE method | `AssumptionWarning` | TWFE can give negative weights; use Callaway-Sant'Anna, Sun-Abraham, or BJS imputation. | `sp.callaway_santanna` |
| Pre-trend test underpowered (Roth 2022) | `AssumptionWarning` | Check sp.pretrends_power — if low, report honest CI via sp.sensitivity_rr. | `sp.sensitivity_rr` |
| Few clusters at unit level | `AssumptionWarning` | Use wild cluster bootstrap (sp.wild_cluster_bootstrap). | `sp.wild_cluster_bootstrap` |

**Alternatives (ranked)**
- `sp.callaway_santanna`
- `sp.sun_abraham`
- `sp.did_imputation`
- `sp.sdid`
- `sp.synth`

**Typical minimum N**: 50

<!-- AGENT-BLOCK-END -->

<!-- AGENT-BLOCK-START: callaway_santanna -->

## For Agents

**Pre-conditions**
- panel data with unit × time × outcome
- g column is integer: first-treated period or 0 for never-treated
- at least one never-treated or late-treated control group
- ≥ 2 pre-treatment periods per cohort
- data is panel or repeated cross-section with a time column
- treat column is binary (0/1) for 2x2, or first-treatment-period (int) for staggered
- at least one pre-treatment period (≥ 2 periods for 2x2; ≥ 3 recommended for event study)
- for staggered designs: id column identifying units across time

**Identifying assumptions**
- Parallel trends conditional on X (if covariates supplied)
- No anticipation (or adjust via anticipation= parameter)
- Overlap: positive propensity for each cohort
- SUTVA
- Parallel trends: treated and control groups would have followed the same trajectory absent treatment
- No anticipation: outcomes in pre-treatment periods are unaffected by future treatment
- SUTVA: no spillovers between units
- For staggered / heterogeneous effects: use CS or SA — TWFE can produce negative weights (Goodman-Bacon)

**Failure modes → recovery**

| Symptom | Exception | Remedy | Try next |
| --- | --- | --- | --- |
| Pre-trend test on aggregated ATT(g,t) rejects | `AssumptionViolation` | Use sp.sensitivity_rr for honest CI, or add covariates for conditional parallel trends. | `sp.sensitivity_rr` |
| Cohort with only one unit — insufficient variation | `DataInsufficient` | Aggregate small cohorts or drop; check sp.diagnose_result. |  |
| All units treated at the same time (no staggering) | `MethodIncompatibility` | Fall back to 2x2 DID via sp.did(method='2x2'). | `sp.did` |
| Pre-trend joint test p < 0.05 (or underpowered at 0.10) | `AssumptionViolation` | Use sp.sensitivity_rr (Rambachan & Roth honest CI) or switch to sp.callaway_santanna. | `sp.sensitivity_rr` |
| Staggered treatment timing with TWFE method | `AssumptionWarning` | TWFE can give negative weights; use Callaway-Sant'Anna, Sun-Abraham, or BJS imputation. | `sp.callaway_santanna` |
| Pre-trend test underpowered (Roth 2022) | `AssumptionWarning` | Check sp.pretrends_power — if low, report honest CI via sp.sensitivity_rr. | `sp.sensitivity_rr` |
| Few clusters at unit level | `AssumptionWarning` | Use wild cluster bootstrap (sp.wild_cluster_bootstrap). | `sp.wild_cluster_bootstrap` |

**Alternatives (ranked)**
- `sp.sun_abraham`
- `sp.did_imputation`
- `sp.sdid`
- `sp.did`
- `sp.callaway_santanna`
- `sp.synth`

**Typical minimum N**: 50

<!-- AGENT-BLOCK-END -->
