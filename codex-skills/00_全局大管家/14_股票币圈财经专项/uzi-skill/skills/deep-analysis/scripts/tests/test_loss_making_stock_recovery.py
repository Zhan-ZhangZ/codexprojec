"""Regressions for loss-making stocks and modeling recovery.

The 601238.SH report exposed three related failures:
None-valued institutional inputs, an unbounded northbound-history fetch, and
the lack of a cache-only modeling restart path.
"""
from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path
from types import SimpleNamespace


def _raw_for(name: str = "广汽集团") -> dict:
    return {
        "ticker": "601238.SH",
        "market": "A",
        "dimensions": {
            "0_basic": {
                "data": {
                    "name": name,
                    "code": "601238",
                    "price": 7.5,
                    "industry": "汽车整车",
                    "market_cap_yi": 780,
                }
            },
            "1_financials": {
                "data": {
                    "roe_history": [-8.0],
                    "revenue_history": [980.0],
                    "net_profit_history": [-87.8],
                }
            },
        },
    }


def test_sanitize_features_drops_only_none_values():
    from lib.stock_features import sanitize_features

    original = {"moat_total": None, "fcf_positive": False, "pe": 0, "name": "广汽集团"}
    cleaned = sanitize_features(original)

    assert cleaned == {"fcf_positive": False, "pe": 0, "name": "广汽集团"}
    assert "moat_total" in original


def test_loss_making_dcf_does_not_crash_institutional_workflows():
    from lib.deep_analysis_methods import build_ic_memo
    from lib.report.institutional import _render_initiating_coverage
    from lib.research_workflow import build_initiating_coverage, run_idea_screen

    raw = _raw_for()
    features = {
        "name": "广汽集团",
        "price": 7.5,
        "moat_total": None,
        "net_margin": None,
        "roe_5y_above_15": 0,
    }
    failed_dcf = {
        "intrinsic_per_share": None,
        "safety_margin_pct": None,
        "verdict": "负 FCF，DCF 无法收敛",
    }

    coverage = build_initiating_coverage(features, raw, failed_dcf, {})
    memo = build_ic_memo(features, raw, failed_dcf, {})
    screen = run_idea_screen(features, "quality")

    assert coverage["headline"]["target_price"] == 0
    assert coverage["headline"]["rating"] == "未评级 (Not Rated)"
    rendered_coverage = _render_initiating_coverage({"initiating_coverage": coverage})
    assert "TARGET</div><div" in rendered_coverage
    assert "TARGET</div><div style=\"font-size:18px;font-weight:800\">—" in rendered_coverage
    assert memo["sections"]["VII_returns_scenarios"] == []
    assert screen["passed"] == 0


def test_all_institutional_dimensions_complete_for_a_loss_making_stock():
    from compute_deep_methods import compute_dim_20, compute_dim_21, compute_dim_22

    raw = _raw_for()
    features = {
        "ticker": "601238.SH",
        "name": "广汽集团",
        "price": 7.5,
        "market_cap_yi": 780,
        "revenue_latest_yi": 980,
        "net_profit_latest_yi": -87.8,
        "fcf_latest_yi": -50,
        "fcf_positive": False,
        "fcf_known": True,
        "moat_total": None,
        "net_margin": None,
    }

    dim20 = compute_dim_20(features, raw)
    dim21 = compute_dim_21(features, raw, dim20["data"])
    dim22 = compute_dim_22(features, raw, dim20["data"], dim21["data"])

    assert dim20["data"]["dcf"]["intrinsic_per_share"] is None
    assert dim21["data"]["summary"]["rec_rating"] == "未评级 (Not Rated)"
    assert dim22["data"]["ic_memo"]["sections"]["VII_returns_scenarios"] == []


def test_failed_dcf_renders_an_explanatory_placeholder():
    from lib.report.institutional import _render_dcf_block

    html = _render_dcf_block({
        "dcf": {
            "intrinsic_per_share": None,
            "safety_margin_pct": None,
            "verdict": "负 FCF，DCF 无法收敛",
        }
    })

    assert "亏损期" in html
    assert "PB" in html and "Comps" in html


