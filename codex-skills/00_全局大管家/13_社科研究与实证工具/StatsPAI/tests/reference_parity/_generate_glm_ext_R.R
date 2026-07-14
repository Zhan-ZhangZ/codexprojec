#!/usr/bin/env Rscript
# Frozen reference for sp.cloglog / sp.fracreg / sp.hurdle vs R.
#   * cloglog : stats::glm(binomial("cloglog"))
#   * fracreg : stats::glm(quasibinomial("logit"))  [fractional response]
#   * hurdle  : pscl::hurdle(dist="poisson", zero.dist="binomial")
# Regenerate: Rscript tests/reference_parity/_generate_glm_ext_R.R
suppressPackageStartupMessages({library(pscl); library(jsonlite)})
df <- read.csv("tests/reference_parity/_fixtures/glm_ext_data.csv")
cl <- glm(ybin ~ x1 + x2, data = df, family = binomial("cloglog"))
fr <- glm(frac ~ x1 + x2, data = df, family = quasibinomial("logit"))
hu <- hurdle(ycount ~ x1 + x2, data = df, dist = "poisson", zero.dist = "binomial")
out <- list(
  cloglog = as.list(coef(cl)),
  fracreg = as.list(coef(fr)),
  hurdle_count = as.list(coef(hu, "count")),
  hurdle_zero = as.list(coef(hu, "zero")),
  provenance = list(r_version = R.version.string,
                    pscl_version = as.character(packageVersion("pscl")),
                    generated_by = "tests/reference_parity/_generate_glm_ext_R.R")
)
writeLines(toJSON(out, auto_unbox = TRUE, digits = 16, pretty = TRUE),
           "tests/reference_parity/_fixtures/glm_ext_R.json")
cat("wrote glm_ext_R.json\n")
