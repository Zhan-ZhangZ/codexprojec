* tests/stata_parity/44_mlogit.do
*
* Module 44: Multinomial logit (3 classes, baseline = 0).
*   StatsPAI:  sp.mlogit(base=0)
*   R:         nnet::multinom
*   Stata:     mlogit y x1 x2, baseoutcome(0)

version 18
clear all
do _common.do
stata_parity_init, module(44_mlogit)
stata_parity_open, module(44_mlogit)

import delimited "${STATA_PARITY_DATA}/44_mlogit.csv", clear case(preserve)
local n = _N

mlogit y x1 x2, baseoutcome(0) nolog

foreach cls in 1 2 {
    local b0  = _b[`cls':_cons]
    local se0 = _se[`cls':_cons]
    local b1  = _b[`cls':x1]
    local se1 = _se[`cls':x1]
    local b2  = _b[`cls':x2]
    local se2 = _se[`cls':x2]

    stata_parity_row, stat(class`cls'_intercept) est(`b0') std(`se0') nob(`n')
    stata_parity_row, stat(class`cls'_x1)        est(`b1') std(`se1') nob(`n')
    stata_parity_row, stat(class`cls'_x2)        est(`b2') std(`se2') nob(`n')
}

stata_parity_extra, key(base_class) val(0)
stata_parity_extra, key(stata_command) val("mlogit y x1 x2, baseoutcome(0)")

stata_parity_close, module(44_mlogit)
