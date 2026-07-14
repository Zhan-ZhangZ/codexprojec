"""Fixed balanced-panel DGP for ``sp.panel`` <-> R ``plm`` parity.

A balanced panel with two regressors that are *correlated with the
entity effect* (so within / between / random-effects estimators give
genuinely different answers and the parity test discriminates between
them).  n_id=60, T=8, n=480.  Seed=20240608.

The true within (FE) slopes are beta_x1=0.80, beta_x2=-0.50; the
between variation is deliberately different so a within vs between
mix-up would fail the test.
"""

from __future__ import annotations

import pathlib

import numpy as np
import pandas as pd

rng = np.random.default_rng(20240608)
n_id, T = 60, 8
ids = np.repeat(np.arange(n_id), T)
years = np.tile(np.arange(T), n_id)
n = len(ids)

# Entity effect, and regressors correlated with it (Mundlak-style):
alpha_i = rng.normal(scale=1.0, size=n_id)
mu_t = rng.normal(scale=0.5, size=T)

# x1 correlates with the entity effect; x2 correlates with time.
x1 = 0.7 * alpha_i[ids] + rng.normal(scale=1.0, size=n)
x2 = 0.5 * mu_t[years] + rng.normal(scale=1.0, size=n)

# True structural model (within slopes 0.8, -0.5).
y = (
    1.0
    + 0.80 * x1
    - 0.50 * x2
    + alpha_i[ids]
    + mu_t[years]
    + rng.normal(scale=0.8, size=n)
)

df = pd.DataFrame({"id": ids, "year": years, "y": y, "x1": x1, "x2": x2})
out = pathlib.Path(__file__).parent / "panel_data.csv"
df.to_csv(out, index=False)
print(f"Wrote {out}  (n={n}, n_id={n_id}, T={T}, beta_x1=0.80, beta_x2=-0.50)")
