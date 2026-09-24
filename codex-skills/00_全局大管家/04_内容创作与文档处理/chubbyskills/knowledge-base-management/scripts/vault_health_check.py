#!/usr/bin/env python3
"""
Obsidian 知识库健康检查（通用版，零依赖）

扫描一个 Obsidian vault，报告：
  - 断链（broken wikilinks）：[[...]] 指向不存在的笔记
  - frontmatter 缺失 / 缺 source / 缺 summary
  - 孤立笔记（无任何入链，索引页除外）
  - 空目录
  - 内容重复（SHA256 相同的副本）
  - 文件名含空格（Obsidian wikilink 易断裂）

用法：
    python vault_health_check.py ~/Documents/my-vault
    python vault_health_check.py            # 读 VAULT_DIR 环境变量
    python vault_health_check.py <vault> --json
    python vault_health_check.py <vault> --require-source   # 把缺 source 视为问题

退出码：存在断链时返回 1（方便 cron / CI 告警），否则 0。
"""

import sys
import os
import re
import json
import hashlib
import argparse
from collections import defaultdict


WIKILINK = re.compile(r"\[\[([^\]]+)\]\]")
INDEX_NAMES = {"index", "readme", "home", "moc"}


def find_md_files(vault):
    out = []
    for root, dirs, files in os.walk(vault):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for f in files:
            if f.endswith(".md"):
                out.append(os.path.join(root, f))
    return out


def parse_frontmatter(text):
    """极简 YAML frontmatter 解析：返回顶层 key→原始值 dict，无则 None。"""
    if not text.startswith("---"):
        return None
    end = text.find("\n---", 3)
    if end == -1:
        return None
    block = text[3:end].strip("\n")
    fm = {}
    for line in block.split("\n"):
        m = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", line)
        if m:
            fm[m.group(1)] = m.group(2).strip()
    return fm


def link_target(raw):
    """从 wikilink 内容取出目标笔记名（去掉 |别名、#标题、^block）。"""
    target = raw.split("|")[0].split("#")[0].split("^")[0].strip()
    # 取 basename（Obsidian 短链常省略路径）
    return os.path.basename(target)


def stem_lower(path):
    return os.path.splitext(os.path.basename(path))[0].lower()


def check_vault(vault, require_source=False):
    md_files = find_md_files(vault)
    # 笔记名索引（小写 basename → 是否存在）
    known = {stem_lower(p) for p in md_files}

    broken = []          # (file, target)
    missing_fm = []      # file
    missing_source = []  # file
    missing_summary = []  # file
    spaced_names = []    # file
    inbound = defaultdict(int)
    hashes = defaultdict(list)  # content_hash → [file]

    for path in md_files:
        rel = os.path.relpath(path, vault)
        with open(path, encoding="utf-8", errors="replace") as f:
            text = f.read()

        # 重复检测（按正文 hash）
        body = text
        h = hashlib.sha256(body.encode("utf-8", "replace")).hexdigest()
        hashes[h].append(rel)

        # 文件名含空格
        if " " in os.path.basename(path):
            spaced_names.append(rel)

        # frontmatter
        fm = parse_frontmatter(text)
        if fm is None:
            missing_fm.append(rel)
        else:
            if "source" not in fm:
                missing_source.append(rel)
            if "summary" not in fm:
                missing_summary.append(rel)

        # wikilinks → 断链 + 入链统计
        for raw in WIKILINK.findall(text):
            tgt = link_target(raw)
            if not tgt:
                continue
            if tgt.lower() in known:
                inbound[tgt.lower()] += 1
            else:
                broken.append((rel, raw.strip()))

    # 孤立笔记：无入链且不是索引页
    orphans = []
    for path in md_files:
        s = stem_lower(path)
        if inbound.get(s, 0) == 0 and s not in INDEX_NAMES:
            orphans.append(os.path.relpath(path, vault))

    # 空目录
    empty_dirs = []
    for root, dirs, files in os.walk(vault):
        if os.path.basename(root).startswith("."):
            continue
        visible = [f for f in files if not f.startswith(".")]
        sub = [d for d in dirs if not d.startswith(".")]
        if not visible and not sub:
            empty_dirs.append(os.path.relpath(root, vault))

    duplicates = {h: fs for h, fs in hashes.items() if len(fs) > 1}

    return {
        "total_files": len(md_files),
        "broken_links": [{"file": f, "target": t} for f, t in broken],
        "missing_frontmatter": missing_fm,
        "missing_source": missing_source if require_source else [],
        "missing_summary": missing_summary,
        "orphans": orphans,
        "empty_dirs": empty_dirs,
        "duplicates": list(duplicates.values()),
        "spaced_filenames": spaced_names,
    }


def print_report(r):
    def section(emoji, title, items, fmt):
        print(f"\n{emoji} {title}：{len(items)}")
        for it in items[:30]:
            print(f"   - {fmt(it)}")
        if len(items) > 30:
            print(f"   ... 还有 {len(items) - 30} 条")

    print("=" * 56)
    print(f"📚 知识库健康检查报告 | 共 {r['total_files']} 篇笔记")
    print("=" * 56)
    section("🔴", "断链", r["broken_links"],
            lambda x: f"{x['file']} → [[{x['target']}]]")
    section("🟡", "缺 frontmatter", r["missing_frontmatter"], lambda x: x)
    if r["missing_source"]:
        section("🟡", "缺 source 字段", r["missing_source"], lambda x: x)
    section("🟠", "缺 summary 字段", r["missing_summary"], lambda x: x)
    section("🔵", "孤立笔记（无入链）", r["orphans"], lambda x: x)
    section("🔵", "空目录", r["empty_dirs"], lambda x: x)
    section("🟠", "文件名含空格", r["spaced_filenames"], lambda x: x)
    section("🟡", "内容重复", r["duplicates"], lambda x: " == ".join(x))

    issues = (len(r["broken_links"]) + len(r["missing_frontmatter"])
              + len(r["orphans"]) + len(r["duplicates"]))
    print("\n" + "=" * 56)
    print(f"{'✅ 未发现严重问题' if issues == 0 else f'⚠️  发现 {issues} 项需关注'}")
    print("=" * 56)


def main():
    parser = argparse.ArgumentParser(description="Obsidian 知识库健康检查")
    parser.add_argument("vault", nargs="?", default=os.environ.get("VAULT_DIR"),
                        help="vault 目录（默认读 VAULT_DIR 环境变量）")
    parser.add_argument("--json", action="store_true", help="输出 JSON")
    parser.add_argument("--require-source", action="store_true",
                        help="把缺 source 字段视为问题")
    args = parser.parse_args()

    if not args.vault:
        print("❌ 请提供 vault 路径，或设置 VAULT_DIR 环境变量", file=sys.stderr)
        sys.exit(2)
    if not os.path.isdir(args.vault):
        print(f"❌ 目录不存在：{args.vault}", file=sys.stderr)
        sys.exit(2)

    r = check_vault(args.vault, require_source=args.require_source)
    if args.json:
        print(json.dumps(r, ensure_ascii=False, indent=2))
    else:
        print_report(r)

    sys.exit(1 if r["broken_links"] else 0)


if __name__ == "__main__":
    main()
