Your coauthor is right, and the reason is a default you did not choose.

`fixest::feols` clusters on the **first fixed effect** by default. Your formula
puts `firm_id` first, so R silently clustered on firm — a level your design
never asked for. Stata's `reghdfe` clusters only where you tell it to, and your
coauthor told it `state`.

The policy varies at the state level, so state is the correct cluster: that is
where the correlated shocks and the treatment variation live. The cluster level
is a property of the design, not of the software. Set it explicitly rather than
relying on any default:

    feols(log_wage ~ treat + x1 + x2 | firm_id + year, data = d, cluster = ~state)

A small gap will usually remain even after that, because fixest and Stata apply
different small-sample corrections by default. Match them with the `ssc()`
argument (`ssc(adj = TRUE, cluster.adj = TRUE)`) if you need the numbers to
agree to the last digit.

One follow-up: how many states are there? If it is fewer than about 30, the
corrected cluster SE is still unreliable and you want `fwildclusterboot` or a
CR2 estimator from `clubSandwich`.
