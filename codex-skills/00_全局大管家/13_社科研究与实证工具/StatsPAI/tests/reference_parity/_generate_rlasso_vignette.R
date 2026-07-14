# Ground-truth generator for StatsPAI's faithful hdm port — the canonical
# `hdm` *vignette* applications (Chernozhukov, Hansen & Spindler 2016,
# R Journal 8(2), 185-199 [chernozhukov2016hdm]):
#
#   1. Growth  — rlassoEffect of (log) initial GDP on growth, selecting among
#                ~60 country controls. The classic conditional-convergence
#                coefficient. Data: Barro & Lee growth panel (public economic
#                facts; distributed with hdm as `GrowthData`).
#   2. AJR     — rlassoIV (select among high-dim controls) of expropriation
#                risk on GDP, instrumented by settler mortality. Acemoglu,
#                Johnson & Robinson (2001), AER 91(5):1369-1401 (public
#                economic facts; distributed with hdm as `AJR`).
#   3. cps2012 — rlassoEffects for the gender wage gap. The full expanded
#                design is recorded in JSON only; an 800-row deterministic
#                subsample is bundled as the CI fixture.
#
# These are public, published economic facts (not copyrightable), extracted
# here only to pin StatsPAI's numbers against `hdm`'s own vignette output —
# exactly as `_generate_rlasso.R` does for the EminentDomain application.
#
# Outputs (written to _fixtures/):
#   hdm_growth_data.csv    GrowthData as-is (col1 Outcome=y, col3 gdpsh465=d)
#   hdm_ajr_data.csv       y=GDP, d=Exprop, z=logMort, + 21 expanded controls
#   hdm_cps2012_subsample.csv 800-row deterministic cps2012 fixture
#   rlasso_vignette_R.json all expected hdm outputs (full double precision)
#
# Re-run only on a contract change:
#   Rscript tests/reference_parity/_generate_rlasso_vignette.R

suppressMessages(library(hdm))
suppressMessages(library(jsonlite))

here <- file.path("tests", "reference_parity", "_fixtures")
dir.create(here, showWarnings = FALSE, recursive = TRUE)

# ---- 1. Growth: rlassoEffect (partialling out + double selection) ----------
data(GrowthData)
write.csv(GrowthData, file.path(here, "hdm_growth_data.csv"), row.names = FALSE)
gy <- GrowthData[, 1]      # Outcome (growth)
gd <- GrowthData[, 3]      # gdpsh465 (log initial GDP)
gX <- as.matrix(GrowthData[, -c(1, 2, 3)])  # drop Outcome, intercept, gdpsh465
g_po <- rlassoEffect(x = gX, y = gy, d = gd, method = "partialling out")
g_ds <- rlassoEffect(x = gX, y = gy, d = gd, method = "double selection")

# ---- 2. AJR: rlassoIV, select among high-dim controls, single instrument ----
data(AJR)
ajr_x <- model.matrix(
  ~ -1 + (Latitude + Latitude2 + Africa + Asia + Namer + Samer)^2,
  data = AJR
)
ajr_df <- data.frame(
  GDP = AJR$GDP, Exprop = AJR$Exprop, logMort = AJR$logMort,
  ajr_x, check.names = TRUE
)
write.csv(ajr_df, file.path(here, "hdm_ajr_data.csv"), row.names = FALSE)
ajr <- rlassoIV(
  x = ajr_x, d = AJR$Exprop, y = AJR$GDP, z = AJR$logMort,
  select.X = TRUE, select.Z = FALSE
)

# ---- 3. cps2012: gender wage gap via rlassoEffects (multi-target) -----------
# The full expanded design is ~29,217 x 116 (~27 MB) — too large to bundle. We
# record the published full-sample number here (regenerable, not bundled), and
# bundle a deterministic 800-row subsample that exercises the identical
# multi-target code path at a fixture-friendly size.
data(cps2012)
cps_formula <- ~ -1 + female + female:(widowed + divorced + separated +
  nevermarried + hsd08 + hsd911 + hsg + cg + ad + mw + so + we + exp1 + exp2 +
  exp3) + (widowed + divorced + separated + nevermarried + hsd08 + hsd911 +
  hsg + cg + ad + mw + so + we + exp1 + exp2 + exp3)^2
