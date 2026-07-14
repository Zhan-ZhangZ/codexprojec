"""Tier D P2 known-truth upgrades — proximal frontiers.

Part of the P1/P2 "Tier D analytic special-cases" campaign (see
``.tierd_campaign/CAMPAIGN.md``). These public endpoints were graded
``weak`` by ``scripts/tierd_classify.py`` because existing coverage only
checked smoke/range behavior:

    sp.pci_mtp             recovers a linear modified-treatment-policy shift
                           effect, including sign and zero-delta behavior.
    sp.fortified_pci       recovers a known ATE when both bridge/outcome
                           working models are correctly specified.
    sp.bidirectional_pci   recovers the same known ATE when the Z-side
                           propensity model is correctly specified.
    sp.select_pci_proxies  ranks role-specific proxy signal above noise.

Purely additive — no estimator numerics changed (campaign red line).
"""

import numpy as np
import pandas as pd
from scipy.special import expit

import statspai as sp


def _continuous_mtp_dgp(seed=0, n=3000, tau=2.0):
    rng = np.random.default_rng(seed)
    d = rng.normal(size=n)
    z = rng.normal(size=n)
    x = rng.normal(size=n)
    w = 0.9 * z + 0.2 * x + rng.normal(scale=0.25, size=n)
    y = 1.0 + tau * d + 0.8 * w + 0.4 * x + rng.normal(scale=0.15, size=n)
    return pd.DataFrame({"y": y, "d": d, "z": z, "w": w, "x": x})


def _binary_proxy_dgp(seed=1, n=4500, tau=2.0):
    rng = np.random.default_rng(seed)
    u = rng.normal(size=n)
    x = rng.normal(size=n)
    z = u + rng.normal(scale=0.25, size=n)
    w = u + rng.normal(scale=0.25, size=n)
    p = expit(0.9 * z + 0.35 * x)
    d = rng.binomial(1, p)
    y = 0.5 + tau * d + 0.75 * w + 0.35 * x + rng.normal(scale=0.20, size=n)
    return pd.DataFrame({"y": y, "d": d, "z": z, "w": w, "x": x})


def _proxy_selector_dgp(seed=2, n=2000, tau=1.5):
    rng = np.random.default_rng(seed)
    x = rng.normal(size=n)
    z_good = rng.normal(size=n)
    p = expit(1.4 * z_good + 0.3 * x)
    d = rng.binomial(1, p)
    w_good = rng.normal(size=n)
    noise_z = rng.normal(size=n)
    noise_w = rng.normal(size=n)
    y = 0.2 + tau * d + 1.1 * w_good + 0.4 * x + rng.normal(scale=0.2, size=n)
    return pd.DataFrame(
        {
            "y": y,
            "d": d,
            "x": x,
            "z_good": z_good,
            "w_good": w_good,
            "noise_z": noise_z,
            "noise_w": noise_w,
        }
    )


class TestPCIMTPAnalytic:

    def test_shift_effect_equals_linear_bridge_slope_times_delta(self):
        res = sp.pci_mtp(
            _continuous_mtp_dgp(),
            y="y",
            treat="d",
            proxy_z=["z"],
            proxy_w=["w"],
            covariates=["x"],
            delta=0.75,
            n_boot=8,
            seed=11,
        )
        assert abs(res.estimate - 1.5) < 0.03
        assert res.model_info["delta"] == 0.75

    def test_delta_sign_and_zero_are_coherent(self):
        df = _continuous_mtp_dgp()
        neg = sp.pci_mtp(
            df,
            y="y",
            treat="d",
            proxy_z=["z"],
            proxy_w=["w"],
            covariates=["x"],
            delta=-1.25,
            n_boot=8,
            seed=11,
        )
        zero = sp.pci_mtp(
            df,
            y="y",
            treat="d",
            proxy_z=["z"],
            proxy_w=["w"],
            covariates=["x"],
            delta=0.0,
            n_boot=8,
            seed=11,
        )
        assert abs(neg.estimate + 2.5) < 0.04
        assert zero.estimate == 0.0


class TestPCIFrontierATEAnalytic:

    def test_fortified_pci_recovers_known_ate(self):
        res = sp.fortified_pci(
            _binary_proxy_dgp(),
            y="y",
            treat="d",
            proxy_z=["z"],
            proxy_w=["w"],
            covariates=["x"],
            n_boot=8,
            seed=12,
        )
        assert abs(res.estimate - 2.0) < 0.05
        assert res.model_info["estimator"] == "fortified_pci"

    def test_bidirectional_pci_recovers_known_ate(self):
        res = sp.bidirectional_pci(
            _binary_proxy_dgp(),
            y="y",
            treat="d",
            proxy_z=["z"],
            proxy_w=["w"],
            covariates=["x"],
            n_boot=8,
            seed=12,
        )
        assert abs(res.estimate - 2.0) < 0.05
        assert res.model_info["estimator"] == "bidirectional_pci"


class TestPCIProxySelectorAnalytic:

    def test_ranks_role_specific_signal_above_noise(self):
        res = sp.select_pci_proxies(
            _proxy_selector_dgp(),
            y="y",
            treat="d",
            candidates=["z_good", "w_good", "noise_z", "noise_w"],
            covariates=["x"],
            top_k=1,
        )
        assert isinstance(res, sp.ProxyScoreResult)
        assert res.recommended_z == ["z_good"]
        assert res.recommended_w == ["w_good"]
        assert res.z_candidates.iloc[0]["score_z"] > 0.4
        assert res.w_candidates.iloc[0]["score_w"] > 0.7
        assert abs(float(res.z_candidates.iloc[0]["score_z"]) - 0.4599) < 0.03
        assert abs(float(res.w_candidates.iloc[0]["score_w"]) - 0.7680) < 0.03
