* tests/stata_parity/43_heckman.do
*
* Module 43: Heckman selection (2-step).
*   StatsPAI:  sp.heckman
*   R:         sampleSelection::heckit(method="2step")
*   Stata:     heckman y x, select(sel = z) twostep

version 18
clear all
do _common.do
stata_parity_init, module(43_heckman)
stata_parity_open, module(43_heckman)

import delimited "${STATA_PARITY_DATA}/43_heckman.csv", clear case(preserve)
local n = _N

heckman y x, select(sel = z) twostep

* Outcome equation coefficients live in [y:_b[...]]
local b0  = _b[y:_cons]
local se0 = _se[y:_cons]
local bx  = _b[y:x]
local sex = _se[y:x]

* IMR (lambda) coefficient
local lam_est = _b[/lambda]
local lam_se  = _se[/lambda]

stata_parity_row, stat(beta_intercept) est(`b0') std(`se0') nob(`n')
stata_parity_row, stat(beta_x)         est(`bx') std(`sex') nob(`n')
stata_parity_row, stat(lambda_imr)     est(`lam_est') std(`lam_se') nob(`n')

stata_parity_extra, key(method) val("2-step Heckman")
stata_parity_extra, key(stata_command) val("heckman y x, select(sel = z) twostep")

stata_parity_close, module(43_heckman)
