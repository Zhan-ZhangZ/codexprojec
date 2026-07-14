# Parity expansion + fix-and-extend session — 2026-05-28

> Two-pass session: first built out the parity matrix, then went back
> and fixed all P0/P1 findings the parity work surfaced. Everything is
> reproducible via the per-module scripts in `tests/r_parity/` and
> `tests/stata_parity/`; the consolidated table is
> `tests/r_parity/results/parity_table_3way.md`.

## Headline numbers

| | Start of day | End of day | Δ |
|---|---|---|---|
| Total modules in 3-way table   | 36 | **51** | +15 |
| Modules with Stata sibling     | 21 | **44** | +23 |
| Correctness findings logged    | 0  | **13** | +13 |
| **P0 SE bugs fixed in-session** | 0  | **3**  | +3 |
| **P1 SE bugs fixed in-session** | 0  | **4**  | +4 |
| Tests passing after fixes      | n/a | **272/272** in the touched suites | |

## P0 / P1 correctness fixes landed

| # | Finding                                                            | Fix |
|---|---|---|
| #8  | `sp.qreg` Powell sandwich SE off by √n                            | dropped extraneous `n` in [src/statspai/regression/quantile.py:270](src/statspai/regression/quantile.py#L270) |
| #13 | `sp.regress(robust="hac")` Newey-West SE off by √n                | dropped `/n` in [src/statspai/core/_numba_kernels.py:300](src/statspai/core/_numba_kernels.py#L300) |
| #6  | `sp.ppmlhdfe` HC1 SE 50 % inflated under HDFE                     | replaced OLS-style FE recovery with PPML FOC + Gauss-Seidel multi-FE update in [src/statspai/regression/count.py:587](src/statspai/regression/count.py#L587) |
| #5  | `sp.ppmlhdfe` non-convergence on 3-FE gravity DGP                 | **same fix as #6** (root cause was the wrong multi-FE update) |
| #2  | `sp.panel` Hausman χ² ~5× too large; flipped test conclusion       | use `sigma2_e` (FE idiosyncratic variance) for V_RE in [src/statspai/panel/panel_diagnostics.py:382](src/statspai/panel/panel_diagnostics.py#L382) |
| #9  | `sp.tobit` SE 13–30 % off (BFGS `hess_inv` was unreliable)        | numerical observed-info Hessian, new shared helper [src/statspai/regression/_optim_helpers.py](src/statspai/regression/_optim_helpers.py) |
| #10 | `sp.mlogit` SE 1–3 % inflated                                     | same fix as #9 ([src/statspai/regression/multinomial.py:277](src/statspai/regression/multinomial.py#L277)) |
| #11 | `sp.ologit` `beta_x` SE 26 % inflated                             | same fix as #9 ([src/statspai/regression/multinomial.py:636](src/statspai/regression/multinomial.py#L636)) |

**Pattern.** Three of the four P0 / P1 SE bugs were *the same kind of
arithmetic mistake* — an extra (or missing) factor of `n` or `1/n` in
the sandwich variance assembly. Once you know to look for it, future
SE-layer audits should grep for `/ n` or `* n` inside any `meat`/`bread`
computation and check the dimensional analysis against the textbook
sandwich V = (X'WX)⁻¹ S (X'WX)⁻¹ where S is the unnormalised score
outer product. The Tobit / ologit / mlogit cluster all stem from the
same root cause too: trusting `scipy.optimize.minimize(BFGS).hess_inv`
for inference. A shared numerical-Hessian helper drove all three to
machine-precision parity in a single PR.

## P2 contract / convention fixes landed

| # | Finding                                                                                | Fix |
|---|---|---|
| #1  | `sp.local_projections` silently re-lagged user `controls` + added undocumented `lag_y`     | added explicit `auto_lag` flag (default True for back-compat), made user controls verbatim, refreshed docstring in [src/statspai/timeseries/local_projections.py:108](src/statspai/timeseries/local_projections.py#L108) |
| #3  | `tests/r_parity/36_mediation.py` referenced renamed `model_info["n_boot"]` key           | pinned to `n_boot_requested` ([tests/r_parity/36_mediation.py:55](tests/r_parity/36_mediation.py#L55)) |
| #4  | `sp.xtfrontier` Pitt-Lee σ_u differs from Stata's `xtfrontier ti` σ_u (~40 %)            | added multi-start sweep, documented parity gap and σ_u convention in [src/statspai/frontier/panel.py:118](src/statspai/frontier/panel.py#L118) — the actual likelihood gap is left as a `review`-level finding |

## P2 / P3 findings still open

- **#7. `sp.arima`** does not expose a structured `std_errors` accessor on `ARIMAResult`. The parity test compares only point estimates and log-likelihood.
- **#12. `sp.xtabond`** vs Stata `xtabond`: 48 % gap on β_{y_{-1}}, 80 % gap on SE on a small AR(1) DGP. The point estimate gap is too large to be a one-step vs two-step convention issue; likely the instrument matrix or weighting is wrong inside [src/statspai/gmm/arellano_bond.py](src/statspai/gmm/arellano_bond.py). Needs a fresh dive.

