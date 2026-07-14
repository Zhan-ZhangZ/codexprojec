#!/usr/bin/env Rscript
# Ground-truth for StatsPAI's faithful port of hdm::rlassologit (the
# *logistic* rigorous Lasso, whose penalized fit is glmnet binomial lasso
# at a single data-driven lambda).
#
# Writes:
#   _fixtures/rlassologit_data.csv   [y, V1..Vp]  (y binary)
#   _fixtures/rlassologit_R.json     hdm + glmnet expected outputs
#
# Re-run only on contract change:
#   Rscript tests/reference_parity/_generate_rlassologit.R
#
# References: Chernozhukov, Hansen & Spindler (2016) [@chernozhukov2016hdm];
# glmnet (Friedman, Hastie & Tibshirani 2010) [@friedman2010regularization].

suppressMessages({
  library(hdm)
  library(glmnet)
  library(jsonlite)
})

FIX <- "tests/reference_parity/_fixtures"
dir.create(FIX, showWarnings = FALSE, recursive = TRUE)

set.seed(42)
n <- 300L
p <- 40L
X <- matrix(rnorm(n * p), n, p)
colnames(X) <- paste0("V", seq_len(p))
bt <- c(2.0, -1.5, 1.0, rep(0, p - 3))
pr <- 1 / (1 + exp(-(X %*% bt)))
y <- rbinom(n, 1, pr)
write.csv(data.frame(y = y, X, check.names = FALSE),
          file.path(FIX, "rlassologit_data.csv"), row.names = FALSE)

fit_to_list <- function(f) list(
  beta = as.numeric(f$beta),
  intercept = as.numeric(f$intercept),
  index = as.integer(f$index),
  lambda0 = as.numeric(f$lambda0),
  residuals = as.numeric(f$residuals),
  sigma = as.numeric(f$sigma),
  n_selected = as.integer(sum(f$index))
)

# The lambda hdm uses for post=TRUE (c=1.1) and post=FALSE (c=0.5).
gamma <- 0.1 / log(n)
lam_post  <- (1.1 / 2 * sqrt(n) * qnorm(1 - gamma / (2 * p))) / (2 * n)
lam_lasso <- (0.5 / 2 * sqrt(n) * qnorm(1 - gamma / (2 * p))) / (2 * n)
g_post  <- glmnet(X, y, family = "binomial", alpha = 1, lambda = lam_post,
                  standardize = TRUE, intercept = TRUE)

out <- list(
  meta = list(R_version = R.version.string,
              hdm_version = as.character(packageVersion("hdm")),
              glmnet_version = as.character(packageVersion("glmnet"))),
  n = n, p = p,
  glmnet_post = list(lambda = lam_post,
                     beta = as.numeric(g_post$beta),
                     a0 = as.numeric(g_post$a0),
                     sel = as.integer(which(abs(as.numeric(g_post$beta)) > 0))),
  rlassologit_post_int   = fit_to_list(rlassologit(X, y, post = TRUE,  intercept = TRUE)),
  rlassologit_lasso_int  = fit_to_list(rlassologit(X, y, post = FALSE, intercept = TRUE)),
  rlassologit_post_noint = fit_to_list(rlassologit(X, y, post = TRUE,  intercept = FALSE)),
  predict_first10_response = as.numeric(
    predict(rlassologit(X, y, post = TRUE), newdata = X, type = "response")[1:10]),
  predict_first10_link = as.numeric(
    predict(rlassologit(X, y, post = TRUE), newdata = X, type = "link")[1:10])
)

writeLines(toJSON(out, digits = NA, auto_unbox = TRUE), file.path(FIX, "rlassologit_R.json"))
cat("rlassologit post,int: n_sel =", out$rlassologit_post_int$n_selected,
    " lambda0 =", round(out$rlassologit_post_int$lambda0, 4), "\n")
cat("  glmnet_post n_sel =", length(out$glmnet_post$sel), " sel =", out$glmnet_post$sel, "\n")
cat("  beta[sel] =", round(out$rlassologit_post_int$beta[out$glmnet_post$sel], 4), "\n")
