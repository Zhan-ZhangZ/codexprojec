#!/usr/bin/env Rscript
# Ground-truth generator for StatsPAI's faithful hdm port (sp.rlasso /
# sp.rlasso_iv / sp.rlasso_effect).
#
# Produces, under tests/reference_parity/_fixtures/:
#   rlasso_coreA.csv     synthetic (n=100,p=40) inputs  [y,V1..Vp]
#   rlasso_effect.csv    synthetic (n=200,p=50) inputs  [y,d,x1..xp]
#   hdm_eminent_logGDP.csv  EminentDomain$logGDP inputs [y,d,x..,z..]
#   rlasso_R.json        all expected hdm outputs (full double precision)
#
# Re-run only when the algorithm contract changes:
#   Rscript tests/reference_parity/_generate_rlasso.R
#
# hdm reference: Chernozhukov, Hansen & Spindler (2016), R Journal 8(2),
# 185-199 [@chernozhukov2016hdm].  rlasso = Belloni, Chernozhukov & Hansen
# (2014) [@belloni2014inference]; rlassoIV = Belloni, Chen, Chernozhukov &
# Hansen (2012) [@belloni2012sparse].

suppressMessages({
  library(hdm)
  library(jsonlite)
})

FIX <- file.path(dirname(sub("--file=", "",
  grep("--file=", commandArgs(trailingOnly = FALSE), value = TRUE))),
  "_fixtures")
if (!dir.exists(FIX)) FIX <- "tests/reference_parity/_fixtures"
dir.create(FIX, showWarnings = FALSE, recursive = TRUE)

js <- function(x) jsonlite::toJSON(x, digits = NA, auto_unbox = TRUE, null = "null")

fit_to_list <- function(f) {
  list(
    beta         = as.numeric(f$beta),
    intercept    = as.numeric(f$intercept),
    index        = as.integer(f$index),
    lambda0      = as.numeric(f$lambda0),
    loadings     = as.numeric(f$loadings),
    sigma        = as.numeric(f$sigma),
    coefficients = as.numeric(f$coefficients),
    residuals    = as.numeric(f$residuals),
    iter         = as.integer(f$iter),
    n_selected   = as.integer(sum(f$index))
  )
}

out <- list(
  meta = list(
    R_version  = R.version.string,
    hdm_version = as.character(packageVersion("hdm")),
    generated  = "deterministic; re-run only on contract change"
  )
)

## ───────────────────────── Fixture A: core rlasso ─────────────────────────
set.seed(1)
n <- 100L; p <- 40L
X <- matrix(rnorm(n * p), n, p)
colnames(X) <- paste0("V", seq_len(p))
beta_true <- rep(c(3, -2, 1.5, 0, 0, 0, 0, 0, 0, 0), length.out = p)
y <- as.numeric(X %*% beta_true + rnorm(n))
write.csv(data.frame(y = y, X, check.names = FALSE),
          file.path(FIX, "rlasso_coreA.csv"), row.names = FALSE)

out$coreA <- list(
  n = n, p = p,
  post_true_intercept_true   = fit_to_list(rlasso(X, y, post = TRUE,  intercept = TRUE)),
  post_false_intercept_true  = fit_to_list(rlasso(X, y, post = FALSE, intercept = TRUE)),
  post_true_intercept_false  = fit_to_list(rlasso(X, y, post = TRUE,  intercept = FALSE)),
  homoscedastic_post_true    = fit_to_list(
    rlasso(X, y, post = TRUE, intercept = TRUE,
           penalty = list(homoscedastic = TRUE, X.dependent.lambda = FALSE,
                          lambda.start = NULL, c = 1.1, gamma = 0.1 / log(n)))),
  predict_first10 = as.numeric(predict(rlasso(X, y, post = TRUE))[1:10])
)

## ─────────────────── Fixture B: rlassoEffect (partial-out / DS) ───────────
set.seed(2)
n2 <- 200L; p2 <- 50L
X2 <- matrix(rnorm(n2 * p2), n2, p2)
colnames(X2) <- paste0("x", seq_len(p2))
gamma <- c(1, -0.8, 0.6, rep(0, p2 - 3))
d2 <- as.numeric(X2 %*% gamma + rnorm(n2))
beta2 <- c(0.5, 0, 0.7, rep(0, p2 - 3))
alpha_true <- 1.0
y2 <- alpha_true * d2 + as.numeric(X2 %*% beta2) + rnorm(n2)
write.csv(data.frame(y = y2, d = d2, X2, check.names = FALSE),
          file.path(FIX, "rlasso_effect.csv"), row.names = FALSE)

eff_to_list <- function(e) list(
  alpha = as.numeric(e$alpha), se = as.numeric(e$se),
  t = as.numeric(e$t), pval = as.numeric(e$pval))

out$effect <- list(
  n = n2, p = p2, alpha_true = alpha_true,
  partialling_out  = eff_to_list(rlassoEffect(X2, y2, d2, method = "partialling out")),
  double_selection = eff_to_list(rlassoEffect(X2, y2, d2, method = "double selection"))
)

# rlassoEffects: each targeted column of X2 as a treatment, rest as controls.
effM_po <- rlassoEffects(X2, y2, index = c(1, 2, 3, 4), method = "partialling out")
effM_ds <- rlassoEffects(X2, y2, index = c(1, 2, 3, 4), method = "double selection")
out$effects_multi <- list(
  index = c(1, 2, 3, 4),
  partialling_out = list(alpha = as.numeric(effM_po$coefficients),
                         se = as.numeric(effM_po$se),
                         t = as.numeric(effM_po$t),
                         pval = as.numeric(effM_po$pval)),
  double_selection = list(alpha = as.numeric(effM_ds$coefficients),
                          se = as.numeric(effM_ds$se),
                          t = as.numeric(effM_ds$t),
                          pval = as.numeric(effM_ds$pval))
)

