#!/usr/bin/env python3
"""Generate a compact ecommerce operating report from CSV rows.

Expected columns: date, order_id, sku, amount, cost, ad_spend, status.
The script is intentionally lightweight so buyers can adapt it to exported
platform CSV files without connecting to live stores.
"""

from __future__ import annotations

import argparse
import csv
from collections import defaultdict
from pathlib import Path


def _to_float(value: str) -> float:
    try:
        return float(value or 0)
    except ValueError:
        return 0.0


def load_orders(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def summarize(rows: list[dict[str, str]]) -> dict:
    paid_rows = [r for r in rows if r.get("status", "").lower() not in {"refund", "cancelled", "canceled"}]
    refund_rows = [r for r in rows if r.get("status", "").lower() == "refund"]
    gmv = sum(_to_float(r.get("amount", "")) for r in paid_rows)
    cost = sum(_to_float(r.get("cost", "")) for r in paid_rows)
    ad_spend = sum(_to_float(r.get("ad_spend", "")) for r in rows)
    sku_sales: dict[str, float] = defaultdict(float)
    for row in paid_rows:
        sku_sales[row.get("sku", "UNKNOWN")] += _to_float(row.get("amount", ""))
    return {
        "orders": len(paid_rows),
        "refunds": len(refund_rows),
        "gmv": round(gmv, 2),
        "gross_profit": round(gmv - cost - ad_spend, 2),
        "ad_spend": round(ad_spend, 2),
        "aov": round(gmv / len(paid_rows), 2) if paid_rows else 0,
        "refund_rate": round(len(refund_rows) / len(rows) * 100, 2) if rows else 0,
        "top_skus": sorted(sku_sales.items(), key=lambda item: item[1], reverse=True)[:5],
    }


def render_markdown(summary: dict) -> str:
    lines = [
        "# 电商经营日报",
        "",
        "| 指标 | 数值 |",
        "|---|---:|",
        f"| 有效订单 | {summary['orders']} |",
        f"| GMV | {summary['gmv']} |",
        f"| 客单价 | {summary['aov']} |",
        f"| 广告花费 | {summary['ad_spend']} |",
        f"| 粗略经营利润 | {summary['gross_profit']} |",
        f"| 退款率 | {summary['refund_rate']}% |",
        "",
        "## TOP SKU",
        "",
    ]
    for sku, amount in summary["top_skus"]:
        lines.append(f"- {sku}: {round(amount, 2)}")
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a simple ecommerce report from CSV.")
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("-o", "--output", type=Path, help="Markdown output path")
    args = parser.parse_args()
    report = render_markdown(summarize(load_orders(args.csv_path)))
    if args.output:
        args.output.write_text(report, encoding="utf-8")
    else:
        print(report)


if __name__ == "__main__":
    main()

