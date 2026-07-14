"""Coverage campaign — ``sp.iv.iv_diag`` bundle and ``iv_compare``.

Part of the core-module ≥95% coverage initiative
(see ``.coverage_campaign/CAMPAIGN.md``). Targets the previously-uncovered
formatting / export branches of ``IVDiagResult`` (``to_frame``, ``summary``,
``to_latex/excel/word``, ``plot``), the wild/cluster bootstrap path, the
Blandhol–Słoczyński TSLS-vs-LATE caveat logic, and the ``iv_compare`` endog-name
fallbacks in ``statspai/iv/iv_diag.py``.

Assertions check real numerical/structural properties (finite point estimate,
caveat firing exactly under binary-endog-with-covariates, ordered CIs, one
result row per estimator), not bare smoke calls.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

import statspai as sp


@pytest.fixture(scope="module")
def binary_endog_iv():
    """Binary endogenous regressor + instrument + covariate + cluster id.

    This is exactly the spec that triggers the BBMT/Słoczyński caveat.
    """
    rng = np.random.default_rng(3)
    n = 600
    z = rng.standard_normal(n)
    x = rng.standard_normal(n)
    g = rng.integers(0, 30, n)  # cluster id
    v = rng.standard_normal(n)
    d = ((0.9 * z + 0.3 * x - 0.4 * v) > 0).astype(float)
    y = 1.0 + 1.2 * d + 0.5 * x + 0.6 * v + rng.standard_normal(n)
    return pd.DataFrame({"y": y, "d": d, "z": z, "x": x, "g": g})


@pytest.fixture(scope="module")
def continuous_endog_iv():
    rng = np.random.default_rng(4)
    n = 500
    z1 = rng.standard_normal(n)
    z2 = rng.standard_normal(n)
    x = rng.standard_normal(n)
    u = rng.standard_normal(n)
    d = 0.7 * z1 + 0.5 * z2 + 0.3 * x + 0.6 * u + 0.5 * rng.standard_normal(n)
    y = 1.0 + 2.0 * d + 0.4 * x + u + rng.standard_normal(n)
    return pd.DataFrame({"y": y, "d": d, "z1": z1, "z2": z2, "x": x})


# ─── Full diagnostic bundle ──────────────────────────────────────────────


@pytest.fixture(scope="module")
def full_diag_result(binary_endog_iv):
    return sp.iv.iv_diag(
        binary_endog_iv,
        y="y",
        endog="d",
        instruments=["z"],
        exog=["x"],
        cluster="g",
        n_boot=120,
        boot_methods=("pairs", "wild"),
        include_clr_ci=True,
        include_k_ci=True,
        grid_size=51,
        ltz_gamma_sd=0.05,
        random_state=1,
    )


def test_iv_diag_full_bundle_fields(full_diag_result):
    r = full_diag_result
    assert np.isfinite(r.beta_2sls)
    # cluster + both bootstraps populated
    assert np.isfinite(r.bootstrap_se_pairs)
    assert np.isfinite(r.bootstrap_se_wild)
    assert r.bootstrap_n > 0
    # analytic Wald CI brackets the point estimate
    lo, hi = r.ci_analytic_2sls
    assert lo <= r.beta_2sls <= hi
    # AR / CLR / K confidence sets present and ordered when finite
    for ci in (r.ar_ci, r.clr_ci, r.k_ci, r.ltz_ci):
        if ci is not None and all(np.isfinite(v) for v in ci):
            assert ci[0] <= ci[1]
    # caveat MUST fire: binary endog + covariate
    assert r.tsls_late_caveat is not None
    assert "LATE" in r.tsls_late_caveat


def test_iv_diag_exports(full_diag_result, tmp_path):
    r = full_diag_result
    frame = r.to_frame()
    assert isinstance(frame, pd.DataFrame) and len(frame) > 0
    txt = r.summary()
    assert isinstance(txt, str) and "2SLS" in txt
    latex = r.to_latex(caption="IV diagnostic bundle")
    assert isinstance(latex, str) and "\\" in latex
    # Optional-dependency exports: exercise if the writer is installed.
    try:
        r.to_excel(str(tmp_path / "diag.xlsx"))
        assert (tmp_path / "diag.xlsx").exists()
    except ImportError:
        pass
    try:
        r.to_word(str(tmp_path / "diag.docx"), title="IV diag")
        assert (tmp_path / "diag.docx").exists()
    except ImportError:
        pass


def test_iv_diag_plot(full_diag_result):
    pytest.importorskip("matplotlib")
    import matplotlib

    matplotlib.use("Agg")
    ax_or_fig = full_diag_result.plot(kind="diagnostic")
    assert ax_or_fig is not None


# ─── Caveat logic edge cases ─────────────────────────────────────────────


def test_caveat_absent_without_covariates(binary_endog_iv):
    r = sp.iv.iv_diag(binary_endog_iv, y="y", endog="d", instruments=["z"], n_boot=0)
    assert r.tsls_late_caveat is None


def test_caveat_absent_for_continuous_endog(continuous_endog_iv):
    r = sp.iv.iv_diag(
        continuous_endog_iv,
        y="y",
        endog="d",
        instruments=["z1", "z2"],
        exog=["x"],
        n_boot=0,
    )
    assert r.tsls_late_caveat is None


def test_caveat_absent_for_binary_non01(binary_endog_iv):
    # Recode the binary endog to {1, 2}: still two-valued but not {0,1},
    # so the caveat must NOT fire (exercises the issubset guard).
    df = binary_endog_iv.copy()
    df["d"] = df["d"] + 1.0
    r = sp.iv.iv_diag(df, y="y", endog="d", instruments=["z"], exog=["x"], n_boot=0)
    assert r.tsls_late_caveat is None


def test_iv_diag_unknown_bootstrap_method_raises(continuous_endog_iv):
    with pytest.raises(ValueError):
        sp.iv.iv_diag(
            continuous_endog_iv,
            y="y",
            endog="d",
            instruments=["z1", "z2"],
            n_boot=20,
            boot_methods=("definitely_not_a_bootstrap",),
        )


# ─── iv_compare ──────────────────────────────────────────────────────────


def test_iv_compare_multi_estimator_table(continuous_endog_iv):
    out = sp.iv.iv_compare(
        formula="y ~ (d ~ z1 + z2) + x",
        data=continuous_endog_iv,
        methods=("2sls", "liml", "fuller", "jive"),
    )
    assert isinstance(out, pd.DataFrame)
    assert len(out) == 4
    for col in ("method", "estimate", "SE", "CI lower", "CI upper"):
        assert col in out.columns
    # at least the consistent k-class estimators recover beta≈2
    est = pd.to_numeric(out["estimate"], errors="coerce").dropna()
    assert ((est - 2.0).abs() < 1.0).any()


def test_iv_compare_with_explicit_endog_name(continuous_endog_iv):
    out = sp.iv.iv_compare(
        formula="y ~ (d ~ z1 + z2) + x",
        data=continuous_endog_iv,
        methods=("2sls",),
        endog_name="d",
    )
    assert len(out) == 1
    assert np.isfinite(pd.to_numeric(out["estimate"], errors="coerce").iloc[0])
