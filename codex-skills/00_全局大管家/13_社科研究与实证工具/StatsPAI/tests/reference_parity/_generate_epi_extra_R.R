#!/usr/bin/env Rscript
# Frozen reference for sp.cohen_kappa / sp.attributable_risk vs base-R closed
# form (point estimates; SEs/CIs use convention-specific methods not pinned).
# Regenerate: Rscript tests/reference_parity/_generate_epi_extra_R.R
suppressPackageStartupMessages(library(jsonlite))
ra <- c(1,1,2,2,3,1,2,3,3,1,2,2,3,1,1); rb <- c(1,2,2,2,3,1,3,3,3,1,2,1,3,1,2)
tab <- table(factor(ra,1:3), factor(rb,1:3)); n <- sum(tab)
po <- sum(diag(tab))/n
pe <- sum(rowSums(tab)*colSums(tab))/n^2
kappa <- (po-pe)/(1-pe)
a<-30; b<-70; c<-20; d<-80
rr <- (a/(a+b))/(c/(c+d))
afe <- (rr-1)/rr
prev_exp <- (a+b)/(a+b+c+d)
paf <- prev_exp*(rr-1)/(1+prev_exp*(rr-1))
out <- list(
  kappa = list(estimate = kappa, observed_agreement = po, expected_agreement = pe),
  attributable_risk = list(afe = afe, paf = paf, rr = rr),
  provenance = list(r_version = R.version.string,
                    generated_by = "tests/reference_parity/_generate_epi_extra_R.R")
)
writeLines(toJSON(out, auto_unbox = TRUE, digits = 16, pretty = TRUE),
           "tests/reference_parity/_fixtures/epi_extra_R.json")
cat("wrote epi_extra_R.json\n")
