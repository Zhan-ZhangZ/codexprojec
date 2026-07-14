# FAQ & troubleshooting

## Installation & imports

**Do I need PyTorch / JAX / PyMC?**
No. The core install has no heavy ML dependencies. Those back specific
estimators and are lazily imported, so you only hit an `ImportError` if you
call an estimator that needs an extra you have not installed. The error tells
you which extra to add, e.g.:

```bash
pip install "StatsPAI[bayes]"     # PyMC + ArviZ
pip install "StatsPAI[neural]"    # PyTorch (neural causal, DeepIV)
pip install "StatsPAI[performance]"  # JAX
```

**`import statspai as sp` — is there a second import I need?**
No. Every public function is reachable as `sp.<name>`. If you cannot find
something, `sp.search_functions("keyword")` or `sp.help(search="keyword")`
will locate it.

## Discovering functionality

**How do I find the right function?**

```python
sp.recommend(df, y="y", treat="d")   # suggest an estimator from the data
sp.detect_design(df)                  # what study design is this?
sp.search_functions("synthetic control")
sp.help("did")                        # category / function help
```

**How do I see a function's assumptions before I run it?**

```python
sp.agent_card("callaway_santanna")    # assumptions, pre-conditions, failure modes
sp.function_schema("did", agent_native=True)   # same, as an LLM tool schema
```

## Reading the output

**What do the warnings mean?**
StatsPAI fails loudly rather than returning silent `NaN`s. Common warnings:

- `AssumptionWarning` / `AssumptionViolation` — an identifying assumption looks
  violated (e.g. pre-trends, overlap). Inspect `result.diagnostics`.
- `ConvergenceWarning` — an iterative/MCMC fit did not converge cleanly
  (e.g. `rhat > 1.01` or low ESS for Bayesian estimators). Increase
  iterations/draws.
- `WorkflowDegradedWarning` — an orchestration step (`sp.paper`, `smart`
  workflows) degraded a section; the reason is recorded in
  `result.degradations`.

**My DiD pre-trends look violated — now what?**
Quantify how sensitive the conclusion is with Rambachan–Roth honest bounds:

```python
sp.honest_did(r)
```

→ [Sensitivity analysis guide](guides/honest_did.md)

**My IV estimate has a huge confidence interval.**
Almost always a weak first stage. Check it and switch to weak-instrument-robust
inference:

```python
sp.iv_diag(data, y="y", endog="d", instruments="z")  # effective F + AR interval
```

**"Poor overlap" / extreme propensity scores.**
Treated and control covariate distributions barely overlap. Trim or restrict
to the common-support region:

```python
sp.trimming(df, treat="d", covariates=[...])
sp.overlap_plot(sp.ps_balance(df, treat="d", covariates=[...]))
```

## Reproducibility

**How do I make results deterministic?**

```python
with sp.session(seed=42):
    r = sp.callaway_santanna(df, y="lemp", g="first_treat", t="year", i="countyreal")
```

`sp.session` fixes the global RNG state for bootstrap / permutation / MCMC
draws inside the block.

## Citations

**How do I cite an estimator correctly?**

```python
r.cite()                  # verified BibTeX for the method you ran
sp.bib_for(r)             # structured citation payload
```

StatsPAI never invents references — every citation is verified against
`paper.bib`.

## Using StatsPAI from an agent / LLM

Every function returns structured results and carries a self-describing
schema. The typical agent loop:

```python
sp.detect_design(df)                       # 1. identify the design
sp.preflight(df, method="callaway_santanna")  # 2. will it run?
r = sp.callaway_santanna(df, ...)          # 3. fit
r.to_dict(detail="agent")                  # 4. structured payload
sp.audit(r)                                # 5. missing robustness checks
r.cite()                                   # 6. verified citation
```

→ [Agent-native API surface](guides/agent_api.md)

## Numerical correctness

**Did the numbers change between versions?**
Correctness fixes are flagged with **⚠️ correctness** in the
[changelog](changelog.md) and recorded in `MIGRATION.md`. If you are
reproducing an older analysis, check those notes for the modules you use.
