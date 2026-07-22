"""
repack_incremental_7z.py  —  增量打包脚本（7z 格式）

用法:
    python3 scripts/repack_incremental_7z.py -b <baseline_commit> -v <版本号>

示例:
    python3 scripts/repack_incremental_7z.py -b HEAD~1 -v 1.5.0
    python3 scripts/repack_incremental_7z.py -b 4461afb -v 1.5.1

输出:
    增量包文件夹/codex-skills-incremental-from-<base>-to-<head>_<timestamp>_v<version>.7z

流程:
    1. 通过 git diff 计算相对 baseline 新增/修改/删除的文件
    2. 写入临时目录，连同 README.md / release_log.txt / deleted_files.txt
    3. 调用 7z 将临时目录压缩为 7z 包
    4. 校验后重命名为最终输出，并清理旧包（保留最近 2 份）
"""

import os
import subprocess
import datetime
import shutil
import argparse
import sys
import tempfile

# ── 路径配置 ──────────────────────────────────────────────────────────────────
SCRIPT_DIR     = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR     = os.path.dirname(SCRIPT_DIR)
SOURCE_DIR     = os.path.join(PARENT_DIR, 'codex-skills')
BACKUP_DIR     = os.path.join(PARENT_DIR, '备份包文件夹')
INCREMENTAL_DIR = os.path.join(PARENT_DIR, '增量包文件夹')

# 7z 可执行文件：Keka 的 keka7zz 实际是 GUI 封装，不支持命令行调用，直接使用系统版 7z
_SYS_7Z  = shutil.which('7z') or shutil.which('7zz')
BIN_7Z   = _SYS_7Z

# 排除目录（用于 git diff 过滤）
EXCLUDE_DIRS  = {'.git', '.github', '__pycache__', 'node_modules', '.DS_Store',
                 '__MACOSX', '.vscode', '.idea', '15_社科研究与实证工具'}
EXCLUDE_FILES = {'.DS_Store'}

# ── 工具函数 ──────────────────────────────────────────────────────────────────
def run(args, **kwargs):
    res = subprocess.run(args, capture_output=True, text=True, **kwargs)
    if res.returncode != 0:
        raise RuntimeError(
            f"Command failed: {' '.join(str(a) for a in args)}\n"
            f"stdout: {res.stdout}\nstderr: {res.stderr}"
        )
    return res.stdout


def should_exclude(path):
    parts = os.path.relpath(path, PARENT_DIR).split(os.sep)
    for part in parts:
        if part in EXCLUDE_DIRS or part.startswith('._'):
            return True
    filename = os.path.basename(path)
    return filename in EXCLUDE_FILES or filename.startswith('._')


def cleanup_old_incremental():
    """只保留最近 2 份增量包，删除更早的。"""
    if not os.path.exists(INCREMENTAL_DIR):
        return
    packs = sorted(
        [os.path.join(INCREMENTAL_DIR, f) for f in os.listdir(INCREMENTAL_DIR)
         if f.startswith('codex-skills-incremental-') and f.endswith('.7z')
         and '_new' not in f],
        key=os.path.getmtime, reverse=True
    )
    for old in packs[2:]:
        print(f"  删除旧增量包: {old}")
        try:
            os.remove(old)
        except Exception as e:
            print(f"  警告: 无法删除 {old}: {e}")


# ── Git 分析 ──────────────────────────────────────────────────────────────────
def get_changes(base_ref):
    if not os.path.exists(os.path.join(PARENT_DIR, '.git')):
        print("错误：PARENT_DIR 不是 git 仓库。")
        sys.exit(1)
    try:
        run(['git', 'rev-parse', base_ref], cwd=PARENT_DIR)
    except Exception:
        print(f"错误：Git 引用 '{base_ref}' 无效。")
        sys.exit(1)

    print(f"计算相对于 {base_ref} 的变更...")

    modified_added, deleted = set(), set()

    # 已提交 + 未暂存变更
    diff_out = run(['git', '-c', 'core.quotePath=false', 'diff',
                    '--name-status', base_ref], cwd=PARENT_DIR)
    for line in diff_out.splitlines():
        if not line.strip():
            continue
        parts = line.split('\t')
        status = parts[0]
        if status.startswith('R'):
            deleted.add(parts[1])
            modified_added.add(parts[2])
        elif status == 'D':
            deleted.add(parts[1])
        else:
            modified_added.add(parts[1])

    # 未追踪文件
    untracked = run(['git', '-c', 'core.quotePath=false', 'ls-files',
                     '--others', '--exclude-standard'], cwd=PARENT_DIR)
    for line in untracked.splitlines():
        if line.strip():
            modified_added.add(line.strip())

    def is_valid(path):
        return (
            (path.startswith('codex-skills/') or path.startswith('codex-skills\\'))
            and not should_exclude(os.path.join(PARENT_DIR, path))
        )

    valid_ma  = sorted(p for p in modified_added if is_valid(p))
    valid_del = sorted(p for p in deleted       if is_valid(p) and p not in modified_added)
    return valid_ma, valid_del


