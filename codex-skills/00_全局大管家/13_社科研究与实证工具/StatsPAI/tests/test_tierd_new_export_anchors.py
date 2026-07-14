"""Known-truth anchors for public exports newly surfaced through ``__all__``.

These tests are intentionally small deterministic DGPs. They make sure the
agent registry does not expose estimator-like functions without a numerical
guard just because the function already had smoke/API coverage elsewhere.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

import statspai as sp


def test_negative_control_calibrations_recover_linear_coefficients():
    dose = np.linspace(-2.0, 2.0, 80)
    treat = (np.arange(80) % 2).astype(float)
    df = pd.DataFrame(
        {
            "nco": 1.0 + 2.0 * treat,
            "nce": dose,
            "y": 0.5 - 3.0 * dose,
            "treat": treat,
        }
    )

    nco = sp.negative_control_outcome(df, nco="nco", treat="treat")
    nce = sp.negative_control_exposure(df, y="y", nce="nce")

    np.testing.assert_allclose(nco.estimate, 2.0, atol=1e-12)
    np.testing.assert_allclose(nce.estimate, -3.0, atol=1e-12)


def test_double_negative_control_recovers_just_identified_ate():
    n = 80
    z_proxy = np.linspace(-2.0, 2.0, n)
    treat = (np.arange(n) % 2).astype(float)
    nco = 0.2 + 0.7 * z_proxy + 0.1 * treat
    y = 1.0 + 1.75 * treat + 0.5 * nco
    df = pd.DataFrame({"y": y, "d": treat, "z": z_proxy, "w": nco})

    res = sp.double_negative_control(df, y="y", treat="d", nce="z", nco="w")

    np.testing.assert_allclose(res.estimate, 1.75, atol=1e-10)


def test_proximal_regression_recovers_correct_outcome_bridge_ate():
    n = 80
    z_proxy = np.linspace(-2.0, 2.0, n)
    treat = (np.arange(n) % 2).astype(float)
    w_proxy = 0.2 + 0.7 * z_proxy + 0.1 * treat
    y = 1.0 + 2.0 * treat
    df = pd.DataFrame({"y": y, "d": treat, "z": z_proxy, "w": w_proxy})

    res = sp.proximal_regression(df, y="y", treat="d", z_proxy="z", w_proxy="w")

    np.testing.assert_allclose(res.ate, 2.0, atol=1e-10)
    np.testing.assert_allclose(res.bridge_coefs["D"], 2.0, atol=1e-10)


def test_four_way_decomposition_matches_closed_form_components():
    residual = np.repeat(np.linspace(-1.0, 1.0, 50), 2)
    treat = np.tile([0.0, 1.0], 50)
    mediator = 0.5 + 0.4 * treat + residual
    y = 1.0 + 2.0 * treat + 3.0 * mediator + 4.0 * treat * mediator
    df = pd.DataFrame({"y": y, "a": treat, "m": mediator})

    res = sp.four_way_decomposition(df, y="y", treat="a", mediator="m")

    np.testing.assert_allclose(res.cde, 2.0, atol=1e-10)
    np.testing.assert_allclose(res.int_ref, 2.0, atol=1e-10)
    np.testing.assert_allclose(res.int_med, 1.6, atol=1e-10)
    np.testing.assert_allclose(res.pie, 1.2, atol=1e-10)
    np.testing.assert_allclose(res.total_effect, 6.8, atol=1e-10)


def test_rosenbaum_bounds_and_gamma_match_sign_test_binomial_anchor():
    treated = np.array([2.0, 3.0, 4.0, 5.0])
    control = np.array([1.0, 1.0, 1.0, 1.0])

    bounds = sp.rosenbaum_bounds(
        treated,
        control,
        method="sign",
        gamma_grid=[1.0, 2.0],
        alternative="greater",
    )
    gamma = sp.rosenbaum_gamma(
        treated,
        control,
        method="sign",
        gamma_grid=[1.0, 2.0],
        alternative="greater",
    )

    np.testing.assert_allclose(bounds.pvalue_upper, [0.0625, 0.1975308642])
    np.testing.assert_allclose(gamma.pvalue_upper, bounds.pvalue_upper)
    np.testing.assert_allclose(bounds.statistic, 4.0)


def test_its_recovers_segmented_regression_level_and_slope_changes():
    time = np.arange(60, dtype=float)
    intervention = 30
    post = (np.arange(60) >= intervention).astype(float)
    time_post = np.where(post > 0, np.arange(60) - intervention, 0.0)
    y = 10.0 + 0.5 * time + 3.0 * post + 0.2 * time_post
    df = pd.DataFrame({"y": y, "t": time})

    res = sp.its(df, y="y", time="t", intervention=intervention, hac_lag=1)

    np.testing.assert_allclose(res.level_change, 3.0, atol=1e-10)
    np.testing.assert_allclose(res.slope_change, 0.2, atol=1e-10)


def test_llm_dag_oracle_only_preserves_supplied_edges():
    res = sp.llm_dag(
        ["x", "y", "z"],
        oracle=lambda variables, descriptions: [("x", "y"), ("z", "y")],
        merge_strategy="oracle_only",
    )

    assert sorted(res.edges) == [("x", "y"), ("z", "y")]
    np.testing.assert_allclose(len(res.edges), 2)


def test_vcnet_and_scigan_recover_linear_dose_response_contrast():
    rng = np.random.default_rng(0)
    n = 200
    x = rng.normal(size=n)
    treatment = np.linspace(-1.0, 1.0, n)
    y = 2.0 * treatment + 0.1 * x
    df = pd.DataFrame({"y": y, "t": treatment, "x": x})
    grid = [-1.0, 0.0, 1.0]

    vcnet = sp.vcnet(
        df,
        y="y",
        treatment="t",
        covariates=["x"],
        t_grid=grid,
        n_bootstrap=2,
        random_state=1,
        ridge=1e-6,
    )
    scigan = sp.scigan(
        df,
        y="y",
        treatment="t",
        covariates=["x"],
        t_grid=grid,
        propensity_weights=np.ones(n),
        n_bootstrap=2,
        random_state=1,
        ridge=1e-6,
    )

    np.testing.assert_allclose(vcnet.mu_hat[-1] - vcnet.mu_hat[0], 4.0, atol=0.05)
    np.testing.assert_allclose(scigan.mu_hat[-1] - scigan.mu_hat[0], 4.0, atol=0.08)
