#!/usr/bin/env Rscript
# Frozen reference for sp.power_rct / power_two_proportions / power_logrank vs
# the canonical large-sample z-approximation power formulas computed in base R
# (the same formulas Stata `power` and standard texts use):
#   * power_rct           : two-sample t design, pooled-sigma z-approx
#                           Phi(d * sqrt(n_g/2) - z_{1-a/2}),  n_g = n_total/2
#   * power_two_proportions: unpooled (Wald) z-approx
#   * power_logrank       : Schoenfeld, events = n * prob_event, 1:1 allocation
# Regenerate: Rscript tests/reference_parity/_generate_power_R.R
suppressPackageStartupMessages(library(jsonlite))
za <- qnorm(0.975)
rct <- function(n, d) { ng <- n / 2; pnorm(d * sqrt(ng / 2) - za) }
tp <- function(n, p1, p2) {
  ng <- n / 2; s <- sqrt(p1 * (1 - p1) + p2 * (1 - p2))
  pnorm((abs(p1 - p2) * sqrt(ng) - za * s) / s)
}
lr <- function(n, hr, pe) { d <- n * pe; pnorm(abs(log(hr)) * sqrt(d) / 2 - za) }
out <- list(
  rct = list(
    list(n = 64, d = 0.5, power = rct(64, 0.5)),
    list(n = 128, d = 0.5, power = rct(128, 0.5)),
    list(n = 200, d = 0.35, power = rct(200, 0.35))
  ),
  two_prop = list(
    list(n = 100, p1 = 0.3, p2 = 0.5, power = tp(100, 0.3, 0.5)),
    list(n = 200, p1 = 0.4, p2 = 0.55, power = tp(200, 0.4, 0.55))
  ),
  logrank = list(
    list(n = 200, hr = 0.6, pe = 0.7, power = lr(200, 0.6, 0.7)),
    list(n = 300, hr = 0.7, pe = 0.8, power = lr(300, 0.7, 0.8))
  ),
  provenance = list(r_version = R.version.string,
                    generated_by = "tests/reference_parity/_generate_power_R.R")
)
writeLines(toJSON(out, auto_unbox = TRUE, digits = 16, pretty = TRUE),
           "tests/reference_parity/_fixtures/power_R.json")
cat("wrote power_R.json\n")
