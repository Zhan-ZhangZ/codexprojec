* tests/stata_parity/60_sureg.do
*
* Module 60: Seemingly unrelated regressions (two equations).
*   StatsPAI:  sp.sureg(method='fgls')  (one-step FGLS, Sigma divisor n)
*   R:         systemfit(method='SUR', methodResidCov='noDfCor', maxiter=1)
*   Stata:     sureg (y1 x1 w) (y2 x2 w)   [default: one-step, divisor n]

version 18
clear all
do _common.do
stata_parity_init, module(60_sureg)
stata_parity_open, module(60_sureg)

import delimited "${STATA_PARITY_DATA}/60_sureg.csv", clear case(preserve)
local n = _N

sureg (y1 x1 w) (y2 x2 w)

local b10 = [y1]_b[_cons]
local s10 = [y1]_se[_cons]
local b11 = [y1]_b[x1]
local s11 = [y1]_se[x1]
local b1w = [y1]_b[w]
local s1w = [y1]_se[w]
local b20 = [y2]_b[_cons]
local s20 = [y2]_se[_cons]
local b22 = [y2]_b[x2]
local s22 = [y2]_se[x2]
local b2w = [y2]_b[w]
local s2w = [y2]_se[w]

stata_parity_row, stat(beta_eq1_intercept) est(`b10') std(`s10') nob(`n')
stata_parity_row, stat(beta_eq1_x1)        est(`b11') std(`s11') nob(`n')
stata_parity_row, stat(beta_eq1_w)         est(`b1w') std(`s1w') nob(`n')
stata_parity_row, stat(beta_eq2_intercept) est(`b20') std(`s20') nob(`n')
stata_parity_row, stat(beta_eq2_x2)        est(`b22') std(`s22') nob(`n')
stata_parity_row, stat(beta_eq2_w)         est(`b2w') std(`s2w') nob(`n')

stata_parity_extra, key(method) val("one-step FGLS")
stata_parity_extra, key(stata_command) val("sureg (y1 x1 w) (y2 x2 w)")

stata_parity_close, module(60_sureg)
