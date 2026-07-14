# NIST StRD — Linear Least Squares reference datasets

These are the **11 Linear Least Squares (LLS) certified datasets** from the
NIST Statistical Reference Datasets (StRD) collection, used to validate the
numerical accuracy of statistical software against certified reference values.

## Provenance

- **Source**: NIST/ITL Statistical Reference Datasets, Linear Least Squares.
- **URL**: <https://www.itl.nist.gov/div898/strd/lls/lls.shtml>
  (data files: `https://www.itl.nist.gov/div898/strd/lls/data/LINKS/DATA/<name>.dat`)
- **Fetched**: 2026-06-08, verbatim, unmodified.
- **License**: U.S. Government work, public domain — free to redistribute.

Each `.dat` file is the original NIST ASCII file. It contains, in one place,
both the **certified values** (parameter estimates, their standard
deviations, the residual standard deviation, and R-squared, all to ~15
significant digits) and the **data**. The test parser reads both from the
file, so the certified numbers are never transcribed by hand — this keeps the
suite consistent with StatsPAI's zero-fabrication policy for reference values.

## The 11 datasets (by NIST difficulty level)

| Dataset   | Model                         | Params | Difficulty |
| --------- | ----------------------------- | ------ | ---------- |
| Norris    | linear, intercept             | 2      | Lower      |
| Pontius   | quadratic, intercept          | 3      | Lower      |
| NoInt1    | linear, **no intercept**      | 1      | Average    |
| NoInt2    | linear, **no intercept**      | 1      | Average    |
| Longley   | multiple (6 predictors)       | 7      | Higher     |
| Wampler1  | degree-5 poly (exact fit)     | 6      | Higher     |
| Wampler2  | degree-5 poly (exact fit)     | 6      | Higher     |
| Wampler3  | degree-5 poly                 | 6      | Higher     |
| Wampler4  | degree-5 poly                 | 6      | Higher     |
| Wampler5  | degree-5 poly (ill-cond.)     | 6      | Higher     |
| Filip     | degree-10 poly (ill-cond.)    | 11     | Higher     |

Wampler1 and Wampler2 are *exact-fit* designs: the certified residual standard
deviation is exactly 0 and all certified standard errors are 0, so the test
checks the coefficient estimates and asserts a near-zero residual instead of a
(meaningless) relative error on a zero standard error.

## How it is used

`tests/test_nist_strd_linear.py` fits each dataset through the public
`sp.regress` API and reports the **log relative error (LRE)** — the NIST-
standard accuracy metric, `LRE = -log10(|computed - certified| / |certified|)`
— for every coefficient, standard error, and the residual standard deviation.
Per-dataset LRE floors are set by difficulty tier with comfortable headroom
over the observed double-precision accuracy, so the test catches a real
numerical regression (e.g. reverting the QR solve to normal equations, which
squares the condition number and roughly halves the accurate digits on the
ill-conditioned rows) without being brittle to platform float differences.
