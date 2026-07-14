"""Regression test for ExperimentRunnerService._build_best_output.

Why this test exists:
    Users were confused when the Smart-Tuner said "+36% total return"
    but applying the candidate and re-running on the full window
    produced "-24%". Root cause: the tuner reports IS (training-window)
    metrics and the regular backtest runs the full window (which
    includes the 30% out-of-sample holdout). The fix is two-part:

      1) The /api/experiment/structured-tune response now ships OOS
         summary + score + degradation + overfit flag for the best
         candidate so the IDE can render IS / OOS side by side and
         flag overfit candidates.
      2) The IDE adds an "Apply & verify on training window" button
         that reuses the same window the tuner used, so the headline
         number is reproducible.

This test locks down step (1): _build_best_output must NOT silently
drop the OOS fields when the candidate carries them. If the OOS
fields go missing, the dual-display UI collapses back to "IS only"
and we are right back where we started.
"""
from app.services.experiment.runner import ExperimentRunnerService


def _make_candidate(*, with_oos: bool) -> dict:
    base = {
        "name": "cand-1",
        "score": {"overallScore": 72.5, "grade": "B"},
        "source": "evolution_grid",
        "overrides": {"strategy_config.risk.stopLossPct": 0.04},
        "snapshot": {"code": "...", "leverage": 3},
        "result": {
            "totalReturn": 36.4,
            "maxDrawdown": -12.1,
            "sharpeRatio": 1.8,
            "totalTrades": 42,
        },
    }
    if with_oos:
        base.update({
            "oosScore": {"overallScore": 31.0, "grade": "D"},
            "oosResult": {
                "totalReturn": -41.7,
                "maxDrawdown": -28.3,
                "sharpeRatio": -0.6,
                "totalTrades": 18,
            },
            "oosDegradation": 0.572,
            "oosOverfit": True,
        })
    return base


def test_best_output_includes_oos_block_when_available():
    cand = _make_candidate(with_oos=True)
    out = ExperimentRunnerService._build_best_output(cand)

    assert out is not None
    assert out["summary"]["totalReturn"] == 36.4
    assert out["summary"]["sharpeRatio"] == 1.8

    assert out["oosSummary"] is not None, "oosSummary must be present when oosResult exists"
    assert out["oosSummary"]["totalReturn"] == -41.7
    assert out["oosSummary"]["maxDrawdown"] == -28.3
    assert out["oosSummary"]["sharpeRatio"] == -0.6
    assert out["oosSummary"]["totalTrades"] == 18

    assert out["oosScore"]["overallScore"] == 31.0
    assert out["oosDegradation"] == 0.572
    assert out["oosOverfit"] is True


def test_best_output_omits_oos_block_when_not_evaluated():
    cand = _make_candidate(with_oos=False)
    out = ExperimentRunnerService._build_best_output(cand)

    assert out is not None
    assert out["summary"]["totalReturn"] == 36.4
    assert out["oosSummary"] is None, (
        "oosSummary must be None when the candidate has no oosResult; "
        "frontend uses null as the signal to render 'OOS not evaluated'"
    )
    assert out["oosScore"] is None
    assert out["oosDegradation"] is None
    assert out["oosOverfit"] is False


def test_best_output_none_when_no_best():
    assert ExperimentRunnerService._build_best_output(None) is None
