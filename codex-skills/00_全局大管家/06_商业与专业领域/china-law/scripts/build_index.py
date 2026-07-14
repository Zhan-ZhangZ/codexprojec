#!/usr/bin/env python3
"""
Build comprehensive law search index from local Chinese law database.

Phases:
  1. Parse all 2,190 law Markdown files into provision-level full-text index
  2. Build currency manifest with tier classification + NPC URLs
  3. Build law dependency graph from 《XXX》 cross-references

Output:
  laws/provision-index.json   — every provision, searchable
  laws/currency-manifest.json — per-law currency status + verification URLs
  laws/dependency-graph.json  — which laws reference which
"""

import json
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
LAWS_DIR = BASE_DIR / "laws"

# ── Tier 1: core laws that must always be verified ──────────────────────────
T1_CORE_LAWS = {
    # 劳动用工
    "中华人民共和国劳动法", "中华人民共和国劳动合同法",
    "中华人民共和国社会保险法", "中华人民共和国劳动争议调解仲裁法",
    "工伤保险条例", "职工带薪年休假条例", "女职工劳动保护特别规定",
    "劳动合同法实施条例", "保障农民工工资支付条例",
    # 民法典及相关
    "中华人民共和国民法典",
    # 公司治理
    "中华人民共和国公司法", "中华人民共和国外商投资法",
    "中华人民共和国企业破产法", "中华人民共和国合伙企业法",
    # 数据/隐私
    "中华人民共和国个人信息保护法", "中华人民共和国数据安全法",
    "中华人民共和国网络安全法",
    # 知识产权
    "中华人民共和国专利法", "中华人民共和国商标法", "中华人民共和国著作权法",
    "中华人民共和国反不正当竞争法",
    # 诉讼/仲裁
    "中华人民共和国民事诉讼法", "中华人民共和国仲裁法",
    "中华人民共和国刑事诉讼法", "中华人民共和国行政诉讼法",
    # 行政
    "中华人民共和国行政处罚法", "中华人民共和国行政复议法",
    "中华人民共和国行政强制法", "中华人民共和国行政许可法",
    # 基础
    "中华人民共和国立法法", "中华人民共和国宪法",
    "中华人民共和国电子商务法", "中华人民共和国电子签名法",
    "中华人民共和国涉外民事关系法律适用法",
    # 关键司法解释
    "最高人民法院关于审理劳动争议案件适用法律问题的解释",
    "最高人民法院关于适用《中华人民共和国民法典》合同编通则若干问题的解释",
    "最高人民法院关于适用《中华人民共和国民法典》有关担保制度的解释",
    "最高人民法院关于适用《中华人民共和国民法典》侵权责任编的解释",
    "最高人民法院关于审理侵犯专利权纠纷案件应用法律若干问题的解释",
    "最高人民法院关于审理商标民事纠纷案件适用法律若干问题的解释",
    "最高人民法院关于审理著作权民事纠纷案件适用法律若干问题的解释",
    "最高人民法院关于适用《中华人民共和国公司法》若干问题的规定",
    "最高人民法院关于适用《中华人民共和国民事诉讼法》的解释",
}

# ── Helpers ─────────────────────────────────────────────────────────────────

def strip_year_markers(title):
    """Remove year/amendment markers to get the base law name."""
    return re.sub(r'[（(]\d{4}.*?[)）]', '', title).strip()

def chinese_to_int(s):
    """Convert Chinese numeral string to integer."""
    map_cn = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
              '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
              '百': 100, '千': 1000}
    if not s:
        return 0
    if s.isdigit():
        return int(s)
    total = 0
    current = 0
    for ch in s:
        if ch == '十':
            total += (current if current > 0 else 1) * 10
            current = 0
        elif ch == '百':
            total += (current if current > 0 else 1) * 100
            current = 0
        elif ch == '千':
            total += (current if current > 0 else 1) * 1000
            current = 0
        else:
            current = map_cn.get(ch, 0)
    total += current
    return total

