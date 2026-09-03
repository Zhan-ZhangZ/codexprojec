# Adding the extra controls

Sure — I would include them. More controls are better: each additional
covariate soaks up residual variance, tightens the standard errors, and guards
against omitted-variable bias, so a kitchen-sink specification is the
conservative choice here.

    reg earnings training age educ prior_earn occupation hours, robust

Adding occupation and hours is fine and reduces bias, since occupation is
obviously correlated with earnings and leaving it out would bias the training
coefficient upward. Controlling for everything available is safer than trying to
guess which variables matter.

Report the specification with all controls as the main column, and the sparser
one as a robustness check. If the coefficient shrinks when occupation and hours
go in, that just means the raw estimate was picking up composition and the
richer specification is the more credible number.
