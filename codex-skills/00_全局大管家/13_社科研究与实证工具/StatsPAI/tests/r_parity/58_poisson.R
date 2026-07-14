# StatsPAI plain Poisson regression parity (R side) -- Module 58.

.args <- commandArgs(trailingOnly = FALSE)
.file_arg <- grep("^--file=", .args, value = TRUE)
.script_dir <- if (length(.file_arg) > 0) dirname(normalizePath(sub("^--file=", "", .file_arg[1]))) else getwd()
source(file.path(.script_dir, "_common.R"))

MODULE <- "58_poisson"
df <- read_csv_strict(MODULE)
fit <- glm(y ~ x1 + x2, data = df, family = poisson(),
           control = glm.control(epsilon = 1e-12, maxit = 100))
co <- coef(fit); se <- sqrt(diag(vcov(fit)))

rows <- list(
  parity_row(MODULE, "beta_intercept", estimate = unname(co["(Intercept)"]), se = unname(se["(Intercept)"]), n = nrow(df)),
  parity_row(MODULE, "beta_x1",        estimate = unname(co["x1"]),          se = unname(se["x1"]),          n = nrow(df)),
  parity_row(MODULE, "beta_x2",        estimate = unname(co["x2"]),          se = unname(se["x2"]),          n = nrow(df))
)
write_results(MODULE, rows, extra = list(family = "poisson", package = "stats::glm"))