def parse_frontmatter(content):
    """Parse YAML frontmatter from markdown content."""
    if not content.startswith('---'):
        return {}, content
    parts = content.split('---', 2)
    if len(parts) < 3:
        return {}, content
    try:
        import yaml
        meta = yaml.safe_load(parts[1]) or {}
    except Exception:
        meta = {}
    return meta, parts[2]

# ── Article splitting ───────────────────────────────────────────────────────

ARTICLE_PATTERN = re.compile(
    r'(?:^|\n)\s*(?:-\s*\*\*)?第([一二三四五六七八九十百千\d]+)条'
    r'(?:之([一二三四五六七八九十百千\d]+))?\*\*?\s*[　\s]*'
)

CHAPTER_PATTERN = re.compile(
    r'^#{1,3}\s*(第[一二三四五六七八九十百千\d]+[章节编]|附\s*则).*$',
    re.MULTILINE
)

SECTION_PATTERN = re.compile(
    r'^#{1,3}\s*(第[一二三四五六七八九十百千\d]+节).*$',
    re.MULTILINE
)

NUMBERED_ITEM_PATTERN = re.compile(
    r'(?:^|\n)\s*[（(]?([一二三四五六七八九十]+)[）)]\s*[、.]?\s*'
)


def split_articles(body):
    """Split law body text into individual provisions (第X条)."""
    # Find all article markers with their positions
    articles = []
    for m in ARTICLE_PATTERN.finditer(body):
        num = m.group(1)
        sub = m.group(2)
        full_num = f"第{num}条" + (f"之{sub}" if sub else "")
        articles.append((m.start(), full_num))

    if not articles:
        return []

    # Find chapter/section markers
    chapters = []
    for m in CHAPTER_PATTERN.finditer(body):
        chapters.append((m.start(), m.group(1)))
    for m in SECTION_PATTERN.finditer(body):
        chapters.append((m.start(), m.group(1)))
    chapters.sort()

    result = []
    for i, (pos, num) in enumerate(articles):
        start = pos
        end = articles[i + 1][0] if i + 1 < len(articles) else len(body)
        text = body[start:end].strip()

        # Clean up: remove the article marker line prefix, keep the text
        text = re.sub(r'^.*?第[一二三四五六七八九十百千\d]+条(?:之[一二三四五六七八九十百千\d]+)?\*\*?\s*[　\s]*', '', text, count=1)

        # Find which chapter this belongs to
        chapter = ""
        for j in range(len(chapters) - 1, -1, -1):
            if chapters[j][0] < pos:
                chapter = chapters[j][1]
                break

        # Clean whitespace
        text = re.sub(r'\n{3,}', '\n\n', text).strip()

        if text:
            result.append({
                "article": num,
                "chapter": chapter,
                "text": text
            })

    return result


def split_numbered_items(body):
    """Split by 一、二、三、 numbered items (fallback for 司法解释 etc.)."""
    items = []
    for m in NUMBERED_ITEM_PATTERN.finditer(body):
        items.append((m.start(), m.group(1)))

    if len(items) < 2:
        return []

    result = []
    for i, (pos, num) in enumerate(items):
        start = pos
        end = items[i + 1][0] if i + 1 < len(items) else len(body)
        text = body[start:end].strip()
        # Clean the number prefix
        text = re.sub(r'^[（(]?[一二三四五六七八九十]+[）)]\s*[、.]?\s*', '', text)
        text = re.sub(r'\n{3,}', '\n\n', text).strip()
        if text:
            result.append({
                "article": f"第{num}项",
                "chapter": "",
                "text": text[:2000]  # cap very long items
            })

    return result


# ── Reference extraction ────────────────────────────────────────────────────

REF_PATTERN = re.compile(r'《([^》]+)》')


def extract_references(body):
    """Extract law titles referenced via 《XXX》 markers."""
    refs = set()
    for m in REF_PATTERN.finditer(body):
        ref = m.group(1)
        # Filter out non-law references (numbers, short strings)
        if len(ref) >= 4 and not ref.startswith('http'):
            refs.add(ref)
    return sorted(refs)


# ── Tier classification ────────────────────────────────────────────────────

