# StatsPAI LIML parity (R side) -- Module 59.
#
# ivmodel::ivmodel reports the LIML k-class row for the single
# endogenous coefficient only, so the R side pins beta_x (+SE); the
# exogenous coefficients are py<->Stata rows in the 3-way table.

.args <- commandArgs(trailingOnly = FALSE)
.file_arg <- grep("^--file=", .args, value = TRUE)
.script_dir <- if (length(.file_arg) > 0) dirname(normalizePath(sub("^--file=", "", .file_arg[1]))) else getwd()
source(file.path(.script_dir, "_common.R"))

suppressPackageStartupMessages({ library(ivmodel) })

MODULE <- "59_liml"
df <- read_csv_strict(MODULE)

m <- ivmodel(Y = df$y, D = df$x, Z = as.matrix(df[, c("z1", "z2")]),
             X = as.matrix(df[, "w", drop = FALSE]), intercept = TRUE,
             heteroSE = FALSE)
li <- LIML(m)

rows <- list(
  parity_row(MODULE, "beta_x", estimate = unname(as.numeric(li$point.est)),
             se = unname(as.numeric(li$std.err)), n = nrow(df)),
  parity_row(MODULE, "kappa", estimate = unname(as.numeric(li$k)), n = nrow(df))
)
write_results(MODULE, rows, extra = list(package = "ivmodel::LIML"))