def find_skill_root(rel_path):
    parts = rel_path.replace('\\', '/').split('/')
    for i in range(len(parts) - 1, 0, -1):
        check = os.path.join(PARENT_DIR, *parts[:i])
        if os.path.exists(os.path.join(check, 'SKILL.md')):
            return '/'.join(parts[:i])
    return None


def parse_skill_metadata(skill_rel_path):
    skill_md = os.path.join(PARENT_DIR, skill_rel_path, 'SKILL.md')
    if not os.path.exists(skill_md):
        return None
    try:
        with open(skill_md, 'r', encoding='utf-8') as f:
            content = f.read()
        if content.startswith('---'):
            blocks = content.split('---')
            if len(blocks) >= 3:
                meta, current_key, current_vals = {}, None, []
                for line in blocks[1].splitlines():
                    stripped = line.strip()
                    if not stripped:
                        continue
                    if ':' in line and not line.startswith(' '):
                        if current_key:
                            meta[current_key] = ' '.join(current_vals).strip().strip('"\'')
                        k, v = line.split(':', 1)
                        current_key = k.strip().lower()
                        v = v.strip()
                        current_vals = [] if v in ('>', '|') else [v]
                    elif current_key:
                        current_vals.append(stripped)
                if current_key:
                    meta[current_key] = ' '.join(current_vals).strip().strip('"\'')
                return meta
    except Exception as e:
        print(f"警告：无法解析 {skill_rel_path} 的 metadata: {e}")
    return None


