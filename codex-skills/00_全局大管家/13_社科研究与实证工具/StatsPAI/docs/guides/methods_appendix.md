# Methods and Formulas appendix

Stata ships a *Methods and Formulas* section for every estimator; R packages
anchor theirs to a JSS paper. For a tool that aims to *write* the paper, the
killer feature is that **every reported number traces back to three things at
once** — the estimand / estimator definition, the inference that actually ran,
and a verified citation. StatsPAI emits exactly that disclosure from any fitted
result:

```python
import statspai as sp
```

---

## 1. The 30-second version

```python
res = sp.did(df, y="wage", treat="trained", time="year", id="id")

print(res.to_appendix(format="markdown"))   # one estimator
```

…or assemble an appendix for several results at once:

```python
sp.methods_appendix([res_did, res_iv, res_rd], format="latex")
```

Both return a string. `to_appendix` is a thin method on the result;
`sp.methods_appendix(...)` is the free-function form (it also accepts a list and
de-duplicates by estimator family). Formats: `"latex"`, `"markdown"`, `"text"`.

---

## 2. What a section contains

Each estimator block carries, in order:

| Part | Source | Example |
| --- | --- | --- |
| **Estimand** | curated LaTeX | $\tau_{\mathrm{ATT}} = \mathbb{E}[Y_i(1)-Y_i(0)\mid D_i=1]$ |
| **Estimator** | curated LaTeX | the 2×2 double difference, the sharp-RD limit contrast, the IV Wald ratio… |
| **Identifying assumptions** | curated list | parallel trends, no anticipation, overlap… |
| **Inference (as fitted)** | read off the result | `se_method`, cluster variable, bootstrap reps, bandwidth, first-stage *F*, the realised SE / CI |
| **Reference** | `result.cite()` | the APA string from `paper.bib` (single source) |
| **Provenance** | runtime | `Produced by StatsPAI vX.Y.Z; estimator '…' → methods spec '…'` |

The inference and provenance lines describe the **code path that actually ran**,
not a transcribed textbook formula — so the SE description can never silently
disagree with the implementation.

Toggle any block off:

```python
res.to_appendix(
    format="markdown",
    include_assumptions=False,
    include_diagnostics=False,   # the Inference block
    include_citation=False,
    include_provenance=False,
)
```

---

## 3. Zero-hallucination by construction

The estimand / estimator LaTeX and the assumptions are **stored, never
generated** — a curated table mirroring the project's citation policy
(CLAUDE.md §10). Standard-error *math* is deliberately **not** transcribed; the
appendix reports the SE *method the code used* instead, so the disclosure stays
in lockstep with the implementation.

An unregistered estimator degrades to an explicit placeholder, **never an
invented formula**:

```text
### some_custom_estimator
(Methods text not yet registered for method 'some_custom_estimator'.
 Estimand / inference reported from the fitted result below.)
Inference (as fitted):
  - Standard errors: cluster-robust.
Produced by StatsPAI vX.Y.Z; estimator 'some_custom_estimator' → no methods spec registered.
```

---

## 4. Coverage

34 estimator families are registered, resolved from the same key logic as
`result.cite()` (so methods text and citation stay aligned):

- **DiD family** — 2×2, TWFE, Callaway–Sant'Anna, Sun–Abraham, doubly-robust
  DiD, de Chaisemartin–D'Haultfœuille, event study, triple differences,
  imputation DiD, changes-in-changes, LP-DiD, continuous-treatment DiD.
- **RD / IV** — local-polynomial RD, 2SLS / LATE, Bartik (shift-share).
- **Synthetic control** — SC, synthetic DiD, generalized SC (interactive FE).
- **Selection-on-observables** — matching / PSM, IPW, AIPW, DML, TMLE,
  g-computation.
- **Identification / partial ID** — front-door, proximal, Manski bounds.
- **Distributional / mechanism** — quantile treatment effects, causal mediation
  (natural direct/indirect effects).
- **Regression families** — OLS, Poisson, logit, probit, panel fixed effects.

References resolve for 22 of the 34 today; the rest still render the formula and
inference and fall back to the provenance line. New citations are added only
through the §10-verified `paper.bib` single source — never from memory.

---

## 5. Inside `sp.paper()`

The appendix is wired into the auto-drafting pipeline. Every draft gets a
**Methods and Formulas** section (between the optional DAG appendix and the
References) built from the fitted result:

```python
draft = sp.paper(df, "effect of trained on wage")
assert "Methods and Formulas" in draft.sections
```

It is on by default and degrades gracefully (a failure is recorded as a
pipeline degradation, never a crash). Turn it off with `include_methods=False`:

```python
draft = sp.paper(df, "...", include_methods=False)
```

The section is stored as Markdown and converted by each renderer
(`to_markdown` / `to_qmd` render the display math natively).

---

## 6. Agent-native

Like every public symbol, it is introspectable:

```python
sp.describe_function("methods_appendix")
sp.function_schema("methods_appendix")
```

An agent that has a `result_id` can therefore emit a referee-grade methods
appendix — estimand, estimator, inference, citation, and the exact code
path — without ferrying any betas or sigmas by hand.
