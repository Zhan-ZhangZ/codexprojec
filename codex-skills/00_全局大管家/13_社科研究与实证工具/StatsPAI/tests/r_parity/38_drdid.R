# StatsPAI doubly-robust DiD parity (R side) -- Module 38.
#
# Reads data/38_drdid.csv and runs DRDID::drdid_imp_panel with the
# same covariate. Tolerance: rel < 1e-3 on ATT; rel < 5e-2 on SE.

.args <- commandArgs(trailingOnly = FALSE)
.file_arg <- grep("^--file=", .args, value = TRUE)
.script_dir <- if (length(.file_arg) > 0) {
  dirname(normalizePath(sub("^--file=", "", .file_arg[1])))
} else {
  getwd()
}
source(file.path(.script_dir, "_common.R"))

suppressPackageStartupMessages({
  library(DRDID)
})

MODULE <- "38_drdid"

df <- read_csv_strict(MODULE)

# DRDID::drdid_imp_panel expects: y1 = post outcome, y0 = pre outcome,
# D = treated indicator, covariates = pre-treatment covariate matrix.
# We have long-format data with one row per (id, post) -- pivot wide.
df_pre  <- df[df$post == 0, c("id", "y", "treated", "x")]
df_post <- df[df$post == 1, c("id", "y")]
names(df_pre)[names(df_pre) == "y"] <- "y0"
names(df_post)[names(df_post) == "y"] <- "y1"
wide <- merge(df_pre, df_post, by = "id")

fit <- DRDID::drdid_imp_panel(
  y1       = wide$y1,
  y0       = wide$y0,
  D        = wide$treated,
  covariates = cbind(1, wide$x)  # intercept + x
)

att <- fit$ATT
se  <- fit$se
ci_lo <- att - qnorm(0.975) * se
ci_hi <- att + qnorm(0.975) * se

rows <- list(
  parity_row(MODULE, "att",
             estimate = att, se = se, n = nrow(df)),
  parity_row(MODULE, "ci_lower",
             estimate = ci_lo, n = nrow(df)),
  parity_row(MODULE, "ci_upper",
             estimate = ci_hi, n = nrow(df))
)

write_results(MODULE, rows, extra = list(
  method = "DRDID::drdid_imp_panel",
  covariates = "x"
))
