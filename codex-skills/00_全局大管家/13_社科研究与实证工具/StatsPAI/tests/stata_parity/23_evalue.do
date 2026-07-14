* tests/stata_parity/23_evalue.do
*
* Module 23: E-value (closed-form VanderWeele & Ding 2017).
*   StatsPAI:  sp.evalue
*   R:         EValue::evalues.RR
*   Stata:     evalue (SSC, Linden et al.)
*
* No CSV needed -- three canonical RR triples are hard-coded to
* match tests/r_parity/23_evalue.{py,R}:
*   moderate:   (2.5, 1.8, 3.2)
*   strong:     (4.0, 2.5, 6.0)
*   borderline: (1.3, 1.0, 1.6)
*
* Tolerance: rel < 1e-6 (closed-form).

version 18
clear all

do _common.do
stata_parity_init, module(23_evalue)
stata_parity_open, module(23_evalue)

* --- Moderate: RR=2.5, CI (1.8, 3.2) ---
evalue rr 2.5, lcl(1.8) ucl(3.2)
local ev_est_m = r(eval_est)
local ev_ci_m  = r(eval_ci)

* --- Strong: RR=4.0, CI (2.5, 6.0) ---
evalue rr 4.0, lcl(2.5) ucl(6.0)
local ev_est_s = r(eval_est)
local ev_ci_s  = r(eval_ci)

* --- Borderline: RR=1.3, CI (1.0, 1.6) ---
evalue rr 1.3, lcl(1.0) ucl(1.6)
local ev_est_b = r(eval_est)
local ev_ci_b  = r(eval_ci)

stata_parity_row, stat(evalue_est_moderate)   est(`ev_est_m') nob(1)
stata_parity_row, stat(evalue_ci_moderate)    est(`ev_ci_m')  nob(1)
stata_parity_row, stat(evalue_est_strong)     est(`ev_est_s') nob(1)
stata_parity_row, stat(evalue_ci_strong)      est(`ev_ci_s')  nob(1)
stata_parity_row, stat(evalue_est_borderline) est(`ev_est_b') nob(1)
stata_parity_row, stat(evalue_ci_borderline)  est(`ev_ci_b')  nob(1)

stata_parity_extra, key(measure) val(RR)
stata_parity_extra, key(stata_command) val("evalue rr <est>, lcl(<lo>) ucl(<hi>)")
stata_parity_extra, key(formula) val("E = RR + sqrt(RR*(RR-1)) for RR>=1")

stata_parity_close, module(23_evalue)
