"""
repack_7z.py  —  全量打包脚本（7z 格式）

用法:
    python3 scripts/repack_7z.py -v <版本号>

示例:
    python3 scripts/repack_7z.py -v 1.5.0

输出:
    codex-skills-<月>月<日>日.7z   （项目根目录）

流程:
    0. 路径长度防线：扫描全部待打包文件，超过 Windows 兼容上限直接废弃打包
    1. 将已有的全量包移入备份文件夹（保留最近 2 份）
    2. 调用 7z 压缩 codex-skills/ → 临时文件
    3. 校验临时文件：7z t + 检查 skills_manifest.json / SKILL.md 存在
    4. 重命名临时文件为最终输出
"""

import os
import subprocess
import datetime
import shutil
import argparse
import sys

# ── 路径配置 ──────────────────────────────────────────────────────────────────
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR  = os.path.dirname(SCRIPT_DIR)
SOURCE_DIR  = os.path.join(PARENT_DIR, 'codex-skills')
BACKUP_DIR  = os.path.join(PARENT_DIR, '备份包文件夹')

# 7z 可执行文件：Keka 的 keka7zz 实际是 GUI 封装，不支持命令行调用，直接使用系统版 7z
_SYS_7Z  = shutil.which('7z') or shutil.which('7zz')
BIN_7Z   = _SYS_7Z

# 压缩排除规则（7z exclude 语法）
EXCLUDE_PATTERNS = [
    '-xr!*.DS_Store',
    '-xr!._*',
    '-xr!.git',
    '-xr!.github',
    '-xr!__pycache__',
    '-xr!node_modules',
    '-xr!.venv',
    '-xr!.env',
    '-xr!__MACOSX',
    '-xr!.vscode',
    '-xr!.idea',
]

# ── Windows 路径长度防线 ──────────────────────────────────────────────────────
# 客户典型安装前缀 C:\Users\<user>\.codex\skills\codex-skills\ 约 41~55 字符，
# Windows MAX_PATH = 260（按 UTF-16 字符计，一个汉字算 1 个）。
# 库内相对路径（codex-skills/ 之下）阈值：
PATH_WARN_LIMIT = 200   # 警告：客户机用户名较长 / OneDrive 重定向时可能超限
PATH_HARD_LIMIT = 219   # 硬性：41 + 219 = 260，超出则废弃打包

# 与 EXCLUDE_PATTERNS 对应的扫描过滤（保证只测量真正会进包的文件）
_SCAN_EXCLUDE_DIRS  = {'.git', '.github', '__pycache__', 'node_modules',
                       '.venv', '__MACOSX', '.vscode', '.idea'}


def enforce_path_limits(source_dir):
    """出包前扫描全部待打包文件的库内相对路径长度（字符口径）。

    超过硬性上限时打印详细报告并终止打包（废弃本次出包，不产生任何压缩包）。
    """
    warns, rejects = [], []
    for dirpath, dirnames, filenames in os.walk(source_dir):
        dirnames[:] = [d for d in dirnames if d not in _SCAN_EXCLUDE_DIRS]
        for fn in filenames:
            if fn == '.DS_Store' or fn.startswith('._') or fn == '.env':
                continue
            rel = os.path.relpath(os.path.join(dirpath, fn), source_dir)
            n = len(rel)
            if n > PATH_HARD_LIMIT:
                rejects.append((n, rel))
            elif n > PATH_WARN_LIMIT:
                warns.append((n, rel))

    if rejects:
        rejects.sort(reverse=True)
        bar = '!' * 70
        lines = [
            bar,
            '!!  警告：检测到超长路径，本次打包已废弃（未生成任何压缩包）',
            bar,
            '!!',
            f'!!  原因      : {len(rejects)} 个文件的库内相对路径超过硬性上限 {PATH_HARD_LIMIT} 字符。',
            '!!              客户机安装前缀 C:\\Users\\<user>\\.codex\\skills\\codex-skills\\ 约 41 字符，',
            f'!!              41 + {PATH_HARD_LIMIT} = 260（Windows MAX_PATH 上限），超限文件在客户机',
            '!!              解压/安装时必然报「无法打开」。',
            '!!',
            '!!  处理步骤  : 1. 按下方清单定位所属技能；',
            '!!              2. 缩短该技能内部目录嵌套，或删除深层无价值文件',
            '!!                 （价值判断须由 AI 按集成规则执行，勿机械删除）；',
            '!!              3. 运行 python3 scripts/integration_check.py "<技能文件夹>" 复检；',
            '!!              4. 复检通过后重新执行本打包脚本。',
            '!!',
            '!!  超限清单  :（按长度降序，最多列 20 条）',
        ]
        print('\n'.join(lines))
        for n, rel in rejects[:20]:
            print(f'!!    {n} 字符  {rel}')
        if len(rejects) > 20:
            print(f'!!    ... 及另外 {len(rejects) - 20} 个文件')
        print(bar)
        sys.exit(1)

    if warns:
        warns.sort(reverse=True)
        print(f'  [路径长度警告] {len(warns)} 个文件超过 {PATH_WARN_LIMIT} 字符'
              f'（未超硬性上限 {PATH_HARD_LIMIT}，本次放行，建议尽早整改）：')
        for n, rel in warns[:5]:
            print(f'    {n} 字符  {rel}')
        if len(warns) > 5:
            print(f'    ... 及另外 {len(warns) - 5} 个文件')

    print(f'  路径长度检查通过（阈值：警告 {PATH_WARN_LIMIT} / 硬性 {PATH_HARD_LIMIT} 字符）。')