cps_make_X <- function(df) {
  X <- model.matrix(cps_formula, data = df)
  X[, which(apply(X, 2, var) != 0)]
}

# Full sample: the published gender-gap coefficient (reference only).
cps_Xfull <- cps_make_X(cps2012)
cps_full <- rlassoEffects(
  x = cps_Xfull, y = cps2012$lnw, index = grep("female", colnames(cps_Xfull))
)
cps_full_s <- summary(cps_full)$coefficients

# Deterministic 800-row subsample: the bundled regression fixture.
set.seed(42)
cps_sub <- cps2012[sample(seq_len(nrow(cps2012)), 800), ]
cps_Xsub <- cps_make_X(cps_sub)
cps_sub_ig <- grep("female", colnames(cps_Xsub))
write.csv(
  data.frame(lnw = cps_sub$lnw, cps_Xsub, check.names = TRUE),
  file.path(here, "hdm_cps2012_subsample.csv"), row.names = FALSE
)
cps_sub_s <- summary(rlassoEffects(
  x = cps_Xsub, y = cps_sub$lnw, index = cps_sub_ig
))$coefficients
cps_targets <- lapply(seq_len(nrow(cps_sub_s)), function(i) {
  list(name = rownames(cps_sub_s)[i], coef = cps_sub_s[i, 1], se = cps_sub_s[i, 2])
})

ref <- list(
  meta = list(
    R_version = as.character(getRversion()),
    hdm_version = as.character(packageVersion("hdm")),
    generated = "deterministic; re-run only on contract change",
    sources = list(
      growth = "Barro & Lee growth panel; hdm::GrowthData",
      ajr = "Acemoglu, Johnson & Robinson (2001) AER 91(5):1369-1401; hdm::AJR",
      cps2012 = "U.S. CPS 2012 (March supplement); hdm::cps2012"
    )
  ),
  growth = list(
    n = nrow(GrowthData), n_x = ncol(gX),
    partialling_out = list(coef = g_po$alpha, se = g_po$se),
    double_selection = list(coef = g_ds$alpha, se = g_ds$se)
  ),
  ajr = list(
    n = nrow(AJR), n_x = ncol(ajr_x),
    coef = as.numeric(ajr$coef), se = as.numeric(ajr$se)
  ),
  cps2012 = list(
    full_sample = list(
      n = nrow(cps2012), n_x = ncol(cps_Xfull),
      n_targets = nrow(cps_full_s),
      female_coef = cps_full_s["female", 1],
      female_se = cps_full_s["female", 2],
      note = "published full-sample gender gap; data not bundled (~27 MB expanded)"
    ),
    subsample = list(
      n = 800L, seed = 42L, n_x = ncol(cps_Xsub),
      n_targets = nrow(cps_sub_s), targets = cps_targets
    )
  )
)
writeLines(
  toJSON(ref, auto_unbox = TRUE, digits = 16, pretty = TRUE),
  file.path(here, "rlasso_vignette_R.json")
)
cat("wrote hdm_growth_data.csv, hdm_ajr_data.csv, hdm_cps2012_subsample.csv, rlasso_vignette_R.json\n")
cat(sprintf("Growth PO  %.10f / %.10f\n", g_po$alpha, g_po$se))
cat(sprintf("Growth DS  %.10f / %.10f\n", g_ds$alpha, g_ds$se))
cat(sprintf("AJR        %.10f / %.10f\n", as.numeric(ajr$coef), as.numeric(ajr$se)))
cat(sprintf("cps2012 female (full)  %.10f / %.10f\n", cps_full_s["female", 1], cps_full_s["female", 2]))
cat(sprintf("cps2012 subsample targets: %d\n", nrow(cps_sub_s)))
