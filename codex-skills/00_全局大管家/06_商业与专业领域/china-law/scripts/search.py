#!/usr/bin/env python3
"""
Search the local provision index for Chinese law provisions.

Usage:
  python3 scripts/search.py "关键词"                    # full-text search provisions
  python3 scripts/search.py "关键词" --top 20           # limit results
  python3 scripts/search.py "关键词" --group 法律        # filter by law group
  python3 scripts/search.py "关键词" --tier T1,T2        # only T1+T2 (verified current)
  python3 scripts/search.py "关键词" --verbose           # show full provision text
  python3 scripts/search.py --law "劳动合同法"           # show all provisions of a law
  python3 scripts/search.py --check "劳动合同法"         # check currency status
  python3 scripts/search.py --deps "劳动合同法"          # show dependency graph
  python3 scripts/search.py --tier-summary               # show tier distribution
"""

import json
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
LAWS_DIR = BASE_DIR / "laws"


def load_json(name):
    with open(LAWS_DIR / name) as f:
        return json.load(f)


def search_provisions(query, group=None, tiers=None, top=15, verbose=False):
    """Full-text search across all provisions."""
    idx = load_json("provision-index.json")
    manifest = load_json("currency-manifest.json")

    # Build tier lookup: base_name -> tier
    tier_map = {name: data["tier"] for name, data in manifest["laws"].items()}

    results = []
    for law_id, data in idx["laws"].items():
        if group and data["group"] != group:
            continue
        base = data["base_name"]
        law_tier = tier_map.get(base, "T4")
        if tiers and law_tier not in tiers:
            continue

        keywords = query.split()
        for prov in data["provisions"]:
            # Multi-keyword AND matching: all keywords must appear
            if all(kw in prov["text"] for kw in keywords):
                results.append({
                    "title": data["title"],
                    "article": prov["article"],
                    "chapter": prov.get("chapter", ""),
                    "text": prov["text"],
                    "status": data["status"],
                    "effective_date": data["effective_date"],
                    "group": data["group"],
                    "tier": law_tier,
                    "urls": data.get("urls", []),
                })

    # Sort by tier (T1 first), then status (有效 first), then group hierarchy
    group_order = {"宪法": 0, "法律": 1, "行政法规": 2, "司法解释": 3, "监察法规": 4}
    status_order = {"有效": 0, "尚未生效": 1, "已修改": 2, "未知": 3}
    results.sort(key=lambda r: (
        {"T1": 0, "T2": 1, "T3": 2, "T4": 3}.get(r["tier"], 4),
        status_order.get(r["status"], 5),
        group_order.get(r["group"], 5)
    ))

    # Deduplicate by base title + article, keeping first (best status) version
    seen = set()
    unique_results = []
    for r in results:
        # Strip year markers for dedup key
        import re
        base_title = re.sub(r'[（(]\d{4}.*?[)）]', '', r["title"]).strip()
        key = (base_title, r["article"])
        if key not in seen:
            seen.add(key)
            unique_results.append(r)

    return unique_results[:top], len(results)


def show_law(law_name):
    """Display all provisions of a specific law."""
    idx = load_json("provision-index.json")
    for law_id, data in idx["laws"].items():
        if law_name in data["title"]:
            print(f"\n{'=' * 60}")
            print(f"{data['title']}")
            print(f"  状态: {data['status']}  生效: {data['effective_date']}")
            print(f"  层级: {data['group']}  来源: {data['author']}")
            if data.get("urls"):
                print(f"  NPC: {data['urls'][0]}")
            print(f"{'=' * 60}\n")

            for prov in data["provisions"]:
                ch = f" [{prov['chapter']}]" if prov.get("chapter") else ""
                print(f"  {prov['article']}{ch}")
                print(f"  {prov['text'][:300]}")
                print()
            return

    print(f"Law not found: {law_name}")


def check_currency(law_name):
    """Check the currency status of a law."""
    manifest = load_json("currency-manifest.json")
    for base_name, data in manifest["laws"].items():
        if law_name in base_name:
            print(f"\n{'=' * 60}")
            print(f"法律: {base_name}")
            print(f"Tier: {data['tier']}")
            print(f"版本数: {data['version_count']}")
            print(f"{'=' * 60}")

            cur = data["current"]
            if cur:
                print(f"\n当前版本:")
                print(f"  {cur['title']}")
                print(f"  状态: {cur['status']}")
                print(f"  生效日期: {cur['effective_date']}")
                if cur.get("urls"):
                    print(f"  NPC验证: {cur['urls'][0]}")
            else:
                print(f"\n⚠️ 无有效版本! 需通过 NPC URL 或 MCP 验证最新状态。")

            if data["version_count"] > 1:
                print(f"\n历史版本:")
                for v in data["all_versions"]:
                    if v != cur:
                        print(f"  {v['title']} [{v['status']}] eff={v['effective_date']}")

            if data["referenced_by"]:
                print(f"\n被以下法律引用 ({len(data['referenced_by'])}部):")
                for ref in data["referenced_by"][:10]:
                    print(f"  ← {ref[:60]}")

            if data["references"]:
                print(f"\n引用以下法律 ({len(data['references'])}部):")
                for ref in data["references"][:10]:
                    print(f"  → {ref[:60]}")

            return

    print(f"Law not found: {law_name}")