# ── 工具函数 ──────────────────────────────────────────────────────────────────
def run(args, **kwargs):
    """运行命令，失败时抛出 RuntimeError。"""
    res = subprocess.run(args, capture_output=True, text=True, **kwargs)
    if res.returncode != 0:
        raise RuntimeError(
            f"Command failed: {' '.join(str(a) for a in args)}\n"
            f"stdout: {res.stdout}\nstderr: {res.stderr}"
        )
    return res.stdout


def cleanup_old_backups():
    """只保留最近 2 份全量备份，删除更早的。"""
    if not os.path.exists(BACKUP_DIR):
        return
    backups = sorted(
        [os.path.join(BACKUP_DIR, f) for f in os.listdir(BACKUP_DIR)
         if f.startswith('codex-skills') and f.endswith('.7z')],
        key=os.path.getmtime, reverse=True
    )
    for old in backups[2:]:
        print(f"  删除旧备份: {old}")
        try:
            os.remove(old)
        except Exception as e:
            print(f"  警告: 无法删除 {old}: {e}")


def backup_existing():
    """将根目录已有的全量 .7z 包移入备份文件夹，并按原修改时间命名。"""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    for f in os.listdir(PARENT_DIR):
        if (f.startswith('codex-skills') and f.endswith('.7z')
                and '_new' not in f):
            src = os.path.join(PARENT_DIR, f)
            mtime = os.path.getmtime(src)
            ts = datetime.datetime.fromtimestamp(mtime).strftime('%Y%m%d-%H%M%S')
            dst = os.path.join(BACKUP_DIR, f.replace('.7z', f'.backup-{ts}.7z'))
            if os.path.exists(dst):
                ts = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
                dst = os.path.join(BACKUP_DIR, f.replace('.7z', f'.backup-{ts}.7z'))
            print(f"备份 {f} → 备份包文件夹/{os.path.basename(dst)}")
            shutil.move(src, dst)
    cleanup_old_backups()


def validate(archive_path):
    """校验 7z 包完整性，并确认关键文件存在。"""
    print("校验压缩包结构...")

    # 1. 完整性测试
    run([BIN_7Z, 't', archive_path])

    # 2. 检查关键文件存在
    listing = run([BIN_7Z, 'l', '-ba', archive_path])
    required = [
        'codex-skills/skills_manifest.json',
        'codex-skills/SKILL.md',
    ]
    for req in required:
        if req not in listing:
            raise ValueError(f"校验失败：压缩包中缺少关键文件 {req}")

    print("校验通过。")


# ── 主流程 ────────────────────────────────────────────────────────────────────
def build_7z():
    if not BIN_7Z:
        print("错误：找不到 7z 可执行文件。请安装 p7zip（brew install p7zip）或 Keka。")
        sys.exit(1)

    parser = argparse.ArgumentParser(description="全量打包 codex-skills -> 7z")
    parser.add_argument('-v', '--version', required=True, help="版本号，如 1.5.0")
    args = parser.parse_args()

    now = datetime.datetime.now()
    date_str   = f"{now.month}月{now.day}日"
    output_7z  = os.path.join(PARENT_DIR, f'codex-skills-{date_str}.7z')
    temp_7z    = os.path.join(PARENT_DIR, f'codex-skills-{date_str}_new.7z')

    print(f"=== Codex Skills 全量打包 v{args.version} ===")
    print(f"来源目录 : {SOURCE_DIR}")
    print(f"目标文件 : {output_7z}")
    print(f"7z 工具  : {BIN_7Z}")
    print()

    # Step 0: 路径长度防线（超限则废弃打包，不做备份移动、不产生压缩包）
    enforce_path_limits(SOURCE_DIR)

    # Step 1: 备份已有全量包
    backup_existing()

    # Step 2: 压缩
    # 在 PARENT_DIR 下执行，使压缩包内路径以 codex-skills/ 开头
    print(f"正在打包 -> {temp_7z} ...")
    cmd = [
        BIN_7Z, 'a',
        '-t7z',           # 格式：7z
        '-mx=9',          # 压缩级别（0-9，9=Ultra 最高压缩率）
        '-mmt=on',        # 多线程
        '-ms=on',         # 固实压缩
        temp_7z,
        'codex-skills',   # 相对于 PARENT_DIR
    ] + EXCLUDE_PATTERNS
    run(cmd, cwd=PARENT_DIR)
    print("打包完成。")

    # Step 3: 校验
    validate(temp_7z)

    # Step 4: 重命名为最终文件
    if os.path.exists(output_7z):
        os.remove(output_7z)
    os.rename(temp_7z, output_7z)
    size_mb = os.path.getsize(output_7z) / 1024 / 1024
    print(f"\n输出: {output_7z}  ({size_mb:.1f} MB)")


if __name__ == '__main__':
    build_7z()
