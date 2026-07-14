* tests/stata_parity/37_ppmlhdfe.do
*
* Module 37: Pseudo-Poisson Maximum Likelihood with HDFE.
*   StatsPAI:  sp.ppmlhdfe
*   R:         fixest::fepois
*   Stata:     ppmlhdfe (Correia-Guimaraes-Zylkin)
*
* Tolerance: rel < 1e-3 on coefficients; rel < 1e-2 on HC1 SEs.

version 18
clear all

do _common.do
stata_parity_init, module(37_ppmlhdfe)
stata_parity_open, module(37_ppmlhdfe)

import delimited "${STATA_PARITY_DATA}/37_ppmlhdfe.csv", clear case(preserve)

local n = _N

ppmlhdfe y x1 x2, absorb(origin) vce(robust)

local b1  = _b[x1]
local se1 = _se[x1]
local b2  = _b[x2]
local se2 = _se[x2]
local nobs = e(N)

stata_parity_row, stat(beta_x1) est(`b1') std(`se1') nob(`nobs')
stata_parity_row, stat(beta_x2) est(`b2') std(`se2') nob(`nobs')

stata_parity_extra, key(fe) val(origin)
stata_parity_extra, key(vcov) val(HC1)
stata_parity_extra, key(stata_command) val("ppmlhdfe y x1 x2, absorb(origin) vce(robust)")

stata_parity_close, module(37_ppmlhdfe)
