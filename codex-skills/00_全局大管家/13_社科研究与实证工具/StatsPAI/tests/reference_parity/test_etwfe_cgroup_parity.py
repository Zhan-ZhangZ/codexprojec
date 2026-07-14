"""Reference parity: ``sp.etwfe`` control-group semantics vs R/Stata.

Pins the public ``cgroup`` contract on the real ``did::mpdta`` panel.  R
``etwfe(cgroup="notyet")`` and Stata ``jwdid`` agree on the default simple ATT;
R ``etwfe(cgroup="never")`` agrees with the never-treated control estimand.
"""

from __future__ import annotations

import pathlib

import pandas as pd
import pytest

from statspai.did import etwfe

_ROOT = pathlib.Path(__file__).resolve().parents[2]
_MPDTA = _ROOT / "tests" / "orig_parity" / "data" / "02_mpdta_original.csv"

# R etwfe 0.6.2 on did::mpdta; Stata jwdid agrees with NOTYET to ~2e-8.
R_ETWFE_NOTYET = -0.0477099182784519
R_ETWFE_NEVER = -0.0399512751551772


@pytest.fixture(scope="module")
def mpdta():
    return pd.read_csv(_MPDTA)


def test_etwfe_default_notyet_matches_r_etwfe_and_stata_jwdid(mpdta):
    res = etwfe(
        mpdta,
        y="lemp",
        group="countyreal",
        time="year",
        first_treat="first_treat",
        cluster="countyreal",
    )
    assert res.model_info["cgroup"] == "notyet"
    assert res.model_info["headline_weighting"] == "treated_observations"
    assert res.estimate == pytest.approx(R_ETWFE_NOTYET, abs=5e-8)


def test_etwfe_nevertreated_matches_r_etwfe_never(mpdta):
    res = etwfe(
        mpdta,
        y="lemp",
        group="countyreal",
        time="year",
        first_treat="first_treat",
        cluster="countyreal",
        cgroup="nevertreated",
    )
    assert res.model_info["cgroup"] == "nevertreated"
    assert res.estimate == pytest.approx(R_ETWFE_NEVER, abs=5e-8)


def test_etwfe_cgroup_switch_changes_identifying_estimand(mpdta):
    notyet = etwfe(
        mpdta,
        y="lemp",
        group="countyreal",
        time="year",
        first_treat="first_treat",
        cluster="countyreal",
        cgroup="notyet",
    )
    never = etwfe(
        mpdta,
        y="lemp",
        group="countyreal",
        time="year",
        first_treat="first_treat",
        cluster="countyreal",
        cgroup="nevertreated",
    )
    assert notyet.estimate != pytest.approx(never.estimate, abs=1e-4)
    assert abs(notyet.estimate - never.estimate) > 0.005
