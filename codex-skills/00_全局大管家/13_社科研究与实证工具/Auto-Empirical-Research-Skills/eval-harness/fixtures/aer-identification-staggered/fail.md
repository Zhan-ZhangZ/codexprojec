# Identification section

The design is a difference-in-differences with county and year fixed effects:

    y_it = alpha_i + lambda_t + beta * D_it + e_it

Identification comes from within-county variation in policy timing, net of
common year shocks. The coefficient beta is the average treatment effect on the
treated.

Parallel trends is the identifying assumption. Because the fixed effects absorb
level differences across counties and common shocks across years, the remaining
variation is plausibly as good as random, and the assumption is reasonable in
this setting. We state it in the text.

Standard errors are clustered at the county level to allow for serial
correlation within counties.

For robustness we add county-specific linear time trends and re-estimate; the
coefficient is stable, which supports the design. We also drop each state in
turn and confirm no single state drives the result.

This is the standard approach in the literature and matches what recent papers
in this area report, so we expect it to be uncontroversial with referees.