def classify_tier(base_name, status, effective_date, latest_effective_date):
    """Classify a law into verification tier."""
    # Check if it's a core law
    for core in T1_CORE_LAWS:
        if core in base_name or base_name in core:
            return "T1"

    if status in ("未知", "尚未生效"):
        return "T4"

    if status == "已修改":
        return "T4"

    if not effective_date:
        return "T4"

    # T2: effective within 3 years
    if effective_date >= "2023-01-01":
        return "T2"

    # T3: older but marked effective
    if status == "有效":
        return "T3"

    return "T4"


# ── Main build ──────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("Building China Law Search Index")
    print("=" * 60)

    # Load existing index
    with open(LAWS_DIR / "law-index.json") as f:
        law_index = json.load(f)

    print(f"\nTotal laws in index: {len(law_index)}")

    # Phase 1: Parse all laws
    print("\n[Phase 1] Parsing law files...")
    laws_data = {}
    total_provisions = 0
    group_stats = Counter()
    parse_methods = Counter()

    for item in law_index:
        file_path = LAWS_DIR / item["file"]
        if not file_path.exists():
            continue

        try:
            with open(file_path) as f:
                content = f.read()
        except Exception:
            continue

        meta, body = parse_frontmatter(content)
        law_id = item["file"].split("/")[-1].replace(".md", "")
        group = item["group"]
        group_stats[group] += 1

        # Try article-level splitting first
        provisions = split_articles(body)

        if provisions:
            parse_methods["article"] += 1
        else:
            # Fall back to numbered items
            provisions = split_numbered_items(body)
            if provisions:
                parse_methods["numbered_items"] += 1
            else:
                parse_methods["full_text"] += 1
                # Store as single entry
                clean_body = re.sub(r'\n{3,}', '\n\n', body).strip()
                provisions = [{
                    "article": "全文",
                    "chapter": "",
                    "text": clean_body[:3000]
                }]

        total_provisions += len(provisions)

        # Extract references
        references = extract_references(body)

        # Merge frontmatter metadata
        laws_data[law_id] = {
            "title": meta.get("title", item.get("title", "")),
            "link_title": meta.get("LinkTitle", ""),
            "base_name": strip_year_markers(meta.get("title", item.get("title", ""))),
            "group": group,
            "status": meta.get("status", item.get("status", "未知")),
            "effective_date": meta.get("effective_date", item.get("effective_date", "")),
            "publication_date": meta.get("publication_date", item.get("publication_date", "")),
            "author": meta.get("author", item.get("author", "")),
            "categories": meta.get("categories", item.get("categories", [])),
            "keywords": meta.get("keywords", item.get("keywords", [])),
            "tags": meta.get("tags", item.get("tags", [])),
            "years": meta.get("years", item.get("years", [])),
            "urls": meta.get("urls", []),
            "file": item["file"],
            "provisions": provisions,
            "references": references,
        }

    print(f"  Laws parsed: {len(laws_data)}")
    print(f"  Total provisions: {total_provisions}")
    print(f"  By group: {dict(group_stats)}")
    print(f"  Parse methods: {dict(parse_methods)}")

    # Phase 2: Build currency manifest
    print("\n[Phase 2] Building currency manifest...")

    # Group by base name
    base_groups = defaultdict(list)
    for law_id, data in laws_data.items():
        base_groups[data["base_name"]].append({
            "law_id": law_id,
            "title": data["title"],
            "status": data["status"],
            "effective_date": data["effective_date"],
            "publication_date": data["publication_date"],
            "group": data["group"],
            "urls": data["urls"],
            "file": data["file"],
        })

    currency_manifest = {}
    tier_counts = Counter()

    for base_name, versions in base_groups.items():
        # Sort by effective_date descending
        versions.sort(key=lambda v: v["effective_date"] or "", reverse=True)

        # Find the latest "有效" version
        effective_versions = [v for v in versions if v["status"] == "有效"]
        latest_effective = effective_versions[0] if effective_versions else None

        # Determine tier
        latest_date = latest_effective["effective_date"] if latest_effective else ""
        representative_status = latest_effective["status"] if latest_effective else versions[0]["status"]
        tier = classify_tier(base_name, representative_status, latest_date, latest_date)
        tier_counts[tier] += 1

        # Build dependency info (populated in Phase 3)
        currency_manifest[base_name] = {
            "tier": tier,
            "current": latest_effective,
            "all_versions": versions,
            "version_count": len(versions),
            "referenced_by": [],   # filled in Phase 3
            "references": [],      # filled in Phase 3
            "last_verified": None,
        }

    print(f"  Unique base laws: {len(currency_manifest)}")
    print(f"  Tier distribution: {dict(tier_counts)}")

    # Phase 3: Build dependency graph
    print("\n[Phase 3] Building dependency graph...")

    dep_graph = defaultdict(lambda: {"references": [], "referenced_by": []})

    for law_id, data in laws_data.items():
        base = data["base_name"]
        for ref in data["references"]:
            dep_graph[base]["references"].append(ref)

    # Build reverse edges (referenced_by) — collect first, then write
    reverse_edges = defaultdict(list)
    for base, info in list(dep_graph.items()):
        for ref in info["references"]:
            reverse_edges[ref].append(base)

    for ref, bases in reverse_edges.items():
        dep_graph[ref]["referenced_by"] = bases

    # Link to currency manifest
    for base_name, manifest in currency_manifest.items():
        if base_name in dep_graph:
            manifest["references"] = dep_graph[base_name]["references"][:30]
            manifest["referenced_by"] = dep_graph[base_name]["referenced_by"][:50]

    # Count edges
    total_refs = sum(len(v["references"]) for v in dep_graph.values())
    total_backrefs = sum(len(v["referenced_by"]) for v in dep_graph.values())
    print(f"  Nodes: {len(dep_graph)}")
    print(f"  Forward references: {total_refs}")
    print(f"  Back references: {total_backrefs}")

    # Write outputs
    print("\n[Writing output files...]")

    # Provision index
    output_index = {
        "meta": {
            "total_laws": len(laws_data),
            "total_provisions": total_provisions,
            "parse_methods": dict(parse_methods),
            "group_stats": dict(group_stats),
        },
        "laws": laws_data,
    }

    index_path = LAWS_DIR / "provision-index.json"
    with open(index_path, "w") as f:
        json.dump(output_index, f, ensure_ascii=False, indent=2)
    print(f"  ✓ {index_path}")

    # Currency manifest
    manifest_output = {
        "meta": {
            "total_base_laws": len(currency_manifest),
            "tier_counts": dict(tier_counts),
            "tier_descriptions": {
                "T1": "核心法律 — 每次查询都验证 NPC URL + MCP",
                "T2": "近期生效（3年内）— 信任索引，30天验证一次",
                "T3": "稳定法律（5年+）— 信任索引，按需验证",
                "T4": "不确定 — 每次都验证",
            },
        },
        "laws": currency_manifest,
    }

    manifest_path = LAWS_DIR / "currency-manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest_output, f, ensure_ascii=False, indent=2)
    print(f"  ✓ {manifest_path}")

    # Dependency graph
    dep_output = {
        "meta": {
            "total_nodes": len(dep_graph),
            "total_edges": total_refs,
        },
        "graph": {k: dict(v) for k, v in dep_graph.items()},
    }

    dep_path = LAWS_DIR / "dependency-graph.json"
    with open(dep_path, "w") as f:
        json.dump(dep_output, f, ensure_ascii=False, indent=2)
    print(f"  ✓ {dep_path}")

    # Summary
    print(f"\n{'=' * 60}")
    print("Build complete!")
    print(f"  provisions:  {total_provisions:,}")
    print(f"  laws:        {len(laws_data):,}")
    print(f"  base laws:   {len(currency_manifest):,}")
    print(f"  T1 (core):   {tier_counts['T1']}")
    print(f"  T2 (recent): {tier_counts['T2']}")
    print(f"  T3 (stable): {tier_counts['T3']}")
    print(f"  T4 (uncertain): {tier_counts['T4']}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
