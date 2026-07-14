* tests/stata_parity/24_coxph.do
*
* Module 24: Cox proportional hazards.
*   StatsPAI:  sp.survival.cox
*   R:         survival::coxph(... , ties="efron")
*   Stata:     stcox (built-in, Efron is the default tie handler)
*
* Tolerance: rel < 1e-3.

version 18
clear all

do _common.do
stata_parity_init, module(24_coxph)
stata_parity_open, module(24_coxph)

import delimited "${STATA_PARITY_DATA}/24_coxph.csv", clear case(preserve)

stset time, failure(event==1)

* stcox defaults to Efron's method for ties -- matches survival::coxph.
stcox x1 x2, nohr

local n = e(N)
matrix b = e(b)
matrix V = e(V)
local b1  = b[1, 1]
local b2  = b[1, 2]
local se1 = sqrt(V[1, 1])
local se2 = sqrt(V[2, 2])

local z = ${STATA_PARITY_Z95}
local lo1 = `b1' - `z' * `se1'
local hi1 = `b1' + `z' * `se1'
local lo2 = `b2' - `z' * `se2'
local hi2 = `b2' + `z' * `se2'

stata_parity_row, stat(beta_x1) est(`b1') std(`se1') cil(`lo1') cih(`hi1') nob(`n')
stata_parity_row, stat(beta_x2) est(`b2') std(`se2') cil(`lo2') cih(`hi2') nob(`n')

* Concordance via estat concordance (Harrell's C).
estat concordance
local c_index = r(C)
stata_parity_row, stat(concordance) est(`c_index') nob(`n')

stata_parity_extra, key(ties) val(efron)
stata_parity_extra, key(stata_command) val("stcox x1 x2, nohr (Efron default)")

stata_parity_close, module(24_coxph)
