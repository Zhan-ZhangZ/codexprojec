# StatsPAI PPML+HDFE three-way FE parity (R side) -- Module 47.

.args <- commandArgs(trailingOnly = FALSE)
.file_arg <- grep("^--file=", .args, value = TRUE)
.script_dir <- if (length(.file_arg) > 0) dirname(normalizePath(sub("^--file=", "", .file_arg[1]))) else getwd()
source(file.path(.script_dir, "_common.R"))

suppressPackageStartupMessages({ library(fixest) })

MODULE <- "47_ppmlhdfe_3fe"
df <- read_csv_strict(MODULE)

fit <- fixest::fepois(
  trade ~ log_dist + contig | origin + dest + year,
  data = df,
  vcov = "hetero"
)
co <- coef(fit); se <- sqrt(diag(vcov(fit)))

rows <- list(
  parity_row(MODULE, "beta_log_dist", estimate = unname(co["log_dist"]),
             se = unname(se["log_dist"]), n = nrow(df)),
  parity_row(MODULE, "beta_contig",   estimate = unname(co["contig"]),
             se = unname(se["contig"]), n = nrow(df))
)
write_results(MODULE, rows, extra = list(fe = "origin + dest + year",
                                          vcov = "HC1",
                                          package = "fixest::fepois"))
