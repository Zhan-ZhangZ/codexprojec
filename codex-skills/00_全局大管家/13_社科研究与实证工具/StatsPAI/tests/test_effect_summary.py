"""Tests for the decision-ready ``effect_summary`` wrapper layer.

``CausalResult.decision_summary`` (the frequentist core) is covered in
``test_decision_summary.py``. This file locks in the *wrapper* surface that
agents and reports actually call: the top-level :func:`sp.effect_summary`
dispatch, the frequentist/Bayesian ``EffectSummary`` builders, and the
directional / ROPE / SESOI / alpha semantics of the Bayesian branch.

The Bayesian branch is exercised by constructing ``BayesianCausalResult``
dataclasses directly (no PyMC needed), so these tests run in the core env.
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
import pytest

import statspai as sp


def _freq(estimate=2.0, se=0.2, ci=(1.6, 2.4), *, pvalue=0.001):
    return sp.CausalResult(
        method="DID",
        estimand="ATT",
        estimate=estimate,
        se=se,
        pvalue=pvalue,
        ci=ci,
        alpha=0.05,
        n_obs=1000,
    )


def _bayes(*, prob_positive=0.99, prob_rope=None, hdi_prob=0.95):
    return sp.BayesianCausalResult(
        method="Bayesian DID",
        estimand="ATT",
        posterior_mean=0.8,
        posterior_median=0.79,
        posterior_sd=0.2,
        hdi_lower=0.4,
        hdi_upper=1.2,
        prob_positive=prob_positive,
        rhat=1.001,
        ess=1800.0,
        n_obs=500,
        hdi_prob=hdi_prob,
        prob_rope=prob_rope,
    )


# --------------------------------------------------------------------- #
#  Top-level dispatch
# --------------------------------------------------------------------- #
def test_dispatch_frequentist():
    es = sp.effect_summary(_freq(), rope=0.5)
    assert isinstance(es, sp.EffectSummary)
    assert es.metadata["source"] == "decision_summary"
    assert es.metadata["verdict"] == "meaningful_effect"


def test_dispatch_bayesian():
    es = sp.effect_summary(_bayes(), direction="increase")
    assert isinstance(es, sp.EffectSummary)
    assert es.metadata["source"] == "bayesian_causal_result"


def test_dispatch_unsupported_raises():
    with pytest.raises(TypeError, match="effect_summary"):
        sp.effect_summary(object())


def test_top_level_matches_method_frequentist():
    res = _freq()
    a = sp.effect_summary(res, rope=0.5)
    b = res.effect_summary(rope=0.5)
    assert a.metadata["verdict"] == b.metadata["verdict"]
    assert a.text == b.text


def test_top_level_matches_method_bayesian():
    res = _bayes()
    a = sp.effect_summary(res, direction="decrease")
    b = res.effect_summary(direction="decrease")
    assert a.text == b.text


# --------------------------------------------------------------------- #
#  Frequentist EffectSummary wrapper
# --------------------------------------------------------------------- #
def test_frequentist_metadata_and_table():
    es = sp.effect_summary(_freq(), rope=0.5)
    md = es.metadata
    assert md["statistically_significant"] is True
    assert md["practically_significant"] is True
    assert md["ci_vs_rope"] == "outside"
    assert isinstance(es.table, pd.DataFrame) and len(es.table) == 1
    json.dumps(es.to_dict())  # JSON-safe
    assert str(es) == es.text


# --------------------------------------------------------------------- #
#  Bayesian directional probabilities
# --------------------------------------------------------------------- #
def test_bayes_direction_increase():
    es = sp.effect_summary(_bayes(prob_positive=0.99), direction="increase")
    row = es.table.iloc[0]
    assert row["tail_probability_label"] == "P(ATT > 0)"
    assert row["tail_probability"] == pytest.approx(0.99)
    assert "P(ATT > 0) = 0.99" in es.text


def test_bayes_direction_decrease():
    es = sp.effect_summary(_bayes(prob_positive=0.99), direction="decrease")
    row = es.table.iloc[0]
    assert row["tail_probability_label"] == "P(ATT < 0)"
    assert row["tail_probability"] == pytest.approx(0.01)


def test_bayes_direction_two_sided():
    es = sp.effect_summary(_bayes(prob_positive=0.99), direction="two-sided")
    row = es.table.iloc[0]
    assert row["tail_probability_label"] == "P(ATT != 0)"
    # 1 - 2*min(0.99, 0.01) = 0.98
    assert row["tail_probability"] == pytest.approx(0.98)


def test_bayes_invalid_direction():
    with pytest.raises(ValueError, match="direction"):
        sp.effect_summary(_bayes(), direction="up")


# --------------------------------------------------------------------- #
#  Bayesian ROPE / SESOI handling
# --------------------------------------------------------------------- #
def test_bayes_rope_and_sesoi_mutually_exclusive():
    with pytest.raises(ValueError, match="not both"):
        sp.effect_summary(_bayes(), rope=(-0.1, 0.1), sesoi=0.1)


def test_bayes_sesoi_becomes_symmetric_rope_description():
    es = sp.effect_summary(_bayes(), sesoi=0.1)
    assert list(es.table.iloc[0]["rope"]) == [-0.1, 0.1]


def test_bayes_prob_rope_reported_when_present():
    es = sp.effect_summary(_bayes(prob_rope=0.02), direction="increase")
    assert es.table.iloc[0]["prob_rope"] == pytest.approx(0.02)
    assert "ROPE is 0.02" in es.text


def test_bayes_rope_supplied_but_not_stored_hints_refit():
    # rope passed at summary time, but result carries no posterior ROPE mass
    es = sp.effect_summary(_bayes(prob_rope=None), rope=(-0.1, 0.1))
    assert "re-fit with rope=" in es.text


def test_bayes_alpha_override_changes_hdi_level():
    es = sp.effect_summary(_bayes(), alpha=0.10)
    assert es.table.iloc[0]["hdi_prob"] == pytest.approx(0.90)
    assert "90% HDI" in es.text


def test_bayes_alpha_out_of_range_rejected():
    with pytest.raises(ValueError, match="alpha"):
        sp.effect_summary(_bayes(), alpha=1.5)


# --------------------------------------------------------------------- #
#  Output shapes
# --------------------------------------------------------------------- #
def test_bayes_table_and_jsonsafe():
    es = sp.effect_summary(_bayes(prob_rope=0.02))
    assert len(es.table) == 1
    cols = set(es.table.columns)
    assert {"posterior_mean", "hdi_low", "hdi_high", "prob_positive"} <= cols
    payload = es.to_dict()
    json.dumps(payload)
    assert payload["kind"] == "effect_summary"
    assert str(es) == es.text


def test_bayes_nan_fields_coerced_to_none():
    res = _bayes()
    res.posterior_sd = np.nan  # degenerate field must not crash JSON
    es = sp.effect_summary(res)
    json.dumps(es.to_dict())
