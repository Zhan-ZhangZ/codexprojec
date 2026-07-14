# NIST StRD — Linear Least Squares certification datasets

These `.dat` files are the **unmodified** Linear Least Squares Regression
datasets from the U.S. National Institute of Standards and Technology
*Statistical Reference Datasets* (StRD) collection.

- Source: <https://www.itl.nist.gov/div898/strd/lls/lls.shtml>
- Per-dataset files: `https://www.itl.nist.gov/div898/strd/lls/data/LINKS/DATA/<Name>.dat`
- Retrieved: 2026-06-08
- Files are byte-for-byte as published by NIST. Each file embeds, in its ASCII
  header, the **certified** parameter estimates, their standard deviations, the
  residual standard deviation, R², and the ANOVA table. The data rows follow.
  The certified values are computed by NIST in multiple-precision arithmetic and
  rounded to 15 significant digits; they are the single source of truth for the
  parity test — we never hand-transcribe them.

The certified values are read straight out of these headers by
`tests/reference_parity/test_nist_strd_ols.py`. NIST is a U.S. Government work
and is not subject to copyright in the United States.

## The 11 datasets (by difficulty / model)

| File        | n  | Model                         | Difficulty | Notes |
|-------------|----|-------------------------------|------------|-------|
| Norris      | 36 | `y = b0 + b1 x`               | lower      | straight line |
| Pontius     | 40 | `y = b0 + b1 x + b2 x^2`      | lower      | quadratic |
| NoInt1      | 11 | `y = b1 x`                    | average    | no intercept |
| NoInt2      | 3  | `y = b1 x`                    | average    | no intercept |
| Filip       | 82 | degree-10 polynomial          | higher     | `cond(X) ~ 1e10`; normal equations fail outright |
| Longley     | 16 | 6 predictors                  | higher     | the classic Longley (1967) collinearity stress test |
| Wampler1..5 | 21 | degree-5 polynomial           | higher     | true coefficients all 1.0; increasing noise W1→W5 |

Wampler1/2 are exact fits (residual SD = 0, certified F = Infinity).
