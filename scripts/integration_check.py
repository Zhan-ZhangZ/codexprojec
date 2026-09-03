r"""
integration_check.py  —  技能集成准入检查器（客观项）

只负责机械可判定的客观检查：
  1. SKILL.md 存在性（技能入口，大管家路由依赖）
  2. 路径长度（Windows MAX_PATH=260，按 UTF-16 字符计；客户典型安装前缀
     C:\Users\<user>\.codex\skills\codex-skills\ 约 41 字符）
  3. 跨类目重名（防止同一技能被重复集成到多个类目）

注意：无价值文件（上游评测产物、构建缓存等）的剔除**不属于本脚本职责**，
必须由 AI 在集成时逐目录判断价值后决定，详见
.agents/skills/codex-skills-development-rules/references/01_integration.md

用法:
    python3 scripts/integration_check.py <技能文件夹路径>          # 客观项检查
    python3 scripts/integration_check.py <技能文件夹路径> --refs   # 追加死链扫描

退出码:
    0 = 通过（可以有警告）
    1 = 拒绝集成（存在超长路径 / 缺少 SKILL.md / 与库内技能重名）

注意：--refs 报告的死链只是客观事实（引用指向不存在的文件）；
每条死链是「集成引入」还是「上游固有」、该补齐文档还是改写引用，
必须由 AI 对照上游原树逐条判断处置（见集成规则 01_integration.md）。
"""

import os
import re
import sys
import argparse

# ── 阈值配置 ──────────────────────────────────────────────────────────────────
# 硬性上限：客户机前缀 41 字符（用户名 dell 实测）+ 219 = 260（Windows MAX_PATH）
HARD_LIMIT = 219
# 警告阈值：用户名更长 / OneDrive 重定向等场景下，前缀可能再 +10~20 字符
WARN_LIMIT = 200


def find_library_root(root):
    """从技能文件夹向上找到 codex-skills 库根（含 skills_manifest.json 的目录）。"""
    cur = root
    while cur != os.path.dirname(cur):
        if os.path.isfile(os.path.join(cur, 'skills_manifest.json')):
            return cur
        cur = os.path.dirname(cur)
    return None


def collect_files(root, lib_root):
    """收集 root 下所有文件相对【库根】的路径（客户实际解压路径口径，POSIX 分隔符）。"""
    result = []
    for dirpath, dirnames, filenames in os.walk(root):
        for fn in filenames:
            rel = os.path.relpath(os.path.join(dirpath, fn), lib_root)
            result.append(rel.replace(os.sep, '/'))
    return result


def check_duplicate_name(root, skills_base):
    """检查技能文件夹名是否与库内已有技能重名（跨类目重复集成）。"""
    name = os.path.basename(os.path.normpath(root))
    hits = []
    for cat in sorted(os.listdir(skills_base)):
        cat_path = os.path.join(skills_base, cat)
        if not os.path.isdir(cat_path):
            continue
        candidate = os.path.join(cat_path, name)
        if os.path.isdir(candidate) and os.path.abspath(candidate) != os.path.abspath(root):
            hits.append(f'{cat}/{name}')
    return name, hits


# 相对引用提取：markdown 链接目标 + 反引号内带扩展名的相对路径（跳过 URL/锚点）
_REF_PATTERNS = [
    re.compile(r'\]\(([^)\s]+)\)'),                                    # ](path)
    re.compile(r'`(\.{0,2}/[\w\-./]+\.[a-zA-Z]\w{0,3})`'),            # `./path.md`
    re.compile(r'(?:^|[\s`(\[])((?:\./)?[\w\-]+(?:/[\w\-.]+)+\.[a-zA-Z]\w{0,3})(?=[\s`)`\]:，。；]|$)', re.M),  # 裸路径
    re.compile(r'`([\w\-.]+\.(?:md|py|json|sh|toml|ya?ml|txt|cfg|csv|js|ts))`'),  # `MODE_REGISTRY.md` 裸文件名
]
# 扩展名一律字母开头：排除 `evidence-row/1.0` 这类版本化 schema ID 被当作路径
# 反引号/链接里的裸文件名（无目录前缀，如 `MODE_REGISTRY.md`）：单独放行，
# 否则不含 / 的引用会被下面的过滤跳过而漏检（2026-09 ARS 漏文件事故的根因）
_BARE_FILENAME = re.compile(r'[\w\-.]+\.(?:md|py|json|sh|toml|ya?ml|txt|cfg|csv|js|ts)')
_SKIP_PREFIX = ('http://', 'https://', '#', 'mailto:', 'data:')


