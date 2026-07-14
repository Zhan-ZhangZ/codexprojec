#!/usr/bin/env Rscript
# Frozen reference for sp.inequality_index vs base-R closed form.
#   * Gini   : bias-corrected (x n/(n-1)) relative mean difference (sp default)
#   * Theil-T: mean((x/mu) log(x/mu))
#   * Theil-L (MLD): mean(log(mu/x))
#   * Atkinson (epsilon=1): 1 - geomean/mean
# Regenerate: Rscript tests/reference_parity/_generate_inequality_R.R
suppressPackageStartupMessages(library(jsonlite))
x <- c(2.1, 3.5, 1.0, 8.2, 4.4, 12.0, 6.7, 2.9, 5.5, 9.1, 3.3, 7.8)
n <- length(x); mu <- mean(x); xs <- sort(x)
gini <- (2*sum((1:n)*xs)/(n*sum(x)) - (n+1)/n) * n/(n-1)
out <- list(
  data = x,
  gini = gini,
  theil_t = mean((x/mu)*log(x/mu)),
  theil_l = mean(log(mu/x)),
  atkinson = 1 - exp(mean(log(x)))/mu,
  provenance = list(r_version = R.version.string,
                    generated_by = "tests/reference_parity/_generate_inequality_R.R")
)
writeLines(toJSON(out, auto_unbox = TRUE, digits = 16, pretty = TRUE),
           "tests/reference_parity/_fixtures/inequality_R.json")
cat("wrote inequality_R.json\n")
