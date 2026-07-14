# StatsPAI Tobit parity (R side) -- Module 41.
#
# Reads data/41_tobit.csv and runs censReg::censReg with left=0.
# Tolerance: rel < 1e-3 on coefficients; rel < 1e-2 on SEs.

.args <- commandArgs(trailingOnly = FALSE)
.file_arg <- grep("^--file=", .args, value = TRUE)
.script_dir <- if (length(.file_arg) > 0) {
  dirname(normalizePath(sub("^--file=", "", .file_arg[1])))
} else {
  getwd()
}
source(file.path(.script_dir, "_common.R"))

suppressPackageStartupMessages({
  library(censReg)
})

MODULE <- "41_tobit"

df <- read_csv_strict(MODULE)

fit <- censReg::censReg(y ~ x, data = df, left = 0)
sm  <- summary(fit)

# censReg::censReg coefs: (Intercept), x, logSigma. We want sigma.
co  <- coef(fit)
ses <- sm$estimate[, "Std. error"]

intercept_b  <- unname(co["(Intercept)"])
intercept_se <- unname(ses["(Intercept)"])
x_b  <- unname(co["x"])
x_se <- unname(ses["x"])
# sigma = exp(logSigma); SE via delta: se_sigma = sigma * se_logSigma
log_sigma   <- unname(co["logSigma"])
log_sigma_se <- unname(ses["logSigma"])
sigma_b  <- exp(log_sigma)
sigma_se <- sigma_b * log_sigma_se

rows <- list(
  parity_row(MODULE, "beta_intercept",
             estimate = intercept_b, se = intercept_se, n = nrow(df)),
  parity_row(MODULE, "beta_x",
             estimate = x_b, se = x_se, n = nrow(df)),
  parity_row(MODULE, "sigma",
             estimate = sigma_b, se = sigma_se, n = nrow(df))
)

write_results(MODULE, rows,
              extra = list(left_censor = 0.0,
                           package = "censReg::censReg"))
