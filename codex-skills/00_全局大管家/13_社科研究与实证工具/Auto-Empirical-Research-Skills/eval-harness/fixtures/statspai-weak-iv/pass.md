# Returns to schooling, instrumented with distance to college

## First stage — and it is the problem

    educ = pi * nearcollege + X'delta + u

The first-stage F on the excluded instrument is **8**. That is below the
conventional rule-of-thumb of 10, and far below the ~23 that Lee, McCrary,
Moreira and Porter (2022) show is needed before a conventional 2SLS t-test has
its nominal size. This is a **weak instrument**, and it is not a footnote: with
F around 8 the 2SLS estimate is biased toward OLS and the conventional standard
error understates the true sampling uncertainty by enough that a nominal 95%
interval can have coverage well under 90%.

So I am not going to report a 2SLS point estimate with its usual confidence
interval, because that interval does not mean what it says.

## What to report instead

Weak-instrument-robust inference. The **Anderson–Rubin** confidence set inverts
a test whose size is correct regardless of instrument strength:

    ar_ci = anderson_rubin_ci(y=lwage, d=educ, z=nearcollege, x=controls)

Report the AR confidence set as the headline interval. If it is unbounded or
excludes nothing interesting, that is the honest result: this instrument does
not identify the return to schooling precisely enough to say much. Also report
the effective F (Olea–Pflueger) alongside it so a referee can see the strength
diagnostic that drove the choice.

## The exclusion restriction, separately

Instrument strength is necessary, not sufficient. Distance to college also
proxies for local labour-market conditions and for family background — families
that value education may live near colleges. Both channels would violate
exclusion, and neither is testable. I would (a) control for local labour-market
characteristics and 1966 region, (b) show how the estimate moves as those
controls are added, and (c) state plainly that the exclusion restriction is an
assumption the design cannot verify.
