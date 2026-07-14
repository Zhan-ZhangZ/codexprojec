"""Tests for the optional augsynth R backend."""

import subprocess

import numpy as np
import pytest

import statspai as sp
from statspai.synth.augsynth import _find_rscript


def test_augsynth_native_matches_reference_fixture():
    result = sp.augsynth(
        sp.datasets.basque_terrorism(),
        outcome="gdppc",
        unit="region",
        time="year",
        treated_unit="Basque Country",
        treatment_time=1970,
        backend="native",
        placebo=False,
    )
    assert np.isclose(result.estimate, -0.362773547553157, rtol=1e-4)
    assert np.isclose(
        result.model_info["pre_treatment_rmse"],
        0.0139615454031586,
        rtol=1e-4,
    )
    assert result.model_info["augmented_weights_can_be_negative"] is True
    assert result.model_info["ridge_lambda"] > 0


def _skip_unless_augsynth_available():
    try:
        rscript = _find_rscript()
    except RuntimeError:
        pytest.skip("Rscript is not installed")
    probe = subprocess.run(
        [
            rscript,
            "-e",
            (
                "quit(status = as.integer("
                "!requireNamespace('augsynth', quietly=TRUE) || "
                "!requireNamespace('jsonlite', quietly=TRUE)))"
            ),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    if probe.returncode != 0:
        pytest.skip("R packages augsynth/jsonlite are not installed")


def test_augsynth_backend_matches_reference_fixture():
    _skip_unless_augsynth_available()
    result = sp.augsynth(
        sp.datasets.basque_terrorism(),
        outcome="gdppc",
        unit="region",
        time="year",
        treated_unit="Basque Country",
        treatment_time=1970,
        backend="augsynth",
    )
    assert np.isclose(result.estimate, -0.362773547553157)
    assert np.isclose(result.model_info["pre_treatment_rmse"], 0.0139615454031586)
    assert result.model_info["backend"] == "augsynth"
    assert result.model_info["n_donors"] == 16


def test_augsynth_rejects_unknown_backend():
    with pytest.raises(ValueError, match="backend"):
        sp.augsynth(
            sp.datasets.basque_terrorism(),
            outcome="gdppc",
            unit="region",
            time="year",
            treated_unit="Basque Country",
            treatment_time=1970,
            backend="unknown",
        )
