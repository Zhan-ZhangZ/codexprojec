* tests/stata_parity/41_tobit.do
*
* Module 41: Tobit (left-censored at 0).
*   StatsPAI:  sp.tobit(ll=0)
*   R:         censReg::censReg(left=0)
*   Stata:     tobit y x, ll(0)
*
* Tolerance: rel < 1e-3 on coefficients; rel < 1e-2 on SEs.

version 18
clear all

do _common.do
stata_parity_init, module(41_tobit)
stata_parity_open, module(41_tobit)

import delimited "${STATA_PARITY_DATA}/41_tobit.csv", clear case(preserve)

local n = _N

tobit y x, ll(0)

local b0  = _b[_cons]
local se0 = _se[_cons]
local b1  = _b[x]
local se1 = _se[x]
* Stata 18 reports the auxiliary parameter as var(e.y); the
* `e(b)` vector has it under the equation name "var(e.y):_cons".
* sigma = sqrt(var); SE via delta: se_sigma = se_var / (2 * sigma).
matrix b = e(b)
matrix V = e(V)
local k = colsof(b)
local var_y    = b[1, `k']
local var_y_se = sqrt(V[`k', `k'])
local sigma    = sqrt(`var_y')
local sigma_se = `var_y_se' / (2 * `sigma')

stata_parity_row, stat(beta_intercept) est(`b0') std(`se0') nob(`n')
stata_parity_row, stat(beta_x)         est(`b1') std(`se1') nob(`n')
stata_parity_row, stat(sigma)          est(`sigma') std(`sigma_se') nob(`n')

stata_parity_extra, key(left_censor) val(0)
stata_parity_extra, key(stata_command) val("tobit y x, ll(0)")

stata_parity_close, module(41_tobit)