# ── 主流程 ────────────────────────────────────────────────────────────────────
def build_incremental_7z(base_ref, version):
    if not BIN_7Z:
        print("错误：找不到 7z 可执行文件。请安装 p7zip（brew install p7zip）或 Keka。")
        sys.exit(1)

    base_sha   = run(['git', 'rev-parse', '--short', base_ref], cwd=PARENT_DIR).strip()
    target_sha = run(['git', 'rev-parse', '--short', 'HEAD'],   cwd=PARENT_DIR).strip()

    modified_added, deleted = get_changes(base_ref)

    if not modified_added and not deleted:
        print("没有在 codex-skills/ 下检测到变更，跳过增量打包。")
        return

    print(f"\n--- 变更摘要 ---")
    print(f"Base  : {base_sha}")
    print(f"Target: {target_sha}")
    print(f"新增/修改: {len(modified_added)} 个文件")
    print(f"已删除  : {len(deleted)} 个文件")
    print(f"----------------\n")

    now       = datetime.datetime.now()
    timestamp = now.strftime('%Y%m%d_%H%M%S')
    pkg_name  = f'codex-skills-incremental-from-{base_sha}-to-{target_sha}_{timestamp}_v{version}.7z'
    os.makedirs(INCREMENTAL_DIR, exist_ok=True)
    output_path = os.path.join(INCREMENTAL_DIR, pkg_name)
    temp_path   = os.path.join(INCREMENTAL_DIR, pkg_name.replace('.7z', '_new.7z'))

    # ── 构建临时目录结构 ──────────────────────────────────────────────────────
    with tempfile.TemporaryDirectory() as staging:
        # 生成 release_log.txt
        try:
            git_logs = run(['git', 'log', '--oneline', f'{base_sha}..{target_sha}'],
                           cwd=PARENT_DIR).strip()
        except Exception as e:
            git_logs = f"Failed to fetch logs: {e}"

        log_content = '\n'.join([
            "Incremental Release Package",
            "===========================",
            f"Date: {now.strftime('%Y-%m-%d %H:%M:%S')}",
            f"Base Commit: {base_sha}",
            f"Target Commit: {target_sha}",
            "",
            "Commit Logs:",
            "-----------",
            git_logs or "No committed logs (working tree contains uncommitted/untracked changes).",
        ]) + '\n'
        with open(os.path.join(staging, 'release_log.txt'), 'w', encoding='utf-8') as f:
            f.write(log_content)

        # 生成 deleted_files.txt
        if deleted:
            with open(os.path.join(staging, 'deleted_files.txt'), 'w', encoding='utf-8') as f:
                f.write('\n'.join(deleted) + '\n')

        # 识别受影响技能
        affected_skills = {}
        for rel_path in modified_added:
            sr = find_skill_root(rel_path)
            if sr and sr not in affected_skills:
                meta = parse_skill_metadata(sr)
                affected_skills[sr] = meta or {'name': os.path.basename(sr),
                                               'description': 'No description available.'}

        # 生成 README.md
        readme_lines = [
            f"# Codex Skills Incremental Update ({base_sha} -> {target_sha})",
            "",
            "Welcome, AI Agent!",
            "",
            "This package contains an incremental update for the **Codex Skills Library**.",
            "",
            "## Integration Guide",
            "- **Apply Changes**: Merge the files in `codex-skills/` into your workspace skill library, overwriting existing files.",
            "- **Handle Deletions**: Consult `deleted_files.txt` at the root of this package to clean up removed paths.",
            "- **Skill Discovery**: This package includes an updated `skills_manifest.json`. Simply overwrite the existing manifest. "
            "**Do NOT register sub-skills directly into `.agents/skills.json` or `codex-skills/skills.json`.**",
            "",
            "---",
            "",
            "## Updated Skills in this Package",
        ]
        for idx, (sr, meta) in enumerate(sorted(affected_skills.items(),
                                                  key=lambda x: x[1].get('name', ''))):
            name = meta.get('name', os.path.basename(sr))
            desc = meta.get('description', 'No description available.')
            readme_lines += [
                f"### {idx+1}. **{name}**",
                f"* **Path**: `{sr}`",
                f"* **Description**: {desc}",
                "",
            ]
        readme_lines += [
            "---",
            f"*Generated automatically on {now.strftime('%Y-%m-%d %H:%M:%S')}. "
            f"Refer to `release_log.txt` for detailed commit history.*"
        ]
        with open(os.path.join(staging, 'README.md'), 'w', encoding='utf-8') as f:
            f.write('\n'.join(readme_lines) + '\n')

        # 复制变更文件到 staging 目录（保持相对结构）
        count = 0
        for rel_path in modified_added:
            src = os.path.join(PARENT_DIR, rel_path)
            if not os.path.exists(src) or os.path.islink(src):
                continue
            dst = os.path.join(staging, rel_path.replace('\\', '/'))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)
            count += 1
            if count % 100 == 0:
                print(f"  已复制 {count} 个文件...")
        print(f"共复制 {count} 个变更文件。")

        # ── 调用 7z 压缩 staging 目录 ─────────────────────────────────────────
        print(f"正在打包 -> {temp_path} ...")
        cmd = [
            BIN_7Z, 'a',
            '-t7z',
            '-mx=9',
            '-mmt=on',
            '-ms=on',
            temp_path,
            '.',    # 打包 staging 目录下全部内容
        ]
        run(cmd, cwd=staging)
        print("打包完成。")

    # ── 校验 ──────────────────────────────────────────────────────────────────
    print("校验压缩包结构...")
    run([BIN_7Z, 't', temp_path])
    listing = run([BIN_7Z, 'l', '-ba', temp_path])
    if 'release_log.txt' not in listing:
        raise ValueError("校验失败：压缩包中缺少 release_log.txt")
    print("校验通过。")

    # ── 重命名并清理 ──────────────────────────────────────────────────────────
    if os.path.exists(output_path):
        os.remove(output_path)
    os.rename(temp_path, output_path)
    size_mb = os.path.getsize(output_path) / 1024 / 1024
    print(f"\n输出: {output_path}  ({size_mb:.1f} MB)")

    cleanup_old_incremental()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description="增量打包 codex-skills 相对 baseline commit 的变更 -> 7z"
    )
    parser.add_argument('-b', '--base', default='HEAD~1',
                        help="Baseline git reference（默认: HEAD~1）")
    parser.add_argument('-v', '--version', required=True,
                        help="版本号，如 1.5.0")
    args = parser.parse_args()
    build_incremental_7z(args.base, args.version)
