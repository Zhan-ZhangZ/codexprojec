Do not write this up yet — the 6.2 is an artifact.

`PanelOLS(...).fit()` with no arguments returns **unadjusted** (homoskedastic)
standard errors. The Python run never clustered anything, so it is not the same
specification as your coauthor's at all. A t-statistic near 6 on a firm-year
panel should be a red flag that prompts a check of the variance estimator rather
than a finding: outcomes are serially correlated within firm, and ignoring that
inflates precision dramatically (Bertrand, Duflo and Mullainathan 2004).

    res = PanelOLS.from_formula(
        "log_y ~ treat + x1 + x2 + EntityEffects + TimeEffects", data=panel
    ).fit(cov_type="clustered", cluster_entity=True)

Your coauthor's t = 1.8 is the credible number and the one to report. Any small
residual difference after clustering is the finite-sample correction the two
implementations apply by default; also check how many firms there are, because
cluster asymptotics need a decent number of them.
