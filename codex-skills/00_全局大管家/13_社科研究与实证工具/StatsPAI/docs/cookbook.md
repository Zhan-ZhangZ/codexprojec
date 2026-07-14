# Cookbook — recipes by research question

Find the method by the question you are actually asking, not by its textbook
name. Each recipe is a minimal, runnable starting point; follow the linked
guide or [API reference](reference/api/index.md) for the full options.

!!! tip "Let StatsPAI choose"
    If you are unsure, `sp.recommend(df, y=..., treat=...)` and
    `sp.detect_design(df)` will suggest an estimator from the data shape.

---

## "A policy turned on for different units at different times"

Staggered-adoption difference-in-differences. Two-way fixed effects is biased
here; use a heterogeneity-robust estimator.

```python
import statspai as sp
df = sp.datasets.mpdta()
r = sp.callaway_santanna(df, y="lemp", g="first_treat", t="year", i="countyreal")
r.summary()
```

→ [Choosing a DID estimator](guides/choosing_did_estimator.md) ·
[Callaway–Sant'Anna guide](guides/callaway_santanna.md)

## "One unit got treated and I have many untreated comparison units"

Synthetic control — build a weighted combination of donors that tracks the
treated unit before treatment.

```python
r = sp.synth(df, y="outcome", unit="state", time="year",
             treated="California", treat_period=1989)
r.plot()
```

→ [Synthetic control guide](guides/synth.md) ·
[`sp.synth` family](reference/synth.md)

## "Treatment is endogenous but I have an instrument"

Instrumental variables. Check the first stage before trusting the estimate.

```python
data = sp.datasets.card_1995()
r = sp.ivreg("lwage ~ (educ ~ nearc4) + exper + black + south", data=data)
r.summary()
# weak-instrument-robust reporting bundle:
sp.iv_diag(data, y="lwage", endog="educ", instruments="nearc4")
```

→ [Choosing an IV estimator](guides/choosing_iv_estimator.md) ·
[IV reference](reference/iv.md)

## "Treatment is assigned by a cutoff on a running variable"

Regression discontinuity.

```python
data = sp.datasets.lee_2008_senate()
r = sp.rdrobust(data["vote_t1"], data["margin"], c=0.0)
r.summary()
```

→ [Choosing an RD estimator](guides/choosing_rd_estimator.md) ·
[RD reference](reference/rd.md)

## "I want the effect for everyone, not just the average (heterogeneity)"

Conditional average treatment effects (CATE) via meta-learners, causal
forest, or double ML.

```python
r = sp.dml(df, y="y", treat="d", covariates=["x1", "x2", "x3"], model="irm")
cate = sp.auto_cate(df, y="y", treat="d", covariates=["x1", "x2", "x3"])
```

→ [Choosing an ML causal estimator](guides/choosing_ml_causal_estimator.md)

## "I have rich confounders and want a robust observational estimate"

Double/debiased ML or TMLE — both doubly robust, both need overlap.

```python
r = sp.dml(df, y="y", treat="d", covariates=[...], model="irm", ml_g="rf", ml_m="rf")
r = sp.tmle(df, y="y", treat="d", covariates=[...])
```

→ [`sp.dml` vs DoubleML](guides/sp_dml_vs_doubleml.md)

## "Why is the gap between two groups what it is?" (decomposition)

Oaxaca–Blinder and RIF/recentered-influence-function decompositions.

```python
r = sp.decompose(df, y="wage", group="female", covariates=["edu", "exp"],
                 method="oaxaca")
```

→ [Decomposition family](guides/decomposition_family.md) ·
[Decomposition reference](reference/decomposition.md)

## "Match treated and control units on covariates"

Propensity-score / entropy-balancing / optimal matching.

```python
ps = sp.propensity_score(df, treat="d", covariates=["x1", "x2"])
w  = sp.ebalance(df, treat="d", covariates=["x1", "x2"])   # entropy balancing
sp.love_plot(sp.balance_diagnostics(df, treat="d", covariates=["x1", "x2"]))
```

→ [Choosing a matching estimator](guides/choosing_matching_estimator.md)

## "Panel regression with many fixed effects"

reghdfe-style high-dimensional fixed effects.

```python
r = sp.hdfe_ols("y ~ x1 + x2 | firm + year", data=df, cluster="firm")
```

→ [Panel reference](reference/panel.md)

---

## After any estimate: the agent-native follow-ups

```python
r.summary()        # human-readable
r.to_dict()        # structured payload for agents
sp.audit(r)        # what robustness checks are missing?
r.cite()           # verified BibTeX
r.to_latex(...)    # publication export
```
