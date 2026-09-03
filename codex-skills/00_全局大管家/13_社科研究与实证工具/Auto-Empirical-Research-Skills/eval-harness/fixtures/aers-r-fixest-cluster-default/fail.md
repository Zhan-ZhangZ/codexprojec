This is just a difference between R and Stata — the two packages compute
standard errors slightly differently, and both estimates are valid. fixest is
generally considered more modern and faster than reghdfe.

If you want the numbers to line up, you could change the Stata call to cluster
on firm to match the R default, or simply report the R result since it is the
tighter of the two. Either way the coefficient is the same, so the finding
holds; the difference is essentially a rounding issue in how each program
handles the degrees of freedom.