## ───────────────── Fixture C: EminentDomain rlassoIV (logGDP) ─────────────
ed <- EminentDomain$logGDP
x <- ed$x; y3 <- as.numeric(ed$y); d3 <- as.numeric(ed$d); z <- ed$z
colnames(x) <- paste0("x", seq_len(ncol(x)))
colnames(z) <- paste0("z", seq_len(ncol(z)))
write.csv(data.frame(y = y3, d = d3, x, z, check.names = FALSE),
          file.path(FIX, "hdm_eminent_logGDP.csv"), row.names = FALSE)

resZ    <- rlassoIV(x = x, d = d3, y = y3, z = z, select.X = FALSE, select.Z = TRUE)
resBoth <- rlassoIV(x = x, d = d3, y = y3, z = z, select.X = TRUE,  select.Z = TRUE)
# Core rlasso of d on [z,x] — the first-stage selection that was 17x off
lasso_d_zx <- rlasso(cbind(z, x), d3, post = TRUE)

out$eminent_logGDP <- list(
  n = length(y3), n_x = ncol(x), n_z = ncol(z),
  selectZ = list(coef = as.numeric(resZ$coefficients),
                 se = as.numeric(resZ$se),
                 n_selected = as.integer(sum(resZ$selection.matrix[, 1]))),
  selectBoth = list(coef = as.numeric(resBoth$coefficients),
                    se = as.numeric(resBoth$se)),
  lasso_d_on_zx = list(n_selected = as.integer(sum(lasso_d_zx$index)),
                       lambda0 = as.numeric(lasso_d_zx$lambda0),
                       sigma = as.numeric(lasso_d_zx$sigma),
                       selected_idx = as.integer(which(lasso_d_zx$index)))
)

## ──────────── Fixture D: well-conditioned synthetic IV (all 4 paths) ───────
set.seed(3)
n4 <- 300L; px <- 20L; pz <- 30L
Xc <- matrix(rnorm(n4 * px), n4, px); colnames(Xc) <- paste0("x", seq_len(px))
Zc <- matrix(rnorm(n4 * pz), n4, pz); colnames(Zc) <- paste0("z", seq_len(pz))
piz <- c(1.2, -0.9, 0.7, rep(0, pz - 3))      # 3 relevant instruments
gx  <- c(0.8, -0.6, 0.5, rep(0, px - 3))      # 3 relevant controls
u   <- rnorm(n4)
dd4 <- as.numeric(Zc %*% piz + Xc %*% gx + 0.7 * u + rnorm(n4))
beta4 <- 1.5
y4  <- beta4 * dd4 + as.numeric(Xc %*% gx) + u + rnorm(n4)
write.csv(data.frame(y = y4, d = dd4, Xc, Zc, check.names = FALSE),
          file.path(FIX, "rlasso_iv_synth.csv"), row.names = FALSE)

ivZ    <- rlassoIV(x = Xc, d = dd4, y = y4, z = Zc, select.X = FALSE, select.Z = TRUE)
ivX    <- rlassoIV(x = Xc, d = dd4, y = y4, z = Zc, select.X = TRUE,  select.Z = FALSE)
ivBoth <- rlassoIV(x = Xc, d = dd4, y = y4, z = Zc, select.X = TRUE,  select.Z = TRUE)
ivNone <- tsls(x = Xc, d = dd4, y = y4, z = Zc, homoscedastic = FALSE)

out$iv_synth <- list(
  n = n4, px = px, pz = pz, beta_true = beta4,
  selectZ    = list(coef = as.numeric(ivZ$coefficients),    se = as.numeric(ivZ$se)),
  selectX    = list(coef = as.numeric(ivX$coefficients),    se = as.numeric(ivX$se)),
  selectBoth = list(coef = as.numeric(ivBoth$coefficients), se = as.numeric(ivBoth$se)),
  plain_tsls = list(coef = as.numeric(ivNone$coefficients[1]),
                    se = as.numeric(ivNone$se[1]))
)

writeLines(js(out), file.path(FIX, "rlasso_R.json"))
cat("Wrote fixtures to", FIX, "\n")
cat("  coreA post=T:  n_sel =", out$coreA$post_true_intercept_true$n_selected,
    " lambda0 =", round(out$coreA$post_true_intercept_true$lambda0, 4), "\n")
cat("  effect PO:     alpha =", round(out$effect$partialling_out$alpha, 4),
    " se =", round(out$effect$partialling_out$se, 4), "\n")
cat("  eminent selZ:  coef  =", round(out$eminent_logGDP$selectZ$coef, 4),
    " se =", round(out$eminent_logGDP$selectZ$se, 4),
    " n_sel =", out$eminent_logGDP$selectZ$n_selected, "\n")
cat("  eminent both:  coef  =", round(out$eminent_logGDP$selectBoth$coef, 4),
    " se =", round(out$eminent_logGDP$selectBoth$se, 4), "\n")
cat("  d~[z,x] n_sel =", out$eminent_logGDP$lasso_d_on_zx$n_selected, "\n")
cat("  iv_synth selZ =", round(out$iv_synth$selectZ$coef, 4),
    " selX =", round(out$iv_synth$selectX$coef, 4),
    " both =", round(out$iv_synth$selectBoth$coef, 4),
    " tsls =", round(out$iv_synth$plain_tsls$coef, 4), "(truth 1.5)\n")
