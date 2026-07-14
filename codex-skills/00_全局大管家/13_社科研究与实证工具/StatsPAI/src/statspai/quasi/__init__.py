"""Lightweight pre/post quasi-experimental designs.

These wrap StatsPAI's OLS machinery into named, assumption-surfacing designs so
non-experts reach for the right estimator:

- :func:`ancova` — covariate-adjusted comparison of group means.
- :func:`negd` — pre/post non-equivalent group design (ANCOVA or change-score).

Both return the unified :class:`~statspai.core.results.CausalResult`.
"""

from __future__ import annotations

from .ancova import ancova, negd

__all__ = ["ancova", "negd"]
