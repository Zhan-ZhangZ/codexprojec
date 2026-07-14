#!/usr/bin/env Rscript
# R ``plm`` reference values for sp.panel parity.
#
# plm (Croissant & Millo 2008, JSS) is the canonical R panel-data
# package and the reference Stata's xtreg targets.  sp.panel must
# reproduce plm's within (FE), Swamy-Arora random-effects (RE), and
# between (BE) estimators, including classical and cluster-robust SEs.
#
# Cluster-robust SE convention: plm::vcovHC(type="HC1", cluster="group")
# — the one sp.panel(method="fe", cluster=<entity>) matches.
suppressMessages({
  library(plm)
  library(sandwich)
  library(jsonlite)
})

df <- read.csv("tests/reference_parity/_fixtures/panel_data.csv")
pdf <- pdata.frame(df, index = c("id", "year"))

fe <- plm(y ~ x1 + x2, data = pdf, model = "within")
re <- plm(y ~ x1 + x2, data = pdf, model = "random")
be <- plm(y ~ x1 + x2, data = pdf, model = "between")

fe_co <- coef(fe)
fe_se <- sqrt(diag(vcov(fe)))
fe_cl <- sqrt(diag(vcovHC(fe, type = "HC1", cluster = "group")))
re_co <- coef(re)
re_se <- sqrt(diag(vcov(re)))
be_co <- coef(be)
be_se <- sqrt(diag(vcov(be)))

pack <- function(co, se, names) {
  out <- list()
  for (nm in names) out[[nm]] <- list(coef = unname(co[nm]), se = unname(se[nm]))
  out
}

out <- list(
  meta = list(
    R_version = R.version.string,
    plm_version = as.character(packageVersion("plm")),
    formula = "y ~ x1 + x2",
    index = "c(id, year)",
    cluster = "id (vcovHC HC1, cluster=group)"
  ),
  fe_within = pack(fe_co, fe_se, c("x1", "x2")),
  fe_within_cluster = pack(fe_co, fe_cl, c("x1", "x2")),
  re_swamy_arora = pack(re_co, re_se, c("(Intercept)", "x1", "x2")),
  between = pack(be_co, be_se, c("(Intercept)", "x1", "x2")),
  n_obs = nobs(fe),
  n_entities = length(unique(df$id)),
  n_periods = length(unique(df$year))
)
write_json(out, "tests/reference_parity/_fixtures/panel_R.json",
           pretty = TRUE, auto_unbox = TRUE, digits = NA)
cat(sprintf("FE     x1: coef=%.6f se=%.6f cl=%.6f\n", fe_co["x1"], fe_se["x1"], fe_cl["x1"]))
cat(sprintf("RE     x1: coef=%.6f se=%.6f\n", re_co["x1"], re_se["x1"]))
cat(sprintf("BE     x1: coef=%.6f se=%.6f\n", be_co["x1"], be_se["x1"]))
