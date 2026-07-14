#!/usr/bin/env Rscript
# Frozen reference for sp.survreg / sp.aft (Weibull AFT) vs survival::survreg.
# Regenerate: Rscript tests/reference_parity/_generate_aft_R.R
suppressPackageStartupMessages({library(survival); library(jsonlite)})
df <- read.csv("tests/reference_parity/_fixtures/aft_data.csv")
m <- survreg(Surv(time, event) ~ x + group, data = df, dist = "weibull")
out <- list(
  coefficients = list(Intercept = unname(coef(m)["(Intercept)"]),
                      x = unname(coef(m)["x"]),
                      group = unname(coef(m)["group"])),
  log_scale = unname(log(m$scale)),
  loglik = unname(m$loglik[2]),
  provenance = list(r_version = R.version.string,
                    survival_version = as.character(packageVersion("survival")),
                    generated_by = "tests/reference_parity/_generate_aft_R.R")
)
writeLines(toJSON(out, auto_unbox = TRUE, digits = 16, pretty = TRUE),
           "tests/reference_parity/_fixtures/aft_R.json")
cat("wrote aft_R.json\n")
