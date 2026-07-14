* tests/stata_parity/49_oprobit.do
* Module 49: Ordered probit.
*   StatsPAI: sp.oprobit
*   R:        MASS::polr(method="probit")
*   Stata:    oprobit y x

version 18
clear all
do _common.do
stata_parity_init, module(49_oprobit)
stata_parity_open, module(49_oprobit)

import delimited "${STATA_PARITY_DATA}/49_oprobit.csv", clear case(preserve)
local n = _N

oprobit y x

local bx = _b[x]
local sex = _se[x]
local cut1 = _b[/cut1]
local secut1 = _se[/cut1]
local cut2 = _b[/cut2]
local secut2 = _se[/cut2]

stata_parity_row, stat(beta_x)    est(`bx')   std(`sex')    nob(`n')
stata_parity_row, stat(beta_cut1) est(`cut1') std(`secut1') nob(`n')
stata_parity_row, stat(beta_cut2) est(`cut2') std(`secut2') nob(`n')

stata_parity_extra, key(link) val(probit)
stata_parity_extra, key(stata_command) val("oprobit y x")

stata_parity_close, module(49_oprobit)
