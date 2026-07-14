* tests/stata_parity/45_ologit.do
*
* Module 45: Ordered logit.
*   StatsPAI:  sp.ologit
*   R:         MASS::polr(method="logistic")
*   Stata:     ologit y x

version 18
clear all
do _common.do
stata_parity_init, module(45_ologit)
stata_parity_open, module(45_ologit)

import delimited "${STATA_PARITY_DATA}/45_ologit.csv", clear case(preserve)
local n = _N

ologit y x

local bx  = _b[x]
local sex = _se[x]
local cut1  = _b[/cut1]
local secut1 = _se[/cut1]
local cut2  = _b[/cut2]
local secut2 = _se[/cut2]

stata_parity_row, stat(beta_x)    est(`bx')   std(`sex')   nob(`n')
stata_parity_row, stat(beta_cut1) est(`cut1') std(`secut1') nob(`n')
stata_parity_row, stat(beta_cut2) est(`cut2') std(`secut2') nob(`n')

stata_parity_extra, key(stata_command) val("ologit y x")

stata_parity_close, module(45_ologit)