def test_failed_dcf_placeholder_escapes_verdict_html():
    from lib.report.institutional import _render_dcf_block

    html = _render_dcf_block({
        "dcf": {"intrinsic_per_share": None, "verdict": "<script>alert(1)</script>"}
    })

    assert "<script>" not in html
    assert "&lt;script&gt;" in html


def test_partial_institutional_numeric_data_does_not_crash_renderers():
    from lib.report.institutional import (
        _render_catalyst_calendar,
        _render_comps_block,
        _render_competitive_analysis,
        _render_dcf_block,
        _render_ic_memo,
        _render_initiating_coverage,
        _render_lbo_block,
    )

    dcf_html = _render_dcf_block({
        "dcf": {
            "intrinsic_per_share": 10,
            "current_price": 5,
            "safety_margin_pct": 100,
            "sensitivity_table": {
                "wacc_axis": ["10%"],
                "g_axis": ["2%"],
                "values_per_share": [[None]],
            },
        }
    })
    lbo_html = _render_lbo_block({
        "lbo": {
            "irr_pct": None,
            "moic": None,
            "ebitda_path": [10, None, 12],
            "debt_schedule": [8, None, 4],
        }
    })
    memo_html = _render_ic_memo({
        "ic_memo": {
            "sections": {
                "I_exec_summary": {"headline": None},
                "VII_returns_scenarios": [{
                    "return_pct": None,
                    "probability_pct": None,
                    "price_target": None,
                }],
            }
        }
    })
    competitive_html = _render_competitive_analysis({
        "competitive_analysis": {
            "porter_five_forces": {
                "new_entrants_threat": {"score": None},
            },
            "bcg_position": {
                "market_share_pct": None,
                "market_growth_pct": None,
            },
        }
    })
    comps_html = _render_comps_block({
        "comps": {
            "peer_stats": {"pe": {"min": 10, "median": 20, "max": 30}},
            "target_percentile": {"pe": None},
        }
    })
    coverage_html = _render_initiating_coverage({
        "initiating_coverage": {"headline": {"rating": None}}
    })
    catalyst_html = _render_catalyst_calendar({
        "catalyst_calendar": {"events": [{"date": None, "event": "财报"}]}
    })

    assert "—" in dcf_html
    assert "退出 IRR" in lbo_html
    assert "三情景回报分析" in memo_html
    assert "Porter 5 Forces" in competitive_html
    assert "50%" in comps_html
    assert "RATING" in coverage_html
    assert "财报" in catalyst_html


def test_partial_features_do_not_crash_standalone_research_methods():
    from lib.deep_analysis_methods import build_value_creation_plan
    from lib.research_workflow import build_thesis_tracker

    raw = {"dimensions": {}}
    features = {
        "rev_growth_3y": None,
        "roe_last": None,
        "pe": None,
        "gross_margin": None,
        "revenue_latest_yi": None,
        "ebitda_yi": None,
    }

    tracker = build_thesis_tracker(features, raw)
    plan = build_value_creation_plan(features, raw)

    assert tracker["pillars_total"] == 5
    assert plan["method"] == "Value Creation Plan (EBITDA Bridge)"


def test_northbound_fetch_uses_one_latest_page(monkeypatch):
    from lib import data_sources as ds
    from lib.market_router import parse_ticker

    latest = date(2026, 8, 27)
    rows = [
        {
            "TRADE_DATE": (latest - timedelta(days=i)).isoformat(),
            "CLOSE_PRICE": str(7.5 - i / 100),
            "CHANGE_RATE": "0.2",
            "HOLD_SHARES": str(1000 - i),
            "HOLD_MARKET_CAP": str(7500 - i),
            "HOLD_SHARES_RATIO": "1.2",
            "ADD_SHARES_REPAIR": "10",
            "PREDICT_AMC": "75",
            "HMC_CHANGE": "80",
        }
        for i in range(70)
    ]
    calls = []

    class Response:
        status_code = 200

        def json(self):
            return {"result": {"pages": 874, "data": rows}}

        def raise_for_status(self):
            return None

    def fake_get(url, **kwargs):
        calls.append((url, kwargs))
        return Response()

    monkeypatch.setattr(ds, "requests", SimpleNamespace(get=fake_get))
    monkeypatch.setattr(
        ds,
        "ak",
        SimpleNamespace(stock_hsgt_individual_em=lambda **_kwargs: (_ for _ in ()).throw(
            AssertionError("must not invoke AkShare's all-pages implementation")
        )),
    )

    result = ds._fetch_north_impl(parse_ticker("601238.SH"))

    assert len(calls) == 1
    assert calls[0][0] == "https://datacenter-web.eastmoney.com/api/data/v1/get"
    assert calls[0][1]["params"]["pageNumber"] == "1"
    assert calls[0][1]["params"]["pageSize"] == "500"
    history = result["flow_history"]
    assert len(history) == 60
    assert history[0]["持股日期"] == (latest - timedelta(days=59)).isoformat()
    assert history[-1]["持股日期"] == latest.isoformat()


