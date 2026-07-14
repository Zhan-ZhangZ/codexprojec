#!/usr/bin/env Rscript
# Frozen-reference generator for sp.kaplan_meier / sp.logrank_test.
#
# Produces tests/reference_parity/_fixtures/survival_km_R.json from the
# committed deterministic CSV, using the canonical R survival package:
#   * Kaplan-Meier survival curve : survival::survfit(Surv(time,event)~1)
#   * Log-rank test               : survival::survdiff(Surv(time,event)~group)
#
# Regenerate with:
#   Rscript tests/reference_parity/_generate_survival_km.R
#
# Reference environment: R 4.5.2, survival package (see sessionInfo dump in
# the JSON provenance block).

suppressPackageStartupMessages({
  library(survival)
  library(jsonlite)
})

here <- function(p) file.path("tests", "reference_parity", p)
df <- read.csv(here("_fixtures/survival_km_data.csv"))

# --- Overall Kaplan-Meier --------------------------------------------------
km <- survfit(Surv(time, event) ~ 1, data = df, conf.type = "log")
# Report S(t) at each distinct EVENT time (n.event > 0), the unambiguous
# step-function knots both engines must agree on.
ev <- km$n.event > 0
km_table <- data.frame(
  time = km$time[ev],
  surv = km$surv[ev],
  n_risk = km$n.risk[ev],
  n_event = km$n.event[ev]
)
km_summary <- summary(km)$table
median_surv <- unname(km_summary["median"])

# --- Log-rank test (two groups) -------------------------------------------
sd <- survdiff(Surv(time, event) ~ group, data = df)
# survdiff reports chisq + per-stratum obs/exp; the p-value is the upper tail
# of a chi-square with (#groups - 1) df.
lr_df <- length(sd$n) - 1L
lr <- list(
  chisq = unname(sd$chisq),
  df = lr_df,
  pvalue = unname(1 - pchisq(sd$chisq, lr_df)),
  observed = unname(sd$obs),
  expected = unname(sd$exp),
  groups = names(sd$n)
)

out <- list(
  dataset = "survival_km_data.csv",
  km_overall = list(
    table = km_table,
    median = median_surv
  ),
  logrank = lr,
  provenance = list(
    r_version = R.version.string,
    survival_version = as.character(packageVersion("survival")),
    generated_by = "tests/reference_parity/_generate_survival_km.R"
  )
)

writeLines(
  toJSON(out, dataframe = "columns", auto_unbox = TRUE, digits = 16, pretty = TRUE),
  here("_fixtures/survival_km_R.json")
)
cat("wrote tests/reference_parity/_fixtures/survival_km_R.json\n")
cat("  median:", median_surv, "| logrank chisq:", lr$chisq, "p:", lr$pvalue, "\n")
