# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 George Saliba <george.saliba@salitronic.com>
"""Controlled-impedance trace WIDTH from a target impedance (inverse of the
IPC-2141 / Wadell closed forms).

``pcb_calc_impedance`` answers the forward question -- "what impedance does
this trace width give?". The design-time question is the INVERSE: "I need a
90 ohm USB differential pair (or a 50 ohm single-ended PCIe line); how wide
must the trace be?". Iterating the forward tool by hand is tedious, so this
inverts the same published closed forms algebraically.

The forward formulas (matched exactly to the existing tool so the two
round-trip):

    microstrip  Z0 = 87/sqrt(er+1.41) * ln(5.98 h / (0.8 w + t))
    stripline   Z0 = 60/sqrt(er)      * ln(4 b   / (0.67 pi (0.8 w + t)))
    *_diff      Zdiff = 2 Z0 * k(s/h),
                k = 1 - 0.48 exp(-0.96 s/h)   (microstrip)
                k = 1 - 0.347 exp(-2.9 s/h)   (stripline)

For a differential target the spacing ``s`` fixes the coupling factor ``k``,
so the single-ended Z0 each conductor must hit is ``Zdiff / (2k)``; then the
single-ended formula inverts directly for the width. Closed-form accuracy is
+/- ~10 % (same caveat as the forward tool) -- good for picking a starting
width; a fab field solver refines the real stackup. Pure math, no Altium.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

_OZ_TO_MILS = 1.378
_GEOMETRIES = ("microstrip", "microstrip_diff", "stripline", "stripline_diff")


def _t(copper_oz: float) -> float:
    return copper_oz * _OZ_TO_MILS


def z0_microstrip(width_mils, dielectric_height_mils, dielectric_constant,
                  copper_oz=1.0):
    """Forward IPC-2141 microstrip Z0 (kept for round-trip tests)."""
    t = _t(copper_oz)
    return (87.0 / math.sqrt(dielectric_constant + 1.41)) * \
        math.log(5.98 * dielectric_height_mils / (0.8 * width_mils + t))


def z0_stripline(width_mils, dielectric_height_mils, dielectric_constant,
                 copper_oz=1.0):
    """Forward symmetric-stripline Z0 (kept for round-trip tests)."""
    t = _t(copper_oz)
    return (60.0 / math.sqrt(dielectric_constant)) * \
        math.log(4.0 * dielectric_height_mils /
                 (0.67 * math.pi * (0.8 * width_mils + t)))


def diff_coupling_factor(geometry: str, spacing_mils: float,
                         dielectric_height_mils: float) -> float:
    """The ``k`` in ``Zdiff = 2 Z0 k`` for a differential geometry."""
    sh = spacing_mils / dielectric_height_mils
    if geometry == "microstrip_diff":
        return 1.0 - 0.48 * math.exp(-0.96 * sh)
    return 1.0 - 0.347 * math.exp(-2.9 * sh)


@dataclass(frozen=True)
class ImpedanceWidthResult:
    geometry: str
    target_ohms: float            # the Z0 / Zdiff requested
    single_ended_z0_ohms: float   # the SE Z0 the width must hit
    width_mils: float             # 0.0 when infeasible
    dielectric_height_mils: float
    dielectric_constant: float
    spacing_mils: float
    feasible: bool                # False when the target needs a width <= 0


def trace_width_for_impedance(
    target_ohms: float,
    geometry: str,
    dielectric_height_mils: float,
    *,
    dielectric_constant: float = 4.2,
    copper_oz: float = 1.0,
    spacing_mils: float = 0.0,
) -> ImpedanceWidthResult:
    """Trace width (mils) to hit ``target_ohms`` for the given geometry.

    ``target_ohms`` is the single-ended Z0 for ``microstrip``/``stripline`` or
    the differential Zdiff for the ``*_diff`` geometries. Differential needs
    ``spacing_mils``. Returns ``feasible=False`` (width 0) when the target
    impedance is too low for the stackup (the formula yields a non-positive
    width) -- raise the dielectric height or lower the target.
    """
    geometry = geometry.strip().lower()
    if geometry not in _GEOMETRIES:
        raise ValueError("geometry must be one of " + ", ".join(_GEOMETRIES))
    if target_ohms <= 0:
        raise ValueError("target_ohms must be positive")
    if dielectric_height_mils <= 0 or dielectric_constant <= 0:
        raise ValueError("dielectric height and constant must be positive")
    is_diff = geometry.endswith("_diff")
    if is_diff and spacing_mils <= 0:
        raise ValueError("spacing_mils must be > 0 for differential geometries")

    h = dielectric_height_mils
    er = dielectric_constant
    t = _t(copper_oz)

    if is_diff:
        k = diff_coupling_factor(geometry, spacing_mils, h)
        z0_se = target_ohms / (2.0 * k)
    else:
        z0_se = target_ohms

    if geometry.startswith("microstrip"):
        # 0.8w + t = 5.98 h / exp(Z0 sqrt(er+1.41) / 87)
        denom = 5.98 * h / math.exp(z0_se * math.sqrt(er + 1.41) / 87.0)
    else:
        # 0.8w + t = 4 h / (0.67 pi exp(Z0 sqrt(er) / 60))
        denom = 4.0 * h / (0.67 * math.pi *
                           math.exp(z0_se * math.sqrt(er) / 60.0))
    width = (denom - t) / 0.8
    feasible = width > 0.0
    return ImpedanceWidthResult(
        geometry=geometry, target_ohms=target_ohms, single_ended_z0_ohms=z0_se,
        width_mils=width if feasible else 0.0,
        dielectric_height_mils=h, dielectric_constant=er,
        spacing_mils=spacing_mils, feasible=feasible)


__all__ = [
    "ImpedanceWidthResult",
    "z0_microstrip",
    "z0_stripline",
    "diff_coupling_factor",
    "trace_width_for_impedance",
]
