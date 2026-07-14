# StatsPAI Heckman selection parity (R side) -- Module 43.

.args <- commandArgs(trailingOnly = FALSE)
.file_arg <- grep("^--file=", .args, value = TRUE)
.script_dir <- if (length(.file_arg) > 0) dirname(normalizePath(sub("^--file=", "", .file_arg[1]))) else getwd()
source(file.path(.script_dir, "_common.R"))

suppressPackageStartupMessages({ library(sampleSelection) })

MODULE <- "43_heckman"
df <- read_csv_strict(MODULE)

# 2-step Heckman matching sp.heckman; sampleSelection::heckit
fit <- sampleSelection::heckit(
  selection = sel ~ z,
  outcome   = y ~ x,
  data      = df,
  method    = "2step"
)

sm <- summary(fit)
co_out <- sm$estimate    # all coefs (selection + outcome)
# Outcome equation rows: "y/(Intercept)", "y/x", "y/invMillsRatio" (or similar)
# Use stat name to pull them; sampleSelection labels them with prefixes.
rn <- rownames(co_out)
get_row <- function(pattern) {
  hit <- grep(pattern, rn, value = TRUE)
  if (length(hit) == 0) return(c(NA, NA))
  v <- co_out[hit[1], ]
  c(v["Estimate"], v["Std. error"])
}

ic <- get_row("(Intercept)$|^o.*Intercept")
xc <- get_row("^o.*x$|^x$|^.*x_")
# Use the outcome equation's variables only; sampleSelection prefixes with
# "out" or has them in a separate slot; safer: directly extract from the
# fit object.

beta_int <- coef(fit, part = "outcome")[["(Intercept)"]]
beta_x   <- coef(fit, part = "outcome")[["x"]]
se_int   <- sqrt(diag(vcov(fit, part = "outcome")))[["(Intercept)"]]
se_x     <- sqrt(diag(vcov(fit, part = "outcome")))[["x"]]

# IMR (lambda) coefficient
lam_est <- coef(fit, part = "outcome")[["invMillsRatio"]]
lam_se  <- sqrt(diag(vcov(fit, part = "outcome")))[["invMillsRatio"]]

rows <- list(
  parity_row(MODULE, "beta_intercept", estimate = beta_int, se = se_int, n = nrow(df)),
  parity_row(MODULE, "beta_x",         estimate = beta_x,   se = se_x,   n = nrow(df)),
  parity_row(MODULE, "lambda_imr",     estimate = lam_est,  se = lam_se, n = nrow(df))
)

write_results(MODULE, rows, extra = list(method = "2-step Heckit",
                                          package = "sampleSelection::heckit"))
