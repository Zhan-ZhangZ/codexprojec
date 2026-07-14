* tests/stata_parity/42_nbreg.do
*
* Module 42: Negative binomial regression (mean dispersion / NB2).
*   StatsPAI:  sp.nbreg
*   R:         MASS::glm.nb
*   Stata:     nbreg y x1 x2

version 18
clear all
do _common.do
stata_parity_init, module(42_nbreg)
stata_parity_open, module(42_nbreg)

import delimited "${STATA_PARITY_DATA}/42_nbreg.csv", clear case(preserve)
local n = _N

nbreg y x1 x2

local b0 = _b[_cons]
local se0 = _se[_cons]
local b1 = _b[x1]
local se1 = _se[x1]
local b2 = _b[x2]
local se2 = _se[x2]

stata_parity_row, stat(beta_intercept) est(`b0') std(`se0') nob(`n')
stata_parity_row, stat(beta_x1)        est(`b1') std(`se1') nob(`n')
stata_parity_row, stat(beta_x2)        est(`b2') std(`se2') nob(`n')

stata_parity_extra, key(dispersion) val("mean (NB2)")
stata_parity_extra, key(stata_command) val("nbreg y x1 x2")

stata_parity_close, module(42_nbreg)
