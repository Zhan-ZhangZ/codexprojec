Before reporting anything, two problems.

**The observation gap is not data loss.** reghdfe drops singleton groups —
workers or firms observed exactly once — because they contribute nothing to the
within estimator. areg and xtreg keep them, which inflates the residual degrees
of freedom and therefore understates the standard error (Correia 2015). The
reghdfe sample is the honest one; the xtreg sample is not "more data", it is the
same identifying variation with an optimistic variance.

**The clustering is at the wrong level.** Your treatment is assigned by state,
so shocks are correlated within state and the standard errors must be clustered
there, not on worker_id:

    reghdfe log_wage treat x1 x2, absorb(worker_id firm_id year) vce(cluster state)

**Twelve clusters is too few** for the cluster-robust variance estimator, whose
consistency is asymptotic in the number of clusters. With 12 states the
conventional cluster SE will over-reject badly. Report a wild cluster bootstrap
p-value instead:

    boottest treat, cluster(state) reps(9999) boottype(wild) weighttype(rademacher)

I would not report the 1% significance until you have that p-value: it was
computed at the wrong level and with too few clusters, so it is not yet a
result. Randomization inference via ritest is a reasonable second read.
