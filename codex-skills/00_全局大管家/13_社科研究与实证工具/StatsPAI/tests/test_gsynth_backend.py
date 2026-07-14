"""Tests for the optional gsynth R backend."""

import subprocess

import numpy as np
import pytest

import statspai as sp
from statspai.synth.gsynth import _find_rscript


def test_gsynth_native_matches_reference_fixture():
    result = sp.gsynth(
        sp.datasets.basque_terrorism(),
        outcome="gdppc",
        unit="region",
        time="year",
        treated_unit="Basque Country",
        treatment_time=1970,
        backend="native",
        seed=42,
        placebo=False,
    )
    assert np.isclose(result.estimate, -0.32417115086183, rtol=1e-6)
    assert np.isclose(
        result.model_info["pre_treatment_rmse"],
        0.043094139385699,
        rtol=1e-6,
    )
    assert result.model_info["n_factors"] == 1
    assert result.model_info["backend"] == "native"


def _skip_unless_gsynth_available():
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
                "!requireNamespace('gsynth', quietly=TRUE) || "
                "!requireNamespace('jsonlite', quietly=TRUE)))"
            ),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    if probe.returncode != 0:
        pytest.skip("R packages gsynth/jsonlite are not installed")


def test_gsynth_backend_matches_reference_fixture():
    _skip_unless_gsynth_available()
    result = sp.gsynth(
        sp.datasets.basque_terrorism(),
        outcome="gdppc",
        unit="region",
        time="year",
        treated_unit="Basque Country",
        treatment_time=1970,
        backend="gsynth",
        seed=42,
    )
    assert np.isclose(result.estimate, -0.32417115086183)
    assert result.model_info["n_factors"] == 1
    assert np.isclose(result.model_info["pre_treatment_rmse"], 0.043094139385699)
    assert result.model_info["backend"] == "gsynth"


def test_gsynth_rejects_unknown_backend():
    with pytest.raises(ValueError, match="backend"):
        sp.gsynth(
            sp.datasets.basque_terrorism(),
            outcome="gdppc",
            unit="region",
            time="year",
            treated_unit="Basque Country",
            treatment_time=1970,
            backend="unknown",
        )
