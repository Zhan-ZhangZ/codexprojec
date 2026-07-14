# StatsPAI seemingly unrelated regressions parity (R side) -- Module 60.
#
# systemfit SUR with methodResidCov='noDfCor' (Sigma divisor n) and
# maxiter=1 reproduces the one-step FGLS convention shared by
# sp.sureg(method='fgls') and the Stata sureg default.

.args <- commandArgs(trailingOnly = FALSE)
.file_arg <- grep("^--file=", .args, value = TRUE)
.script_dir <- if (length(.file_arg) > 0) dirname(normalizePath(sub("^--file=", "", .file_arg[1]))) else getwd()
source(file.path(.script_dir, "_common.R"))

suppressPackageStartupMessages({ library(systemfit) })

MODULE <- "60_sureg"
df <- read_csv_strict(MODULE)

eqs <- list(eq1 = y1 ~ x1 + w, eq2 = y2 ~ x2 + w)
ctl <- systemfit.control(methodResidCov = "noDfCor", maxiter = 1)
fit <- systemfit(eqs, method = "SUR", data = df, control = ctl)
co <- coef(fit); se <- sqrt(diag(vcov(fit)))

lab <- c(eq1_.Intercept. = "beta_eq1_intercept", eq1_x1 = "beta_eq1_x1", eq1_w = "beta_eq1_w",
         eq2_.Intercept. = "beta_eq2_intercept", eq2_x2 = "beta_eq2_x2", eq2_w = "beta_eq2_w")
nm <- names(co)
rows <- lapply(seq_along(co), function(i) {
  key <- gsub("[()]", ".", nm[i])
  parity_row(MODULE, unname(lab[key]), estimate = unname(co[i]), se = unname(se[i]), n = nrow(df))
})
write_results(MODULE, rows,
              extra = list(package = "systemfit::systemfit",
                           method = "SUR one-step FGLS",
                           residCov = "noDfCor (divisor n)"))
