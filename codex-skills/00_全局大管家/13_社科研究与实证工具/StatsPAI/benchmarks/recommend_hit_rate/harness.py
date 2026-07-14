#!/usr/bin/env python3
"""Thin CLI for the recommendation hit-rate benchmark.

The scoring engine now lives in the package as the registered, agent-native
function ``sp.recommend_benchmark()`` (``statspai/smart/recommend_benchmark.py``)
— humans and agents query the hit-rate the same way. This CLI is a convenience
wrapper that runs it against this directory's ``corpus.yaml`` and writes
``scorecard.{md,json}`` for the repo / CI / docs.

    python3 benchmarks/recommend_hit_rate/harness.py            # report + scorecard
    python3 benchmarks/recommend_hit_rate/harness.py --json      # scorecard.json only
    python3 benchmarks/recommend_hit_rate/harness.py --no-fit    # recommend-only (fast)
    python3 benchmarks/recommend_hit_rate/harness.py --check      # CI ratchet gate
    python3 benchmarks/recommend_hit_rate/harness.py --check --min-hit-rate 0.9

The ``--check`` gate exits non-zero on any hard-miss, error, citation error,
or — when ``--min-hit-rate`` is given — a top-1 hit-rate below the pinned floor.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--json", action="store_true", help="write scorecard.json only")
    ap.add_argument("--check", action="store_true",
                    help="CI gate: exit 1 on hard-miss / error / citation error / floor")
    ap.add_argument("--no-fit", action="store_true",
                    help="skip the dynamic audit pass (faster; recommend hit-rate only)")
    ap.add_argument("--min-hit-rate", type=float, default=None,
                    help="ratchet floor: with --check, fail if top-1 hit-rate < this")
    args = ap.parse_args()

    from statspai.smart.recommend_benchmark import recommend_benchmark, render_markdown

    corpus = HERE / "corpus.yaml"
    card = recommend_benchmark(
        fit=not args.no_fit,
        corpus_path=str(corpus) if corpus.exists() else None,
    )
    (HERE / "scorecard.json").write_text(json.dumps(card, indent=2), encoding="utf-8")
    md = render_markdown(card)
    (HERE / "scorecard.md").write_text(md + "\n", encoding="utf-8")

    if not args.json:
        print(md)

    if args.check:
        s = card["summary"]
        floor_fail = (
            args.min_hit_rate is not None
            and (s["hit_rate_top1"] or 0.0) < args.min_hit_rate
        )
        bad = (
            s["n_errors"] > 0
            or s.get("n_audit_errors", 0) > 0
            or s["hard_miss_rate"]
            or card["citation_errors"]
            or floor_fail
        )
        if floor_fail:
            print(
                f"[recommend-benchmark] FAIL: top-1 hit-rate {s['hit_rate_top1']} "
                f"< floor {args.min_hit_rate}",
                file=sys.stderr,
            )
        return 1 if bad else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
