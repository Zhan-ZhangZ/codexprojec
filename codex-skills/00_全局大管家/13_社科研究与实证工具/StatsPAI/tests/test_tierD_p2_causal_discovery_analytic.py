"""Tier D P2 known-truth upgrades — constraint-based causal discovery.

Part of the P1/P2 "Tier D analytic special-cases" campaign (see
``.tierd_campaign/CAMPAIGN.md``). Both were graded ``weak`` by
``scripts/tierd_classify.py``. The anchor is structure recovery on
linear-Gaussian DGPs with a *known* graph:

    sp.pc_algorithm  recovers the skeleton (a chain drops the non-adjacent
                     edge via conditional independence) and orients a collider
                     (X -> Z <- Y).
    sp.fci           recovers the same v-structure skeleton.

Purely additive — no estimator numerics changed (campaign red line).
"""

import numpy as np
import pandas as pd

import statspai as sp


def _collider(seed=0, n=5000):
    # X -> Z <- Y, with X _||_ Y marginally.
    rng = np.random.default_rng(seed)
    x = rng.normal(0, 1, n)
    y = rng.normal(0, 1, n)
    z = x + y + rng.normal(0, 0.5, n)
    return pd.DataFrame({"X": x, "Y": y, "Z": z})


def _chain(seed=1, n=8000):
    # X -> Y -> Z, with X _||_ Z | Y (well-separated links for CI-test power).
    rng = np.random.default_rng(seed)
    x = rng.normal(0, 1, n)
    y = x + rng.normal(0, 1.0, n)
    z = y + rng.normal(0, 1.0, n)
    return pd.DataFrame({"X": x, "Y": y, "Z": z})


# ---------------------------------------------------------------------------
# sp.pc_algorithm
# ---------------------------------------------------------------------------
class TestPCAlgorithmAnalytic:

    def test_recovers_collider_skeleton(self):
        sk = sp.pc_algorithm(_collider(), alpha=0.05)["skeleton"]
        assert sk.loc["X", "Z"] == 1 and sk.loc["Y", "Z"] == 1
        assert sk.loc["X", "Y"] == 0  # X _||_ Y -> no adjacency

    def test_orients_the_collider(self):
        cpdag = sp.pc_algorithm(_collider(), alpha=0.05)["cpdag"]
        # Both arrowheads point into Z; Z points back to neither parent.
        assert cpdag.loc["X", "Z"] == 1 and cpdag.loc["Z", "X"] == 0
        assert cpdag.loc["Y", "Z"] == 1 and cpdag.loc["Z", "Y"] == 0

    def test_chain_drops_non_adjacent_edge(self):
        sk = sp.pc_algorithm(_chain(), alpha=0.05)["skeleton"]
        assert sk.loc["X", "Y"] == 1 and sk.loc["Y", "Z"] == 1
        assert sk.loc["X", "Z"] == 0  # X _||_ Z | Y removes the edge


# ---------------------------------------------------------------------------
# sp.fci
# ---------------------------------------------------------------------------
class TestFCIAnalytic:

    def test_recovers_collider_skeleton(self):
        sk = sp.fci(_collider(), alpha=0.05).skeleton
        sk = (
            pd.DataFrame(np.asarray(sk), index=["X", "Y", "Z"], columns=["X", "Y", "Z"])
            if not hasattr(sk, "loc")
            else sk
        )
        assert sk.loc["X", "Z"] != 0 and sk.loc["Y", "Z"] != 0
        assert sk.loc["X", "Y"] == 0
