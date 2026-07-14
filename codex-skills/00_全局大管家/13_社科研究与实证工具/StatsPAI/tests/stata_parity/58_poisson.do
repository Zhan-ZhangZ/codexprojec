* tests/stata_parity/58_poisson.do
*
* Module 58: Plain Poisson regression (no FE).
*   StatsPAI:  sp.poisson
*   R:         glm(family=poisson())
*   Stata:     poisson y x1 x2

version 18
clear all
do _common.do
stata_parity_init, module(58_poisson)
stata_parity_open, module(58_poisson)

import delimited "${STATA_PARITY_DATA}/58_poisson.csv", clear case(preserve)
local n = _N

poisson y x1 x2

local b0 = _b[_cons]
local se0 = _se[_cons]
local b1 = _b[x1]
local se1 = _se[x1]
local b2 = _b[x2]
local se2 = _se[x2]

stata_parity_row, stat(beta_intercept) est(`b0') std(`se0') nob(`n')
stata_parity_row, stat(beta_x1)        est(`b1') std(`se1') nob(`n')
stata_parity_row, stat(beta_x2)        est(`b2') std(`se2') nob(`n')

stata_parity_extra, key(family) val(poisson)
stata_parity_extra, key(stata_command) val("poisson y x1 x2")

stata_parity_close, module(58_poisson)
