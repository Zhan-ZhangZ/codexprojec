* tests/stata_parity/33_var.do
*
* Module 33: VAR.
*   StatsPAI:  sp.var(variables=["y1","y2"], lags=2)
*   R:         vars::VAR(p=2, type="const")
*   Stata:     var y1 y2, lags(1/2)
*
* Tolerance: rel < 1e-3 on each coefficient (closed-form OLS-by-equation).
*
* Naming convention mapping (sp <-> Stata):
*   sp eq_y1__L1.y1  <-> Stata [y1]_b[L.y1]
*   sp eq_y1__L2.y1  <-> Stata [y1]_b[L2.y1]
*   sp eq_y1__L1.y2  <-> Stata [y1]_b[L.y2]
*   sp eq_y1__L2.y2  <-> Stata [y1]_b[L2.y2]
*   sp eq_y1___cons  <-> Stata [y1]_b[_cons]

version 18
clear all

do _common.do
stata_parity_init, module(33_var)
stata_parity_open, module(33_var)

import delimited "${STATA_PARITY_DATA}/33_var.csv", clear case(preserve)

gen t = _n
tsset t

* Stata's `var` uses Gaussian conditional MLE by default; the
* coefficient point estimates equal equation-by-equation OLS so they
* match vars::VAR (which calls lm()) at machine precision.
var y1 y2, lags(1/2)

local n_obs = e(N)

* Loop over equations and lag/const terms; emit sp-style stat names.
foreach eq in y1 y2 {
    foreach src in "L.y1" "L2.y1" "L.y2" "L2.y2" "_cons" {
        if "`src'" == "L.y1"  local sp_name "L1.y1"
        else if "`src'" == "L2.y1" local sp_name "L2.y1"
        else if "`src'" == "L.y2"  local sp_name "L1.y2"
        else if "`src'" == "L2.y2" local sp_name "L2.y2"
        else if "`src'" == "_cons" local sp_name "_cons"

        local b  = _b[`eq':`src']
        local se = _se[`eq':`src']

        stata_parity_row, stat(eq_`eq'__`sp_name') est(`b') std(`se') nob(`n_obs')
    }
}

* Log-likelihood
local ll = e(ll)
stata_parity_row, stat(logLik) est(`ll') nob(`n_obs')

stata_parity_extra, key(lags) val(2)
stata_parity_extra, key(type) val(const)
stata_parity_extra, key(stata_command) val("var y1 y2, lags(1/2)")

stata_parity_close, module(33_var)