def test_cached_chinese_name_resolves_without_network(tmp_path, monkeypatch):
    import run_real_test as rrt
    from lib import cache

    monkeypatch.setattr(cache, "CACHE_ROOT", tmp_path)
    cache_dir = tmp_path / "601238.SH"
    cache_dir.mkdir()
    (cache_dir / "raw_data.json").write_text(
        json.dumps(_raw_for(), ensure_ascii=False), encoding="utf-8"
    )

    resolved = rrt._resolve_cached_target("广汽集团", required_outputs=("raw_data",))

    assert resolved.full == "601238.SH"


def test_cached_target_rejects_path_traversal():
    import pytest
    import run_real_test as rrt

    with pytest.raises(ValueError, match="无效股票代码"):
        rrt._resolve_cached_target("../../etc/passwd", required_outputs=("raw_data",))


def test_stage1_modeling_reuses_raw_cache_without_collecting(tmp_path, monkeypatch):
    import compute_deep_methods as cdm
    import run_real_test as rrt
    from lib import cache, data_integrity

    monkeypatch.setattr(cache, "CACHE_ROOT", tmp_path)
    cache_dir = tmp_path / "601238.SH"
    cache_dir.mkdir()
    (cache_dir / "raw_data.json").write_text(
        json.dumps(_raw_for(), ensure_ascii=False), encoding="utf-8"
    )
    monkeypatch.setattr(rrt, "collect_raw_data", lambda _ticker: (_ for _ in ()).throw(
        AssertionError("cache-only modeling must not recollect")
    ))
    monkeypatch.setattr(cdm, "compute_dim_20", lambda _f, _r: {
        "data": {"dcf": {}, "summary": {
            "dcf_intrinsic": None, "dcf_safety_margin_pct": None,
            "dcf_verdict": "负 FCF", "lbo_irr_pct": None, "lbo_verdict": "不可用",
        }}
    })
    monkeypatch.setattr(cdm, "compute_dim_21", lambda _f, _r, _d20: {
        "data": {"summary": {"rec_rating": "观望", "target_price": 0, "upside_pct": 0}}
    })
    monkeypatch.setattr(cdm, "compute_dim_22", lambda _f, _r, _d20, _d21: {
        "data": {"summary": {
            "ic_recommendation": "暂不建仓", "bcg_position": "—",
            "industry_attractiveness": 0,
        }}
    })
    monkeypatch.setattr(data_integrity, "refresh_recovery_artifact", lambda *_a, **_k: {})
    monkeypatch.setattr(rrt, "score_dimensions", lambda _raw: {"fundamental_score": 12})
    monkeypatch.setattr(rrt, "generate_panel", lambda _dims, _raw: {
        "signal_distribution": {"bullish": 0, "neutral": 1, "bearish": 0, "skip": 0},
        "long_active": 1,
    })

    result = rrt.stage1_modeling("601238.SH")

    assert result["ticker"] == "601238.SH"
    assert (cache_dir / "dimensions.json").exists()
    assert (cache_dir / "panel.json").exists()


def test_run_py_exposes_from_modeling_flag():
    root_run = Path(__file__).resolve().parents[4] / "run.py"
    source = root_run.read_text(encoding="utf-8")

    assert '"--from-modeling"' in source
    assert "stage1_modeling" in source