## Net coverage change

- **Stata reference rises from 21/36 to 44/51.** The 7 modules still
  without a Stata reference are the genuinely-no-canonical-port cases:
  `08_dml` (no canonical Stata DML), `13_causal_forest` (no Stata GRF),
  `18_augsynth`, `19_gsynth` (no Stata SCM variants), `31_dfl`
  (no Stata DFL), `32_rif` (`rifhdreg` needs GitHub install), `38_drdid`
  (Stata's `drdid` is Ferman's different formula).
- 15 net-new parity modules: `37–51`.

## What was added (modules)

### Tier 1 — Stata siblings filled in for existing R-only parity modules

`23_evalue · 24_coxph · 26_glmm_logit · 27_glmm_aghq · 29_panel_sfa ·
33_var · 34_lp · 35_panel · 36_mediation` — 9 new `.do` files.

### Tier 2 — Net-new 3-way modules with all sides built fresh

`37_ppmlhdfe · 38_drdid (R-only) · 39_arima · 40_qreg · 41_tobit ·
42_nbreg · 43_heckman · 44_mlogit · 45_ologit · 46_clogit ·
47_ppmlhdfe_3fe · 48_probit · 49_oprobit · 50_xtabond (Py-Stata only) ·
51_newey` — 15 new triplets.

## Reproducibility

```bash
# Run every module added or touched this session
for n in 23_evalue 24_coxph 26_glmm_logit 27_glmm_aghq 29_panel_sfa \
         33_var 34_lp 35_panel 36_mediation \
         37_ppmlhdfe 38_drdid 39_arima 40_qreg 41_tobit \
         42_nbreg 43_heckman 44_mlogit 45_ologit 46_clogit \
         47_ppmlhdfe_3fe 48_probit 49_oprobit 50_xtabond 51_newey; do
  (cd tests/r_parity     && python3 ${n}.py  2>&1 | tail -1)
  (cd tests/r_parity     && Rscript  ${n}.R  2>&1 | tail -1)
  if [ -f tests/stata_parity/${n}.do ]; then
    (cd tests/stata_parity && /Applications/Stata/StataMP.app/Contents/MacOS/stata-mp -b -q do ${n}.do 2>&1 | tail -1)
  fi
done

# Refresh the consolidated 3-way table
(cd tests/r_parity && python3 compare.py)
```

Regression suites that exercise the changed code paths all still pass:

```text
tests/test_panel*.py / test_hausman.py / test_local_projections.py
tests/test_count_panel_nbreg.py / test_fast_fepois.py
tests/test_new_v06_modules.py / test_multilevel.py / test_translation.py
tests/test_quantile.py / test_weakiv_tobit.py / test_numba_kernels.py
  -> 272 passed, 6 skipped, 1 warning
```

## What this session did NOT do

- Did not commit (CLAUDE.md §9: direct-push to main is the norm, but
  the user asked me to work without committing). All changes sit in the
  working tree for review.
- Did not bump `__version__` / publish to PyPI.
- Did not extend `tests/r_parity/REFERENCES.md` with the new modules —
  the bib keys in each `.R` / `.py` are already there; a docstring
  pass for `REFERENCES.md` would be a clean follow-up.
- Did not chase finding #12 (xtabond) or finding #7 (arima SE
  accessor) — each is at least a half-day on its own.
- Did not implement boottest / cic / spatial parity (no usable R
  reference at this R version, and the spatial API requires a non-
  trivial weight-matrix harness — that's another session).

## Suggested follow-up commits (one PR per fix)

The fixes are independent and each is verifiable by re-running the
corresponding parity module:

1. `fix(qreg): drop extraneous n in Powell sandwich variance` (finding #8)
2. `fix(panel): use sigma2_e for V_RE in Hausman test`           (#2)
3. `fix(ppmlhdfe): PPML FE FOC + Gauss-Seidel multi-FE update`  (#5, #6)
4. `fix(tobit, ologit, mlogit): numerical observed-info Hessian` (#9, #10, #11)
5. `fix(hac): drop /n inside Newey-West kernel`                  (#13)
6. `fix(local_projections): verbatim user controls + auto_lag flag` (#1)
7. `docs(xtfrontier): pin σ_u parameterisation note + multi-start` (#4)
8. `chore(parity): refresh 36_mediation.py for n_boot schema rename` (#3)
9. `feat(arima): expose std_errors on ARIMAResult`               (#7, open)
10. `audit(xtabond): align Arellano-Bond instrument set with Stata` (#12, open)

Each commit is independently testable via the parity module that
surfaced the bug; the bug is gone iff the module's three sides match
at the documented tolerance.
