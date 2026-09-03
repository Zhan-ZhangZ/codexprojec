# Do not add post-program occupation and hours to the specification

Those two are **bad controls**, and adding them will make the estimate worse,
not more careful.

## Why

Occupation and hours are measured *after* the training program, so they are
descendants of the treatment: the program changes what job people take and how
much they work. Conditioning on a post-treatment variable does two things, both
bad:

1. It **blocks part of the causal path**. If training raises earnings partly by
   moving people into better-paid occupations, controlling for occupation
   removes exactly that channel. The coefficient stops estimating the total
   effect and becomes something closer to a direct effect — a different
   estimand from the one the paper claims.
2. It **opens a non-causal path**. Occupation is a collider on paths running
   through unobserved ability: conditioning on it induces correlation between
   training and those unobservables, which is bias in an arbitrary direction.
   This part does not go away with a larger sample.

Together these break the back-door criterion, which is stated over
*pre-treatment* covariates for exactly this reason.

## What to do instead

Only adjust for pre-treatment covariates. Age, education and prior-year
earnings are measured before assignment and are fine — they cannot be affected
by the treatment, so they close back-door paths without opening new ones. Drop
the post-treatment occupation and hours variables from the main specification.

## If the mechanism is the question

If you want to know *how much* of the effect runs through occupation, that is a
mediation question and needs a mediation design — a decomposition into natural
direct and indirect effects, with the mediator-outcome confounders adjusted
(sequential ignorability), and its assumptions stated. Regressing the outcome on
treatment and the mediator is not a mediation analysis; it is the bad control
above with a different label.