def show_deps(law_name):
    """Show dependency graph for a law."""
    dep_graph = load_json("dependency-graph.json")
    for node, data in dep_graph["graph"].items():
        if law_name in node:
            print(f"\n{'=' * 60}")
            print(f"法律: {node}")
            print(f"{'=' * 60}")
            if data["references"]:
                print(f"\n引用 ({len(data['references'])}部):")
                for ref in data["references"][:20]:
                    print(f"  → {ref}")
            if data["referenced_by"]:
                print(f"\n被引用 ({len(data['referenced_by'])}部):")
                for ref in data["referenced_by"][:20]:
                    print(f"  ← {ref}")
            return
    print(f"Law not found in dependency graph: {law_name}")


def tier_summary():
    """Show tier distribution summary."""
    manifest = load_json("currency-manifest.json")
    print("\n时效性分级摘要:\n")
    for tier, desc in manifest["meta"]["tier_descriptions"].items():
        count = manifest["meta"]["tier_counts"][tier]
        print(f"  {tier}: {count}部 — {desc}")

    # Show T1 laws
    t1 = [(n, d) for n, d in manifest["laws"].items() if d["tier"] == "T1"]
    print(f"\nT1 核心法律 ({len(t1)}部):")
    for name, data in sorted(t1, key=lambda x: x[1]["current"]["group"] if x[1]["current"] else ""):
        cur = data["current"]
        if cur:
            print(f"  [{cur['group']}] {name[:50]} (eff={cur['effective_date']})")


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        return

    args = sys.argv[1:]
    query = None
    top = 15
    group = None
    tiers = None
    verbose = False
    law_name = None
    check_mode = False
    deps_mode = False
    tier_mode = False

    i = 0
    while i < len(args):
        if args[i] == "--top" and i + 1 < len(args):
            top = int(args[i + 1])
            i += 2
        elif args[i] == "--group" and i + 1 < len(args):
            group = args[i + 1]
            i += 2
        elif args[i] == "--tier" and i + 1 < len(args):
            tiers = set(args[i + 1].split(","))
            i += 2
        elif args[i] == "--verbose":
            verbose = True
            i += 1
        elif args[i] == "--law" and i + 1 < len(args):
            law_name = args[i + 1]
            i += 2
        elif args[i] == "--check" and i + 1 < len(args):
            law_name = args[i + 1]
            check_mode = True
            i += 2
        elif args[i] == "--deps" and i + 1 < len(args):
            law_name = args[i + 1]
            deps_mode = True
            i += 2
        elif args[i] == "--tier-summary":
            tier_mode = True
            i += 1
        else:
            query = args[i]
            i += 1

    if tier_mode:
        tier_summary()
        return

    if check_mode and law_name:
        check_currency(law_name)
        return

    if deps_mode and law_name:
        show_deps(law_name)
        return

    if law_name:
        show_law(law_name)
        return

    if query:
        results, total = search_provisions(query, group=group, tiers=tiers, top=top, verbose=verbose)

        print(f"\n检索: \"{query}\"")
        print(f"找到: {total} 条匹配 (显示前 {len(results)} 条)")
        print(f"{'=' * 60}\n")

        for r in results:
            ch = f" [{r['chapter']}]" if r["chapter"] else ""
            print(f"[{r['tier']}] [{r['group']}] {r['title']}")
            print(f"  {r['article']}{ch}  status={r['status']}  eff={r['effective_date']}")
            if r["urls"]:
                print(f"  NPC: {r['urls'][0]}")
            text = r["text"] if verbose else r["text"][:200]
            print(f"  {text}")
            print()

        # Show tier legend
        print(f"时效性标记: T1=核心·已确认  T2=近期·可信  T3=稳定·可信  T4=待验证·需联网确认")
    else:
        print("请提供检索关键词。使用 --help 查看完整用法。")


if __name__ == "__main__":
    main()
