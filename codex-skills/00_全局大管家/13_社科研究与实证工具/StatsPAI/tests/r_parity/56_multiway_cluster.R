# StatsPAI three-way cluster-robust SE parity (R side) -- Module 56.
#
# Reads data/56_multiway_cluster.csv and runs lm + sandwich::vcovCL with the
# three-way cluster formula ~ g1 + g2 + g3. type="HC1" + cadjust=TRUE are the
# sandwich::vcovCL defaults / per-dimension Liang-Zeger convention that
# sp.multiway_cluster_vcov implements, so the three-way SE must match sp to
# machine precision. This is the cross-language regression guard for the
# v1.16.1 multiway intersection-key correctness fix (see 56_multiway_cluster.py).

.args <- commandArgs(trailingOnly = FALSE)
.file_arg <- grep("^--file=", .args, value = TRUE)
.script_dir <- if (length(.file_arg) > 0) {
  dirname(normalizePath(sub("^--file=", "", .file_arg[1])))
} else {
  getwd()
}
source(file.path(.script_dir, "_common.R"))

suppressPackageStartupMessages({
  library(sandwich)
})

MODULE  <- "56_multiway_cluster"
FORMULA <- y ~ x

df <- read_csv_strict(MODULE)

fit <- lm(FORMULA, data = df)
vc <- sandwich::vcovCL(fit, cluster = ~ g1 + g2 + g3, type = "HC1", cadjust = TRUE)
se <- sqrt(diag(vc))

rows <- list()
for (name in names(coef(fit))) {
  beta <- unname(coef(fit)[name])
  s    <- unname(se[name])
  rows[[length(rows) + 1L]] <- parity_row(
    module    = MODULE,
    statistic = paste0("beta_", name),
    estimate  = beta,
    se        = s,
    ci_lo     = beta - qnorm(0.975) * s,
    ci_hi     = beta + qnorm(0.975) * s,
    n         = nrow(df)
  )
}

write_results(MODULE, rows,
              extra = list(formula = deparse(FORMULA),
                           vcov = "three-way cluster (sandwich::vcovCL HC1 cadjust)",
                           cluster_vars = "g1 + g2 + g3"))