def scan_dead_refs(root):
    """扫描保留集 md/json 中的相对路径引用，返回 [(引用文件, 引用, 目标候选)] 死链列表。

    解析基准：引用文件所在目录、技能根（两种都试，任一存在即视为有效）；
    不含目录的裸文件名（如 `MODE_REGISTRY.md`）额外按 basename 全树索引解析——
    上游文档常用 "hooks.json" 指代 "hooks/hooks.json" 这类同树简写。
    """
    dead = []
    basenames = set()
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d != '.git']
        for fn in filenames:
            basenames.add(fn)
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d != '.git']
        for fn in filenames:
            if not fn.endswith(('.md', '.json')):
                continue
            fpath = os.path.join(dirpath, fn)
            rel_f = os.path.relpath(fpath, root)
            try:
                text = open(fpath, encoding='utf-8').read()
            except Exception:
                continue
            refs = set()
            for pat in _REF_PATTERNS:
                for m in pat.finditer(text):
                    r = m.group(1)
                    # markdown 链接锚点（path.md#section）只针对文件部分做存在性检查
                    r = r.split('#', 1)[0] or r
                    if r.startswith(_SKIP_PREFIX):
                        continue
                    # 不含 / 的裸词默认不算路径引用；但形如 `MODE_REGISTRY.md` 的
                    # 裸文件名（反引号或链接目标）是真实引用，需参与存在性检查
                    if '/' not in r and not r.startswith('.') and not _BARE_FILENAME.fullmatch(r):
                        continue
                    refs.add(r)
            for ref in sorted(refs):
                if ref.startswith('/'):
                    continue  # 绝对路径（示例占位 /work/proj/... 等）不做包内检查
                # basename 全树兜底：上游文档常跨目录简写引用（如 `templates/x.md`
                # 实际位于 academic-paper-reviewer/templates/）。文件已随包即不算缺失，
                # 门禁只负责查漏文件，不裁决上游相对路径的措辞问题。
                if os.path.basename(ref) in basenames:
                    continue
                cands = [os.path.normpath(os.path.join(os.path.dirname(fpath), ref)),
                         os.path.normpath(os.path.join(root, ref))]
                if not any(os.path.exists(c) for c in cands):
                    dead.append((rel_f, ref))
    return dead


def main():
    parser = argparse.ArgumentParser(description='技能集成准入检查（客观项）')
    parser.add_argument('target', help='待检查的技能文件夹路径')
    parser.add_argument('--refs', action='store_true',
                        help='追加死链扫描：列出保留集 md/json 中指向不存在文件的相对引用')
    args = parser.parse_args()

    root = os.path.abspath(args.target)
    if not os.path.isdir(root):
        print(f'错误：目录不存在 {root}')
        sys.exit(1)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    skills_base = os.path.join(os.path.dirname(script_dir), 'codex-skills', '00_全局大管家')

    # 路径长度必须按「库根 → 文件」口径计算（客户解压后即 codex-skills/... 起始）
    lib_root = find_library_root(root)
    if lib_root is None:
        print('错误：目标不在 codex-skills 库内（未找到 skills_manifest.json 的上级链）。'
              '请先将技能文件夹放入对应类目后再检查。')
        sys.exit(1)

    print(f'=== 技能集成准入检查: {os.path.basename(root)} ===')
    print(f'    库内位置: {os.path.relpath(root, lib_root)}\n')
    rejected = False

    # ── 检查 1：SKILL.md 存在性 ──
    if not os.path.isfile(os.path.join(root, 'SKILL.md')):
        print('  [拒绝] 缺少 SKILL.md —— 技能入口文件不存在，无法被大管家路由')
        rejected = True
    else:
        print('  [通过] SKILL.md 存在')

    # ── 检查 2：路径长度（相对库根，字符口径） ──
    files = collect_files(root, lib_root)
    warns, rejects = [], []
    longest = 0
    for f in files:
        n = len(f)
        longest = max(longest, n)
        if n > HARD_LIMIT:
            rejects.append(f'{n} 字符  {f}')
        elif n > WARN_LIMIT:
            warns.append(f'{n} 字符  {f}')
    print(f'  [信息] 共 {len(files)} 个文件，最长相对路径 {longest} 字符 '
          f'(警告阈值 {WARN_LIMIT} / 硬性上限 {HARD_LIMIT})')
    if rejects:
        rejected = True
        print(f'\n  [拒绝] {len(rejects)} 个文件超过硬性上限 {HARD_LIMIT} 字符，'
              '客户机解压/安装必然失败：')
        for line in sorted(rejects, reverse=True)[:10]:
            print(f'    {line}')
        if len(rejects) > 10:
            print(f'    ... 及另外 {len(rejects) - 10} 个文件')
        print('    处理建议：缩短技能内部目录嵌套，或删除深层无价值文件后重新检查。')
    elif warns:
        print(f'  [警告] {len(warns)} 个文件超过 {WARN_LIMIT} 字符（客户机前缀稍长即超限）：')
        for line in sorted(warns, reverse=True)[:5]:
            print(f'    {line}')

    # ── 检查 3：重名重复集成 ──
    name, dup_hits = check_duplicate_name(root, skills_base)
    if dup_hits:
        rejected = True
        print(f'\n  [拒绝] 技能文件夹名 "{name}" 已存在于其它类目，禁止重复集成：')
        for h in dup_hits:
            print(f'    {h}')
    else:
        print('  [通过] 无重名重复集成')

    # ── 检查 4（--refs）：死链扫描（客观事实罗列，性质判定与处置由 AI 执行） ──
    if args.refs:
        dead = scan_dead_refs(root)
        print(f'\n  [死链扫描] 保留集 md/json 中指向不存在文件的相对引用: {len(dead)} 处')
        for f, r in dead[:15]:
            print(f'    {f} -> {r}')
        if len(dead) > 15:
            print(f'    ... 及另外 {len(dead) - 15} 处')
        if dead:
            print('    处置要求（由 AI 逐条判断，见集成规则 01_integration.md）：')
            print('    - 目标为本次集成删除的文件 → 补齐必要文档或改写引用，必须归零；')
            print('    - 上游原树即缺失 → 保留原貌，提交信息中披露数量。')

    # ── 结论 ──
    print('\n' + '=' * 60)
    if rejected:
        print('结论：❌ 拒绝集成 —— 请按上述 [拒绝] 项整改后重新检查')
        sys.exit(1)
    print('结论：✅ 客观项通过。（无价值文件的价值判断由 AI 按集成规则执行，不在本脚本范围）')
    sys.exit(0)


if __name__ == '__main__':
    main()
