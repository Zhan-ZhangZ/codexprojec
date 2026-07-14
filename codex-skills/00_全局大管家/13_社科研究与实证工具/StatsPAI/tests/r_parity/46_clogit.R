# StatsPAI conditional logit parity (R side) -- Module 46.

.args <- commandArgs(trailingOnly = FALSE)
.file_arg <- grep("^--file=", .args, value = TRUE)
.script_dir <- if (length(.file_arg) > 0) dirname(normalizePath(sub("^--file=", "", .file_arg[1]))) else getwd()
source(file.path(.script_dir, "_common.R"))

suppressPackageStartupMessages({ library(survival) })

MODULE <- "46_clogit"
df <- read_csv_strict(MODULE)

# clogit is fit via stratified Cox PH. survival::clogit uses
# choice ~ x + strata(group)
fit <- survival::clogit(choice ~ x + strata(group), data = df)
co <- coef(fit); se <- sqrt(diag(vcov(fit)))

rows <- list(
  parity_row(MODULE, "beta_x", estimate = unname(co["x"]), se = unname(se["x"]), n = nrow(df))
)

write_results(MODULE, rows, extra = list(package = "survival::clogit"))
