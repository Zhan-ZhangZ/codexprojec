"""CausalPy-inspired cross-cutting contracts for StatsPAI."""

from __future__ import annotations

import json

import numpy as np

import statspai as sp
from statspai.bayes._base import BayesianCausalResult
from statspai.checks import CheckContext, RobustnessBatteryCheck, run_checks


def test_causal_result_effect_summary_reuses_decision_contract():
    result = sp.CausalResult(
        method="Test DID",
        estimand="ATT",
        estimate=1.5,
        se=0.2,
        pvalue=0.01,
        ci=(1.1, 1.9),
        alpha=0.05,
        n_obs=100,
    )

    summary = result.effect_summary(rope=0.5)

    assert isinstance(summary, sp.EffectSummary)
    assert summary.table.loc[0, "verdict"] == "meaningful_effect"
    assert summary.metadata["source"] == "decision_summary"
    assert "Test DID" in summary.text
    json.dumps(summary.to_dict())


def test_top_level_effect_summary_dispatches_to_causal_result():
    result = sp.CausalResult(
        method="Test RD",
        estimand="LATE",
        estimate=0.0,
        se=0.1,
        pvalue=0.9,
        ci=(-0.1, 0.1),
        alpha=0.05,
        n_obs=80,
    )

    summary = sp.effect_summary(result, sesoi=0.2)

    assert summary.table.loc[0, "verdict"] == "equivalent"
    assert summary.metadata["ci_vs_rope"] == "inside"


def test_bayesian_effect_summary_is_json_safe_and_directional():
    result = BayesianCausalResult(
        method="Bayesian DID",
        estimand="ATT",
        posterior_mean=0.7,
        posterior_median=0.68,
        posterior_sd=0.25,
        hdi_lower=0.2,
        hdi_upper=1.1,
        prob_positive=0.98,
        prob_rope=0.03,
        rhat=1.0,
        ess=900.0,
        n_obs=120,
        model_info={"draws": np.int64(500)},
    )

    summary = result.effect_summary(direction="increase")

    row = summary.table.iloc[0]
    assert row["posterior_mean"] == 0.7
    assert row["tail_probability_label"] == "P(ATT > 0)"
    assert row["prob_rope"] == 0.03
    assert "Bayesian DID" in summary.text
    json.dumps(summary.to_dict())


def test_robustness_battery_check_wraps_existing_report_contract():
    result = sp.CausalResult(
        method="Test IV",
        estimand="LATE",
        estimate=0.5,
        se=0.1,
        pvalue=0.02,
        ci=(0.3, 0.7),
        alpha=0.05,
        n_obs=100,
    )

    checks = run_checks(
        result,
        [RobustnessBatteryCheck()],
        context=CheckContext(design="iv"),
    )

    assert len(checks) == 1
    payload = checks[0].to_dict()
    assert payload["check_name"] == "RobustnessBattery"
    assert payload["metadata"]["n_findings"] >= 1
    json.dumps(payload)


def test_design_intake_returns_four_state_contracts():
    matched = sp.design_intake(
        estimand="local threshold effect",
        assignment="cutoff rule",
        data_topology="cross-section",
        identification_support="no manipulation near cutoff",
    )
    assert matched.outcome == "matched"
    assert matched.recommended_design == "rd"

    missing = sp.design_intake(estimand="ATT")
    assert missing.outcome == "not_identifiable_yet"
    assert missing.deciding_question

    ambiguous = sp.design_intake(
        estimand="cumulative impact",
        assignment="known intervention time",
        data_topology="wide unit-by-time panel",
        controls="donor units",
        identification_support="pre-period history",
    )
    assert ambiguous.outcome == "ambiguous"
    assert "synth" in ambiguous.candidate_designs

    unsupported = sp.design_intake(
        estimand="graph",
        assignment="observational structure",
        data_topology="cross-section",
        identification_support="none",
        needs="causal discovery",
    )
    assert unsupported.outcome == "not_implemented"


def test_contract_inventory_gate_passes():
    from scripts.check_contract_inventory import check_contracts

    assert check_contracts() == []
