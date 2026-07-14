"""Geo-experiment ("geo-lift") causal measurement.

Estimates the incremental lift of an intervention switched on in a set of
treated geographies, against a synthetic counterfactual built from the untreated
geographies. See :func:`geolift`.
"""

from __future__ import annotations

from .core import geolift

__all__ = ["geolift"]
