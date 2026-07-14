# RFC: sandwich / cluster-robust SE consolidation (F1)

**Status:** primitive landed (`core/_vcov.py`), migration pending a
parity-quiet window.
**Author:** correctness/perf pass, 2026-05-29.

## Problem

~18 estimators reimplement the cluster-robust / HC sandwich
`V = c · (X'X)⁻¹ B (X'X)⁻¹` on top of the canonical meat kernels
(`core/_numba_kernels.cluster_meat` / `sandwich_hc`). This violates CLAUDE.md
§4 (one implementation of correctness-sensitive basics) and is 18 places for a
bug to diverge.

## Why it is NOT a drop-in dedup

The copies use **deliberately different finite-sample corrections**, matched to
different reference implementations. Verified examples:

| Site | Correction factor `c` | Matches |
|---|---|---|
| `inference/twoway_cluster._cluster_robust_variance` | `(G/(G-1))·((N-1)/(N-K))` | Stata `vce(cluster)` / statsmodels |
| `did/stacked_did._cluster_robust_vcov` | `(G/(G-1))·(N/(N-K))` | stacked-DiD convention |

Force-merging onto one factor would **change numerical output and break
parity** — the exact thing the parity suite verifies. So this is a
code-dedup that must preserve each site's numbers byte-for-byte.

## Landed: the primitive

`core/_vcov.py` (with `tests/test_core_vcov.py`, validated vs statsmodels):

```python
cluster_robust_vcov(X, resid, clusters, *, correction='stata',
                    dof_adjust=None, XtX_inv=None)
hc_vcov(X, resid, *, hc_type='hc1', XtX_inv=None)
```

`correction ∈ {'none','cgm','stata'/'liang_zeger','stacked'}`; `dof_adjust`
takes an explicit float for any non-standard site. The correction is now an
**explicit, documented parameter** instead of a scattered magic factor.

## Migration procedure (one estimator per commit, parity-quiet window)

1. Survey the call site: read its exact factor `c` and meat construction.
2. Map `c` to a named `correction=` (or pass the exact `dof_adjust=` float).
3. Replace the hand-rolled `(X'X)⁻¹ B (X'X)⁻¹ · c` with
   `cluster_robust_vcov(..., correction=...)` / `hc_vcov(...)`.
4. **Run that estimator's parity + unit tests; assert numbers are unchanged**
   before moving to the next site. If a site's factor is not expressible, add a
   named correction to `_vcov.py` (with a test) rather than inlining.

## Candidate sites (from the audit; verify each before migrating)

`did/stacked_did`, `inference/{twoway_cluster,multiway_cluster}`,
`panel/hdfe`, `regression/{zeroinflated,multinomial,count}`, `spatial/did`,
`rd/_core`, `survival/models`, `causal_text/llm_annotator` (`_ols_hc1`), …

## Why now is not the time

The parity agent is actively re-verifying numbers. A mid-migration
intermediate state would collide with that. Do this in a window where parity
is quiescent, one estimator at a time, each parity-verified.
