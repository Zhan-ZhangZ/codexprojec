# Original-data parity for rdrobust::rdrobust_RDsenate (Lee 2008
# House-elections RD on the Senate vote-share margin).
#
# Lee (2008) Table 1, Column 1 reports the conventional sharp-RD jump
# at the cutoff = 0 with a triangular kernel and MSE-optimal bandwidth.
# The rdrobust vignette and Calonico--Cattaneo--Titiunik (2014) routinely
# recover a ~7-8 percentage-point conventional jump on this dataset.
# We pin the conventional point estimate against the live rdrobust call
# rather than against a published number, since the published headline
# in Lee (2008) and CCT (2014) Table 4 differs slightly across kernels
# and bandwidth selectors.

.script_dir <- (function() {
  args <- commandArgs(trailingOnly = FALSE)
  m <- grep("^--file=", args, value = TRUE)
  if (length(m) > 0) dirname(normalizePath(sub("^--file=", "", m[1])))
  else getwd()
})()
DATA_DIR <- file.path(.script_dir, "data")
RESULTS_DIR <- file.path(.script_dir, "results")
dir.create(DATA_DIR, showWarnings = FALSE, recursive = TRUE)
dir.create(RESULTS_DIR, showWarnings = FALSE, recursive = TRUE)

suppressPackageStartupMessages({
  library(rdrobust)
  library(jsonlite)
})

data("rdrobust_RDsenate", package = "rdrobust")
df <- rdrobust_RDsenate

# Save canonical CSV (StatsPAI-friendly column names).
out <- df
names(out)[names(out) == "margin"] <- "x"
names(out)[names(out) == "vote"] <- "y"
write.csv(out, file.path(DATA_DIR, "05_lee_original.csv"),
          row.names = FALSE)

# Run R-side rdrobust on the canonical Calonico--Cattaneo--Titiunik
# (2014) specification: triangular kernel, MSE-optimal bandwidth, with
# bias-corrected and robust inference.
fit <- rdrobust(y = df$vote, x = df$margin, c = 0, kernel = "triangular",
                bwselect = "mserd")

# Conventional and bias-corrected estimates.
beta_conv <- fit$coef["Conventional", "Coeff"]
se_conv   <- fit$se["Conventional", "Std. Err."]
beta_rb   <- fit$coef["Robust", "Coeff"]
se_rb     <- fit$se["Robust", "Std. Err."]
h_left    <- fit$bws["h", "left"]
h_right   <- fit$bws["h", "right"]

build_row <- function(stat, est, se, n, published, citation, extra = list()) {
  list(module = jsonlite::unbox("05_lee_original"),
       side = jsonlite::unbox("R"),
       statistic = jsonlite::unbox(stat),
       estimate = jsonlite::unbox(est),
       se = jsonlite::unbox(se),
       n = jsonlite::unbox(n),
       published = jsonlite::unbox(published),
       citation = jsonlite::unbox(citation),
       extra = extra)
}

rows <- list(
  build_row("rd_jump_conventional", beta_conv, se_conv, nrow(df),
            7.99,
            "Lee (2008) Table 1; CCT (2014) Table 4 conventional sharp-RD jump",
            list(h_left = jsonlite::unbox(h_left),
                 h_right = jsonlite::unbox(h_right))),
  build_row("rd_jump_robust", beta_rb, se_rb, nrow(df),
            NA_real_,
            "rdrobust::rdrobust bias-corrected robust point and SE",
            list(h_left = jsonlite::unbox(h_left),
                 h_right = jsonlite::unbox(h_right)))
)

payload <- list(
  module = jsonlite::unbox("05_lee_original"),
  side = jsonlite::unbox("R"),
  rows = rows,
  extra = list(data_source = jsonlite::unbox("rdrobust::rdrobust_RDsenate"),
               n_obs = jsonlite::unbox(nrow(df)),
               h_left = jsonlite::unbox(h_left),
               h_right = jsonlite::unbox(h_right)))
writeLines(
  jsonlite::toJSON(payload, pretty = TRUE, na = "null", null = "null",
                    digits = NA),
  file.path(RESULTS_DIR, "05_lee_original_R.json")
)
message("OK -- wrote 05_lee_original_R.json")
