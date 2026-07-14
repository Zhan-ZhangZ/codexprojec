# StatsPAI quantile regression parity (R side) -- Module 40.
#
# Reads data/40_qreg.csv and runs quantreg::rq with tau=0.5.
# Tolerance: rel < 1e-3 on coefficients; rel < 5e-2 on SEs.

.args <- commandArgs(trailingOnly = FALSE)
.file_arg <- grep("^--file=", .args, value = TRUE)
.script_dir <- if (length(.file_arg) > 0) {
  dirname(normalizePath(sub("^--file=", "", .file_arg[1])))
} else {
  getwd()
}
source(file.path(.script_dir, "_common.R"))

suppressPackageStartupMessages({
  library(quantreg)
})

MODULE <- "40_qreg"

df <- read_csv_strict(MODULE)

fit <- quantreg::rq(y ~ x1 + x2, data = df, tau = 0.5)
# nid (Powell sandwich) SEs to match Stata qreg's default kernel
sm  <- summary(fit, se = "nid")

co <- coef(fit)
se <- sm$coefficients[, "Std. Error"]

rows <- list(
  parity_row(MODULE, "beta_intercept",
             estimate = unname(co["(Intercept)"]),
             se = unname(se["(Intercept)"]),
             n = nrow(df)),
  parity_row(MODULE, "beta_x1",
             estimate = unname(co["x1"]),
             se = unname(se["x1"]),
             n = nrow(df)),
  parity_row(MODULE, "beta_x2",
             estimate = unname(co["x2"]),
             se = unname(se["x2"]),
             n = nrow(df))
)

write_results(MODULE, rows,
              extra = list(quantile = 0.5,
                           se_method = "nid_Powell",
                           package = "quantreg::rq"))
