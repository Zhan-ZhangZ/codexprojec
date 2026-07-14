# StatsPAI Newey-West HAC parity (R side) -- Module 51.

.args <- commandArgs(trailingOnly = FALSE)
.file_arg <- grep("^--file=", .args, value = TRUE)
.script_dir <- if (length(.file_arg) > 0) dirname(normalizePath(sub("^--file=", "", .file_arg[1]))) else getwd()
source(file.path(.script_dir, "_common.R"))

suppressPackageStartupMessages({ library(sandwich); library(lmtest) })

MODULE <- "51_newey"
df <- read_csv_strict(MODULE)
fit <- lm(y ~ x, data = df)
# NeweyWest with lag=4 (no prewhiten, no adjust to match Stata's `newey`)
V <- NeweyWest(fit, lag = 4, prewhite = FALSE, adjust = FALSE)
co <- coef(fit); se <- sqrt(diag(V))

rows <- list(
  parity_row(MODULE, "beta_intercept", estimate = unname(co["(Intercept)"]), se = unname(se["(Intercept)"]), n = nrow(df)),
  parity_row(MODULE, "beta_x",         estimate = unname(co["x"]),           se = unname(se["x"]),           n = nrow(df))
)
write_results(MODULE, rows, extra = list(vcov = "NeweyWest", lag = 4, package = "sandwich::NeweyWest"))
