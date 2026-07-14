"""Trading (class T) — paper-only by default, hard-gated for live execution.

Live execution from agents requires *all* of the following:
  1. Token has scope `T`.
  2. Token has `paper_only=false` (operator must flip explicitly).
  3. Server-side env `AGENT_LIVE_TRADING_ENABLED=true` (deployment kill switch).

Until live is unlocked, this endpoint records orders to `qd_agent_paper_orders`
using the latest market price as the simulated fill — so AI workflows can
exercise the round trip without ever touching exchange credentials.
"""
from __future__ import annotations

import os
import uuid
from typing import Any

from app.services.kline import KlineService
from app.utils.agent_auth import (
    SCOPE_T, agent_required, current_token, current_user_id,
    instrument_allowed, market_allowed, paper_only, with_idempotency,
)
from app.utils.db import get_db_connection
from app.utils.logger import get_logger
from flask import request

from . import agent_v1_bp
from ._helpers import envelope, error, get_json_or_400

logger = get_logger(__name__)
_kline = KlineService()


def _live_trading_kill_switch() -> bool:
    return os.getenv("AGENT_LIVE_TRADING_ENABLED", "false").lower() in ("1", "true", "yes")


def _last_price(market: str, symbol: str) -> float | None:
    try:
        rows = _kline.get_kline(market=market, symbol=symbol, timeframe="1m", limit=1) or []
        if not rows:
            return None
        last = rows[-1]
        if isinstance(last, dict):
            for k in ("close", "c", "Close"):
                v = last.get(k)
                if v is not None:
                    return float(v)
        return None
    except Exception as exc:
        logger.warning(f"agent_v1 quick_trade last_price failed: {exc}")
        return None


def _record_paper_order(*, body: dict, fill_price: float | None, status: str, note: str = "") -> dict:
    order_uid = uuid.uuid4().hex
    market = (body.get("market") or "").strip()
    symbol = (body.get("symbol") or "").strip()
    side = (body.get("side") or "").strip().lower()
    order_type = (body.get("order_type") or body.get("orderType") or "market").strip().lower()
    qty = float(body.get("qty") or body.get("quantity") or 0)
    limit_price = body.get("limit_price") or body.get("limitPrice")
    if limit_price is not None:
        limit_price = float(limit_price)

    fill_value = (fill_price * qty) if (fill_price is not None and qty) else None

    with get_db_connection() as db:
        cur = db.cursor()
        cur.execute(
            """
            INSERT INTO qd_agent_paper_orders
              (order_uid, user_id, agent_token_id, market, symbol, side, order_type,
               qty, limit_price, fill_price, fill_value, status, note)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                order_uid, current_user_id(), int(current_token().get("id") or 0),
                market, symbol, side, order_type,
                qty, limit_price, fill_price, fill_value, status, note,
            ),
        )
        db.commit()
        cur.close()

    return {
        "order_uid": order_uid,
        "market": market,
        "symbol": symbol,
        "side": side,
        "order_type": order_type,
        "qty": qty,
        "limit_price": limit_price,
        "fill_price": fill_price,
        "fill_value": fill_value,
        "status": status,
        "paper": True,
        "note": note,
    }


@agent_v1_bp.route("/quick-trade/orders", methods=["POST"])
@agent_required(SCOPE_T)
def place_order():
    """Place an order. Paper-only unless explicitly unlocked (see module doc)."""
    body, err = get_json_or_400()
    if err:
        return err

    market = (body.get("market") or "").strip()
    symbol = (body.get("symbol") or "").strip()
    side = (body.get("side") or "").strip().lower()
    qty = body.get("qty") or body.get("quantity")

    if not market or not symbol:
        return error(400, "market and symbol are required")
    if side not in ("buy", "sell"):
        return error(400, "side must be 'buy' or 'sell'")
    try:
        qty_f = float(qty)
        if qty_f <= 0:
            raise ValueError
    except Exception:
        return error(400, "qty must be a positive number")

    if not market_allowed(market):
        return error(403, f"Market not allowed: {market}", http=403)
    if not instrument_allowed(symbol):
        return error(403, f"Instrument not allowed: {symbol}", http=403)

    with with_idempotency("quick_trade_order") as existing:
        if existing:
            return envelope({
                "duplicate": True,
                "previous": existing.get("result"),
            }, message="idempotent replay")

    # Live trading is hard-gated. Even with paper_only=false on the token, the
    # operator must enable AGENT_LIVE_TRADING_ENABLED to actually route to
    # exchange clients — keeping a final environment-level kill switch.
    if (not paper_only()) and _live_trading_kill_switch():
        return error(
            501,
            "Live agent trading is not implemented in this build. "
            "Use the human Quick Trade flow until live agent execution is enabled.",
            http=501,
        )

    fill_price = _last_price(market, symbol)
    note = "" if fill_price is not None else "no last price available; recorded without fill"
    status = "filled" if fill_price is not None else "rejected"
    result = _record_paper_order(body=body, fill_price=fill_price, status=status, note=note)
    return envelope(result, message="paper-fill")


@agent_v1_bp.route("/quick-trade/kill-switch", methods=["POST"])
@agent_required(SCOPE_T)
def kill_switch():
    """Cancel all of the calling tenant's open paper orders.

    This intentionally limits scope to the agent's own surface; revoking live
    exchange orders requires the human admin path (separate, audited).
    """
    with get_db_connection() as db:
        cur = db.cursor()
        cur.execute(
            """
            UPDATE qd_agent_paper_orders
            SET status = 'cancelled', note = COALESCE(note,'') || ' [kill_switch]'
            WHERE user_id = %s AND status NOT IN ('filled','cancelled','rejected')
            """,
            (current_user_id(),),
        )
        affected = cur.rowcount
        db.commit()
        cur.close()
    return envelope({"cancelled_open_paper_orders": int(affected or 0)})
