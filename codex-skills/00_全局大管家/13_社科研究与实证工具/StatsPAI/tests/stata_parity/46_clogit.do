* tests/stata_parity/46_clogit.do
*
* Module 46: Conditional logit (McFadden / stratified Cox).
*   StatsPAI:  sp.clogit(group=)
*   R:         survival::clogit(choice ~ x + strata(group))
*   Stata:     clogit choice x, group(group)

version 18
clear all
do _common.do
stata_parity_init, module(46_clogit)
stata_parity_open, module(46_clogit)

import delimited "${STATA_PARITY_DATA}/46_clogit.csv", clear case(preserve)
local n = _N

clogit choice x, group(group)

local bx  = _b[x]
local sex = _se[x]

stata_parity_row, stat(beta_x) est(`bx') std(`sex') nob(`n')

stata_parity_extra, key(group_var) val(group)
stata_parity_extra, key(stata_command) val("clogit choice x, group(group)")

stata_parity_close, module(46_clogit)
