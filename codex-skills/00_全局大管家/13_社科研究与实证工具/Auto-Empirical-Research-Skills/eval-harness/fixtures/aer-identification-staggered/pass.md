# Referee-facing identification section

## The estimator is the first objection

With staggered adoption, the TWFE coefficient is a variance-weighted average of
2x2 comparisons, and some of those comparisons use **already-treated** units as
controls for later-treated ones. Goodman-Bacon (2021) makes this explicit. Under
treatment-effect heterogeneity — effects that grow or decay with exposure —
those forbidden comparisons carry **negative weights**, and the aggregate can
sit outside the range of every underlying effect. A referee will not accept a
single TWFE number here, and they should not.

Report a **Goodman-Bacon decomposition** so the share of weight coming from
already-treated comparisons is on the page rather than assumed away.

## What to run

A heterogeneity-robust estimator as the headline: **Callaway and Sant'Anna**
group-time ATT(g,t), aggregated by exposure, with never-treated units as the
comparison group. Sun and Abraham interaction-weighted estimates and the
Borusyak-Jaravel-Spiess imputation estimator go in the robustness table; three
estimators agreeing is the argument, one estimator asserting is not.

## Parallel trends is an assumption, not a finding

Show the **event study**: leads and lags around adoption, with a formal joint
test on the pre-period coefficients rather than an eyeball of the figure. A flat
pre-trend does not prove parallel trends — it fails to reject it, and with wide
pre-period standard errors that is a weak statement.

Add **HonestDiD** (Rambachan and Roth) sensitivity: report the breakdown value
of post-treatment violation, relative to the largest pre-period violation, at
which the result loses significance. If that breakdown is small, say so.
