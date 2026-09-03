# Data provenance — NSW re74 subsample

Downloaded **2026-08-27**, unmodified, from Rajeev Dehejia's public data page:

| File | URL | SHA-256 | Bytes | Rows |
|---|---|---|---|---|
| `nswre74_treated.txt` | <https://users.nber.org/~rdehejia/data/nswre74_treated.txt> | `e7b742fe0ff07a0f45e129b4ff108bb9611cd83d53604732c48a8a0a3e20eda3` | 29,785 | 185 |
| `nswre74_control.txt` | <https://users.nber.org/~rdehejia/data/nswre74_control.txt> | `a1364cea459d953dc691a667d99194b4ad335d6d550354fe23a5d2dc58d729b5` | 41,860 | 260 |

Re-verify at any time:

```bash
shasum -a 256 demo-notebooks/nsw-lalonde-1986/data/*.txt
```

## What these are

The **experimental** arms of the National Supported Work (NSW) demonstration,
restricted to the subsample with 1974 earnings observed — the "re74 subsample"
of Dehejia & Wahba (1999). 185 treated men, 260 randomized controls.

This is the randomized comparison. It is *not* the same as the composite file
[`../../\_lalonde_data.csv`](../../_lalonde_data.csv), whose 429 controls are a
PSID-1 comparison group rather than the experiment's controls. Both share the
identical 185 treated men, which is what makes the two estimates comparable —
[`../replicate_nsw.py`](../replicate_nsw.py) verifies that rather than assuming
it.

## Column order

The files are whitespace-delimited with no header, in this order:

```
treat  age  education  black  hispanic  married  nodegree  re74  re75  re78
```

Earnings (`re74`, `re75`, `re78`) are in nominal dollars for the calendar year.

## Sources

- LaLonde, Robert J. (1986). "Evaluating the Econometric Evaluations of
  Training Programs with Experimental Data." *American Economic Review* 76(4),
  604–620.
- Dehejia, Rajeev H. and Sadek Wahba (1999). "Causal Effects in Nonexperimental
  Studies: Reevaluating the Evaluation of Training Programs." *Journal of the
  American Statistical Association* 94(448), 1053–1062.

These extracts have been redistributed for methodological research for over two
decades (they ship inside R's `MatchIt`, `cobalt` and `causalsens`, among
others). They are vendored here for the same reason the Card & Krueger survey
file is: a replication that requires a download is not reproducible from a
clean checkout.
