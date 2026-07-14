from types import SimpleNamespace

import numpy as np

import statspai as sp


def test_estat_durbin_watson_matches_manual_formula():
    residuals = np.array([1.0, -0.5, 0.25, -0.25, 0.5])
    result = SimpleNamespace(data_info={"residuals": residuals})

    out = sp.estat(result, "dwatson", print_results=False)

    expected = np.sum(np.diff(residuals) ** 2) / np.sum(residuals**2)
    np.testing.assert_allclose(out["statistic"], expected)
    assert out["statistic_label"] == "d"
