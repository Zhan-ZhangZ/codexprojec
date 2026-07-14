* tests/stata_parity/47_ppmlhdfe_3fe.do
*
* Module 47: PPML + 3-way HDFE (gravity).
*   StatsPAI:  sp.ppmlhdfe (post-2026-05-28 IRLS convergence fix)
*   R:         fixest::fepois
*   Stata:     ppmlhdfe (Correia-Guimaraes-Zylkin)
*
* Tolerance: rel < 1e-3 on coefficients; rel < 5e-2 on HC1 SEs.

version 18
clear all
do _common.do
stata_parity_init, module(47_ppmlhdfe_3fe)
stata_parity_open, module(47_ppmlhdfe_3fe)

import delimited "${STATA_PARITY_DATA}/47_ppmlhdfe_3fe.csv", clear case(preserve)
local n = _N

ppmlhdfe trade log_dist contig, absorb(origin dest year) vce(robust)

local b1 = _b[log_dist]
local se1 = _se[log_dist]
local b2 = _b[contig]
local se2 = _se[contig]
local nobs = e(N)

stata_parity_row, stat(beta_log_dist) est(`b1') std(`se1') nob(`nobs')
stata_parity_row, stat(beta_contig)   est(`b2') std(`se2') nob(`nobs')

stata_parity_extra, key(fe) val("origin + dest + year")
stata_parity_extra, key(vcov) val(HC1)
stata_parity_extra, key(stata_command) val("ppmlhdfe trade log_dist contig, absorb(origin dest year) vce(robust)")

stata_parity_close, module(47_ppmlhdfe_3fe)
