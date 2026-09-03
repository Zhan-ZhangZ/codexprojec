# Minimum wage and county employment

Panel data with county and year fixed effects is exactly the setting two-way
fixed effects was designed for, so I would just use a two-way fixed effects
regression:

    emp_it = alpha_i + lambda_t + beta * treat_it + e_it

    reg emp i.county i.year treat, cluster(county)

The headline estimate is from the TWFE coefficient on `treat`, which gives the
average effect of the policy on employment. TWFE is fine here — the fixed
effects absorb any time-invariant county differences and any common year
shocks, so what is left is the policy.

Reporting: one column with the TWFE coefficient, its clustered standard error,
and stars. Add county-level controls in a second column to show the estimate is
stable, and that is the paper's main table.

Parallel trends holds by assumption in this design, so no additional testing is
needed beyond noting it in the text.
