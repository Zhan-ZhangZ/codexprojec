"""Reference ETL template for ecommerce order data."""

from __future__ import annotations

from datetime import datetime


FIELD_MAPS = {
    "amazon": {
        "order_id": "amazon_order_id",
        "amount": "item_price",
        "status": "order_status",
        "created_at": "purchase_date",
    },
    "taobao": {
        "order_id": "tid",
        "amount": "payment",
        "status": "status",
        "created_at": "created",
    },
}


def normalize_order(row: dict, platform: str) -> dict:
    mapping = FIELD_MAPS.get(platform, {})
    return {
        "platform": platform,
        "order_id": row.get(mapping.get("order_id", "order_id"), ""),
        "amount": float(row.get(mapping.get("amount", "amount"), 0) or 0),
        "status": row.get(mapping.get("status", "status"), ""),
        "created_at": row.get(mapping.get("created_at", "created_at"), ""),
        "loaded_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
    }


def validate_order(order: dict) -> list[str]:
    errors = []
    if not order.get("order_id"):
        errors.append("missing order_id")
    if order.get("amount", 0) < 0:
        errors.append("negative amount")
    return errors

