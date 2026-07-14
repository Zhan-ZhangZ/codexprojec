"""Regression tests for the 2026-06 ``__all__`` / registry drift repair.

Thirty estimators (plus their result classes) were eagerly importable as
``sp.<name>`` yet absent from ``statspai.__all__``.  Because the registry
auto-pass walks ``__all__``, every one of them was invisible to
``sp.list_functions`` / ``sp.describe_function`` / ``sp.function_schema`` — a
direct violation of the agent-native contract that the help tools must
resolve for *every* public symbol.  They are now in ``__all__``.

This suite pins two things so the repair cannot silently regress:

1. **Discoverability** — every newly-exposed estimator resolves through all
   three agent-native help entry points, and the proximal / negative-control /
   off-policy / dose-response estimators that gained hand-written agent-native
   cards expose their assumptions + failure modes.

2. **Correctness-by-construction** — the previously-untested estimators in the
   proximal, negative-control and mediation families recover the right answer
   on a DGP whose truth is known analytically, so "discoverable" also means
   "trustworthy".  Naive comparisons (confounded OLS) are included so the test
   would fail if an estimator silently stopped de-biasing.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

import statspai as sp

# Functions moved into ``__all__`` by the drift repair.  Result classes are
# covered separately by ``tests/test_api_surface_consistency.py``.
NEWLY_EXPOSED = [
    "bcf_factor_exposure",
    "bcf_longitudinal",
    "bcf_ordinal",
    "direct_method",
    "dl_propensity_score",
    "double_negative_control",
    "doubly_robust",
    "four_way_decomposition",
    "harvest_did",
    "inward_outward_spillover",
    "ips",
    "its",
    "llm_causal_assess",
    "llm_dag",
    "ltmle",
    "negative_control_exposure",
    "negative_control_outcome",
    "network_hte",
    "overlap_weighted_did",
    "pairwise_causal_benchmark",
    "proximal_regression",
    "rosenbaum_bounds",
    "rosenbaum_gamma",
    "scigan",
    "shift_share_political",
    "shift_share_political_panel",
    "snips",
    "synth_experimental_design",
    "vcnet",
]

# The subset that received hand-written agent-native cards in the same repair.
CARDED = [
    "double_negative_control",
    "proximal_regression",
    "negative_control_exposure",
    "negative_control_outcome",
    "ips",
    "snips",
    "doubly_robust",
    "direct_method",
    "ltmle",
    "vcnet",
    "scigan",
]


class TestDiscoverability:
    """The three agent-native help entry points must resolve for each name."""

    @pytest.mark.parametrize("name", NEWLY_EXPOSED)
    def test_listed(self, name):
        assert (
            name in sp.list_functions()
        ), f"{name} ships on sp.{name} but is missing from list_functions()"

    @pytest.mark.parametrize("name", NEWLY_EXPOSED)
    def test_describe_resolves(self, name):
        desc = sp.describe_function(name)
        assert isinstance(desc, dict) and desc.get("name") == name

    @pytest.mark.parametrize("name", NEWLY_EXPOSED)
    def test_schema_resolves(self, name):
        schema = sp.function_schema(name)
        assert isinstance(schema, dict)
        assert schema.get("name") == name
        assert "parameters" in schema

    @pytest.mark.parametrize("name", NEWLY_EXPOSED)
    def test_callable_on_top_level(self, name):
        assert callable(getattr(sp, name))

    @pytest.mark.parametrize("name", CARDED)
    def test_agent_native_cards_present(self, name):
        desc = sp.describe_function(name)
        assert desc["assumptions"], f"{name} lost its assumptions card"
        assert desc["failure_modes"], f"{name} lost its failure-mode card"
        assert desc["alternatives"], f"{name} lost its alternatives card"


# --------------------------------------------------------------------------- #
# Correctness-by-construction
# --------------------------------------------------------------------------- #


@pytest.fixture(scope="module")
def proxy_confounded():
    """Hidden-confounder DGP with two negative controls and two PCI proxies.

    ``U`` is unobserved and drives both treatment ``D`` and outcome ``Y``;
    naive OLS of Y on D is biased upward.  ``NCE``/``NCO`` are valid negative
    controls (proxies of U that satisfy the exclusion restrictions) and
    ``Z``/``W`` are proximal treatment/outcome proxies.  True ATE = 1.5.
    """
    rng = np.random.default_rng(20260617)
    n = 4000
    U = rng.normal(size=n)
    X = rng.normal(size=n)
    D = (0.7 * U + 0.3 * X + rng.normal(size=n) > 0).astype(int)
    NCE = 0.8 * U + rng.normal(size=n) * 0.5
    NCO = 0.8 * U + rng.normal(size=n) * 0.5
    Z = 0.7 * U + rng.normal(size=n) * 0.5
    W = 0.7 * U + rng.normal(size=n) * 0.5
    Y = 1.5 * D + 1.0 * U + 0.5 * X + rng.normal(size=n)
    df = pd.DataFrame(dict(Y=Y, D=D, X=X, NCE=NCE, NCO=NCO, Z=Z, W=W))
    naive = np.polyfit(df["D"], df["Y"], 1)[0]  # confounded slope > 1.5
    return df, naive


class TestProximalNegativeControl:
    TRUE_ATE = 1.5

    def test_naive_ols_is_confounded(self, proxy_confounded):
        """Sanity: the un-adjusted slope is biased away from the truth, so a
        passing de-biased estimate below is a real correction, not luck."""
        _, naive = proxy_confounded
        assert naive > self.TRUE_ATE + 0.15

    def test_double_negative_control_recovers_ate(self, proxy_confounded):
        df, _ = proxy_confounded
        r = sp.double_negative_control(
            df, y="Y", treat="D", nce="NCE", nco="NCO", covariates=["X"]
        )
        assert abs(r.estimate - self.TRUE_ATE) < 0.4

    def test_proximal_regression_recovers_ate(self, proxy_confounded):
        df, _ = proxy_confounded
        r = sp.proximal_regression(
            df, y="Y", treat="D", z_proxy="Z", w_proxy="W", covariates=["X"]
        )
        assert abs(r.ate - self.TRUE_ATE) < 0.5

    def test_nco_detects_residual_confounding(self, proxy_confounded):
        """A non-zero NCO-treatment association flags the hidden confounder."""
        df, _ = proxy_confounded
        r = sp.negative_control_outcome(df, nco="NCO", treat="D")
        assert abs(r.estimate) > 0.1
        assert r.pvalue < 0.05

    def test_nco_clean_rct_shows_no_confounding(self):
        """Boundary: with randomised treatment the NCO calibration is null."""
        rng = np.random.default_rng(7)
        n = 4000
        U = rng.normal(size=n)
        D = rng.integers(0, 2, size=n)  # randomised, independent of U
        NCO = 0.8 * U + rng.normal(size=n) * 0.5  # unrelated to D
        df = pd.DataFrame(dict(NCO=NCO, D=D))
        r = sp.negative_control_outcome(df, nco="NCO", treat="D")
        assert abs(r.estimate) < 0.1


class TestFourWayDecomposition:
    """VanderWeele four-way: TE = CDE + INT_ref + INT_med + PIE.

    Clean (unconfounded, no D*M interaction) DGP:
        D ~ Bernoulli(0.5);  M = 0.5 D + 0.3 X + e;  Y = D + 0.8 M + 0.2 X + e
    so CDE = 1.0, PIE = 0.8 * 0.5 = 0.4, both interactions = 0, total = 1.4.
    """

    @pytest.fixture(scope="class")
    def fit(self):
        rng = np.random.default_rng(101)
        n = 6000
        X = rng.normal(size=n)
        D = rng.integers(0, 2, size=n)
        M = 0.5 * D + 0.3 * X + rng.normal(size=n) * 0.5
        Y = 1.0 * D + 0.8 * M + 0.2 * X + rng.normal(size=n) * 0.5
        df = pd.DataFrame(dict(Y=Y, D=D, M=M, X=X))
        return sp.four_way_decomposition(
            df, y="Y", treat="D", mediator="M", covariates=["X"]
        )

    def test_controlled_direct_effect(self, fit):
        assert abs(fit.cde - 1.0) < 0.2

    def test_pure_indirect_effect(self, fit):
        assert abs(fit.pie - 0.4) < 0.2

    def test_interactions_vanish_without_interaction_term(self, fit):
        assert abs(fit.int_ref) < 0.15
        assert abs(fit.int_med) < 0.15

    def test_components_sum_to_total_effect(self, fit):
        total = fit.cde + fit.int_ref + fit.int_med + fit.pie
        assert abs(total - 1.4) < 0.3


class TestRosenbaumBounds:
    """Defining property: at Gamma=1 the bounds coincide; the worst-case
    (upper) p-value is monotone non-decreasing in Gamma."""

    @pytest.fixture(scope="class")
    def fit(self):
        rng = np.random.default_rng(55)
        n = 300
        treated = rng.normal(0.8, 1.0, n)  # treated systematically higher
        control = rng.normal(0.0, 1.0, n)
        return sp.rosenbaum_bounds(treated, control, gamma_grid=[1.0, 1.5, 2.0, 3.0])

    def test_bounds_coincide_at_gamma_one(self, fit):
        grid = list(fit.gamma_grid)
        i = grid.index(1.0)
        assert abs(fit.pvalue_lower[i] - fit.pvalue_upper[i]) < 1e-6

    def test_upper_pvalue_monotone_in_gamma(self, fit):
        up = np.asarray(fit.pvalue_upper, dtype=float)
        assert np.all(np.diff(up) >= -1e-9)

    def test_lower_pvalue_monotone_in_gamma(self, fit):
        lo = np.asarray(fit.pvalue_lower, dtype=float)
        assert np.all(np.diff(lo) <= 1e-9)


class TestOffPolicyEvaluationSmoke:
    """The four top-level OPE estimators run and return a finite OPEResult."""

    @pytest.fixture(scope="class")
    def bandit(self):
        rng = np.random.default_rng(3)
        n, k = 1500, 3
        X = rng.normal(size=(n, 2))
        A = rng.integers(0, k, size=n)
        R = rng.normal(size=n) + (A == 1) * 1.0
        pi_target = rng.dirichlet(np.ones(k), size=n)
        return X, A, R, pi_target

    @pytest.mark.parametrize("name", ["ips", "snips", "doubly_robust", "direct_method"])
    def test_runs_and_is_finite(self, name, bandit):
        X, A, R, pi_target = bandit
        r = getattr(sp, name)(X, A, R, pi_target)
        assert isinstance(r, sp.OPEResult)
        assert np.isfinite(r.value)
