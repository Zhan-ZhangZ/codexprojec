#!/usr/bin/env python3
"""
Dependency health check for chubbyskills (invoked by `chubby.py doctor`).

Evaluates the required/optional dependencies declared in platforms/*.yaml
against the local environment by reusing platform_health's checker.

Exit codes:
  0  core pipeline usable (it only needs the Python standard library),
     or the --platform selected explicitly is ready / degraded
  1  platform definitions are broken, or the selected --platform is blocked
     by missing required dependencies

Without --platform this is a summary: platforms with heavy optional deps are
reported but a light install (subtitle-first paths) is not a failure.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import platform_health as ph  # noqa: E402  (same-directory tool import)


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Check chubbysills dependency health from platforms/*.yaml"
    )
    parser.add_argument("--platform", help="Only evaluate this platform id, e.g. bilibili")
    parser.add_argument("--provider", help="Compatibility alias accepted by doctor; ignored")
    args = parser.parse_args(argv)

    platform_dir = Path(ph.DEFAULT_PLATFORM_DIR)
    yaml_files = sorted(platform_dir.glob("*.yaml"))
    if not yaml_files:
        print(f"❌ 未找到平台定义目录：{platform_dir}")
        return 1

    print(f"Python {sys.version.split()[0]}｜核心流水线（init/import/search/brief）仅需标准库：✅")
    structural_errors = []
    blocked = []
    selected = 0

    for yaml_file in yaml_files:
        platform = ph.parse_simple_yaml(yaml_file)
        pid = platform.get("id", yaml_file.stem)
        if args.platform and pid != args.platform:
            continue
        selected += 1
        result = ph.check_platform(
            platform,
            Path(ph.ROOT),
            Path(ph.DEFAULT_TEMPLATE_DIR),
            local=True,
        )
        missing_required = result["missing_required"]
        missing_optional = result["missing_optional"]
        if result["errors"]:
            structural_errors.append(pid)
            print(f"❌ {pid}: {'；'.join(result['errors'])}")
        elif missing_required:
            blocked.append(pid)
            extra = f"（可选缺: {', '.join(missing_optional)}）" if missing_optional else ""
            print(f"⛔ {pid}: 缺少必需依赖 {', '.join(missing_required)}{extra}")
        elif missing_optional:
            print(f"🟡 {pid}: 可选依赖缺失 {', '.join(missing_optional)}（可降级运行）")
        else:
            print(f"✅ {pid}: 依赖齐备")

    if args.platform and selected == 0:
        print(f"❌ 未知平台：{args.platform}（可用 id 见 {platform_dir}）")
        return 1
    if structural_errors:
        return 1
    if args.platform:
        return 1 if blocked else 0
    if blocked:
        print("")
        print("提示：⛔ 平台仅影响对应采集通道；核心流水线与字幕优先路径不受影响。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
