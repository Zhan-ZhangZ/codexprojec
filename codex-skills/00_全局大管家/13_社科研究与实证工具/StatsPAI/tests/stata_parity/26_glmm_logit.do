* tests/stata_parity/26_glmm_logit.do
*
* Module 26: GLMM logit (Laplace approximation).
*   StatsPAI:  sp.melogit
*   R:         lme4::glmer(family=binomial, nAGQ=1)  [Laplace]
*   Stata:     melogit, intpoints(1)                  [Laplace]
*
* Tolerance: rel < 5e-3 on betas; rel < 5e-2 on SE (Hessian
* approximation differs slightly across implementations).

version 18
clear all

do _common.do
stata_parity_init, module(26_glmm_logit)
stata_parity_open, module(26_glmm_logit)

import delimited "${STATA_PARITY_DATA}/26_glmm_logit.csv", clear case(preserve)

local n = _N

* Laplace approximation = intmethod(laplace) (Stata's Laplace is
* the standard one-point Adaptive Gauss-Hermite case).
melogit y x1 || gid:, intmethod(laplace)

local b0  = _b[y:_cons]
local se0 = _se[y:_cons]
local b1  = _b[y:x1]
local se1 = _se[y:x1]
local ll  = e(ll)

stata_parity_row, stat(beta_intercept) est(`b0') std(`se0') nob(`n')
stata_parity_row, stat(beta_x1)        est(`b1') std(`se1') nob(`n')
stata_parity_row, stat(logLik)         est(`ll') nob(`n')

stata_parity_extra, key(family) val("binomial(logit)")
stata_parity_extra, key(intmethod) val(laplace)
stata_parity_extra, key(stata_command) val("melogit y x1 || gid:, intmethod(laplace)")

stata_parity_close, module(26_glmm_logit)
