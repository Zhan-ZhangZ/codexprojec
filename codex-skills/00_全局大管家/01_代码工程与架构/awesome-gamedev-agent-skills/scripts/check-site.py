"""Verify the generated site: unique titles/descriptions, canonical correctness."""
from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "_site")
BASE = (
    sys.argv[2]
    if len(sys.argv) > 2
    else "https://gamedev-skills.github.io/awesome-gamedev-agent-skills"
).rstrip("/")

title_re = re.compile(r"<title>(.*?)</title>", re.S)
desc_re = re.compile(r'<meta name="description" content="(.*?)">', re.S)
canon_re = re.compile(r'<link rel="canonical" href="(.*?)">')

pages = sorted(OUT.rglob("index.html"))
titles, descs, problems = [], [], []

for p in pages:
    t = title_re.search(html := p.read_text(encoding="utf-8"))
    d = desc_re.search(html)
    c = canon_re.search(html)
    rel = p.relative_to(OUT).parent.as_posix()
    expect = f"{BASE}/" if rel == "." else f"{BASE}/{rel}/"

    if not t or not t.group(1).strip():
        problems.append(f"{rel}: missing title")
    else:
        titles.append(t.group(1).strip())
    if not d or not d.group(1).strip():
        problems.append(f"{rel}: missing description")
    else:
        descs.append(d.group(1).strip())
        if len(d.group(1)) > 165:
            problems.append(f"{rel}: description {len(d.group(1))} chars (>165)")
    if not c:
        problems.append(f"{rel}: missing canonical")
    elif c.group(1) != expect:
        problems.append(f"{rel}: canonical {c.group(1)!r} != {expect!r}")
    if 'lang="en"' not in html:
        problems.append(f"{rel}: missing lang attribute")
    if 'class="skip"' not in html:
        problems.append(f"{rel}: missing skip link")

print(f"pages checked: {len(pages)}")
print(f"unique titles: {len(set(titles))}/{len(titles)}")
print(f"unique descriptions: {len(set(descs))}/{len(descs)}")

for label, values in (("title", titles), ("description", descs)):
    dupes = [v for v, n in Counter(values).items() if n > 1]
    for v in dupes:
        problems.append(f"duplicate {label}: {v[:80]!r}")

sitemap = (OUT / "sitemap.xml").read_text(encoding="utf-8")
locs = re.findall(r"<loc>(.*?)</loc>", sitemap)
print(f"sitemap urls: {len(locs)} (unique {len(set(locs))})")
canons = {canon_re.search(p.read_text(encoding='utf-8')).group(1) for p in pages}
missing = canons - set(locs)
if missing:
    problems.append(f"{len(missing)} canonical URLs absent from sitemap")
if not (OUT / "robots.txt").is_file():
    problems.append("robots.txt missing")
if not (OUT / "styles.css").is_file():
    problems.append("styles.css missing")

if problems:
    print(f"\nFAILED — {len(problems)} problem(s):")
    for pr in problems[:30]:
        print(f"  - {pr}")
    sys.exit(1)
print("\nAll checks passed.")
