"""Regression tests for indicator-market composite scoring.

Background:
    The indicator market page summarises each indicator's successful
    backtest runs into a single ``score`` value. Internally this calls
    ``StrategyScoringService.score_result`` and then takes the median
    of those scores across the indicator's runs.

The bug this file guards against:
    ``StrategyScoringService.score_result`` returns ``overallScore``,
    but ``_summarise_indicator_runs`` was reading the wrong key
    (``overall``). The ``.get('overall')`` always returned ``None`` →
    fell back to ``0`` → the median over an indicator's runs was always
    ``0``. Visible symptom: every card on the indicator market page
    showed composite score = 0, no matter how good the backtests were.

These tests intentionally do NOT touch the database — they exercise the
pure-Python aggregation function directly with hand-built result rows.
"""

import json

from app.services.community_service import _summarise_indicator_runs
from app.services.experiment.scoring import StrategyScoringService


def _make_run(run_id: int, *, total_return: float, sharpe: float,
              drawdown: float, win_rate: float, profit_factor: float,
              total_trades: int, symbol: str = "BTC/USDT",
              timeframe: str = "1h") -> dict:
    """Build a fake qd_backtest_runs row with the bare-minimum payload
    that ``_summarise_indicator_runs`` and ``StrategyScoringService``
    consume.
    """
    payload = {
        "totalReturn": total_return,
        "annualReturn": total_return,
        "sharpeRatio": sharpe,
        "maxDrawdown": drawdown,
        "winRate": win_rate,
        "profitFactor": profit_factor,
        "totalTrades": total_trades,
        "equityCurve": [
            {"value": 100.0},
            {"value": 100.0 + total_return / 2},
            {"value": 100.0 + total_return},
        ],
    }
    return {
        "id": run_id,
        "indicator_id": 1,
        "symbol": symbol,
        "timeframe": timeframe,
        "result_json": json.dumps(payload),
    }


def test_composite_score_is_nonzero_for_good_backtests():
    """High-quality backtests must produce a non-zero composite score.

    This is the direct regression for the v3.0.4 typo where the wrong
    dict key was read and every score collapsed to 0.
    """
    runs = [
        _make_run(1, total_return=40, sharpe=1.8, drawdown=-12,
                  win_rate=58, profit_factor=2.1, total_trades=40),
        _make_run(2, total_return=35, sharpe=1.6, drawdown=-15,
                  win_rate=55, profit_factor=1.9, total_trades=35),
        _make_run(3, total_return=45, sharpe=2.0, drawdown=-10,
                  win_rate=60, profit_factor=2.3, total_trades=50),
    ]
    summary = _summarise_indicator_runs(runs)
    assert summary["score"] > 0, (
        "composite score must be > 0 for clearly profitable runs; "
        "if this is 0, the score_result() dict-key bug is back"
    )
    assert summary["sample_size"] == 3
    assert summary["best_run_id"] in {1, 2, 3}
    assert "BTC/USDT" in summary["symbols"]
    assert "1h" in summary["timeframes"]


def test_composite_score_matches_underlying_scorer():
    """The summary score must equal the median of the underlying
    ``StrategyScoringService.score_result`` overallScore values.

    Catches both (a) the original wrong-key bug (would return 0) and
    (b) any future refactor that accidentally swaps median for mean or
    drops the scoring call.
    """
    runs = [
        _make_run(11, total_return=20, sharpe=1.2, drawdown=-15,
                  win_rate=52, profit_factor=1.5, total_trades=30),
        _make_run(12, total_return=10, sharpe=0.8, drawdown=-22,
                  win_rate=48, profit_factor=1.2, total_trades=20),
        _make_run(13, total_return=50, sharpe=2.2, drawdown=-8,
                  win_rate=62, profit_factor=2.5, total_trades=60),
    ]
    scorer = StrategyScoringService()
    expected_scores = sorted(
        float(scorer.score_result(json.loads(r["result_json"]))["overallScore"])
        for r in runs
    )
    expected_median = expected_scores[1]

    summary = _summarise_indicator_runs(runs)
    assert abs(summary["score"] - round(expected_median, 2)) < 0.05


def test_summary_handles_empty_runs():
    summary = _summarise_indicator_runs([])
    assert summary["score"] == 0.0
    assert summary["sample_size"] == 0
    assert summary["best_run_id"] is None


def test_summary_skips_invalid_result_json():
    """Malformed result_json rows must be skipped, not crash the
    aggregator. Empty results -> score 0, which is the only correct
    'we couldn't score this' answer.
    """
    runs = [
        {"id": 1, "indicator_id": 1, "symbol": "ETH/USDT",
         "timeframe": "4h", "result_json": "this is not json"},
        {"id": 2, "indicator_id": 1, "symbol": "ETH/USDT",
         "timeframe": "4h", "result_json": None},
    ]
    summary = _summarise_indicator_runs(runs)
    assert summary["score"] == 0.0
    assert summary["sample_size"] == 0
