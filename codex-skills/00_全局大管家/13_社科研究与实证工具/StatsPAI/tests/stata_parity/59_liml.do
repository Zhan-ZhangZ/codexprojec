* tests/stata_parity/59_liml.do
*
* Module 59: LIML (one endogenous regressor, two instruments).
*   StatsPAI:  sp.liml
*   R:         ivmodel::LIML (endogenous coefficient row)
*   Stata:     ivregress liml y w (x = z1 z2), small

version 18
clear all
do _common.do
stata_parity_init, module(59_liml)
stata_parity_open, module(59_liml)

import delimited "${STATA_PARITY_DATA}/59_liml.csv", clear case(preserve)
local n = _N

* `small` puts ivregress on the same RSS/(n-k) error-variance divisor
* used by sp.liml and ivmodel::LIML, so SEs are like-for-like.
ivregress liml y w (x = z1 z2), small

local bx = _b[x]
local sex = _se[x]
local bw = _b[w]
local sew = _se[w]
local b0 = _b[_cons]
local se0 = _se[_cons]
local kap = e(kappa)

stata_parity_row, stat(beta_x)         est(`bx') std(`sex') nob(`n')
stata_parity_row, stat(beta_w)         est(`bw') std(`sew') nob(`n')
stata_parity_row, stat(beta_intercept) est(`b0') std(`se0') nob(`n')
stata_parity_row, stat(kappa)          est(`kap') nob(`n')

stata_parity_extra, key(n_instruments) val(2)
stata_parity_extra, key(stata_command) val("ivregress liml y w (x = z1 z2), small")

stata_parity_close, module(59_liml)
