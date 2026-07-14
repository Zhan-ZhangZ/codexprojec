# StatsPAI two-way cluster-robust SE parity (R side) -- Module 54.
#
# Reads data/54_twoway_cluster.csv and runs lm + sandwich::vcovCL with the
# two-way cluster formula ~ g1 + g2. type="HC1" + cadjust=TRUE are the
# sandwich::vcovCL defaults and the per-dimension Liang-Zeger convention
# sp.twoway_cluster implements, so the two-way SE must match sp to machine
# precision (see 54_twoway_cluster.py docstring for why fixest differs).

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

MODULE  <- "54_twoway_cluster"
FORMULA <- y ~ x

df <- read_csv_strict(MODULE)

fit <- lm(FORMULA, data = df)
vc <- sandwich::vcovCL(fit, cluster = ~ g1 + g2, type = "HC1", cadjust = TRUE)
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
                           vcov = "two-way cluster (sandwich::vcovCL HC1 cadjust)",
                           cluster_vars = "g1 + g2"))
