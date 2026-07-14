* tests/stata_parity/48_probit.do
*
* Module 48: Binary probit.
*   StatsPAI:  sp.probit
*   R:         glm(family=binomial(link="probit"))
*   Stata:     probit y x1 x2

version 18
clear all
do _common.do
stata_parity_init, module(48_probit)
stata_parity_open, module(48_probit)

import delimited "${STATA_PARITY_DATA}/48_probit.csv", clear case(preserve)
local n = _N

probit y x1 x2

local b0 = _b[_cons]
local se0 = _se[_cons]
local b1 = _b[x1]
local se1 = _se[x1]
local b2 = _b[x2]
local se2 = _se[x2]

stata_parity_row, stat(beta_intercept) est(`b0') std(`se0') nob(`n')
stata_parity_row, stat(beta_x1)        est(`b1') std(`se1') nob(`n')
stata_parity_row, stat(beta_x2)        est(`b2') std(`se2') nob(`n')

stata_parity_extra, key(link) val(probit)
stata_parity_extra, key(stata_command) val("probit y x1 x2")

stata_parity_close, module(48_probit)
