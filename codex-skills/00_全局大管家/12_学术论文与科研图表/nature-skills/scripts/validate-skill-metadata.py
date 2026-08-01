#!/usr/bin/env python3
"""Validate nature-skills metadata consistency.

Checks every top-level directory under skills/ for:
- required SKILL.md / README.md / README_EN.md / manifest.yaml files
- matching SKILL.md frontmatter name and manifest.yaml name
- valid manifest YAML
- relative manifest route paths, fragments, and scripts that exist on disk
- root README / README_EN skill badge count matching triggerable skills
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover - developer environment guard
    raise SystemExit("Missing dependency: PyYAML. Install with `python -m pip install pyyaml`.") from exc

ROOT = Path(__file__).resolve().parents[1]
SKILLS_DIR = ROOT / "skills"
REQUIRED_FILES = ("SKILL.md", "README.md", "README_EN.md", "manifest.yaml")
SUPPORT_ONLY = {"nature-shared"}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def skill_frontmatter_name(skill_md: Path) -> str | None:
    text = read_text(skill_md)
    match = re.search(r"^name:\s*(.+?)\s*$", text, flags=re.MULTILINE)
    return match.group(1).strip().strip('"\'') if match else None


PATH_KEYS = {"path", "reference", "script", "backend_script"}


def iter_manifest_paths(node: Any, parent_key: str | None = None):
    """Yield file paths declared in manifest routing metadata.

    Manifest routes can point at files in several shapes: explicit `path`,
    `reference`, or `script` keys; `always_load` lists; and `axes.*.values`
    mappings whose values are fragment paths. Keep environment/config fields such
    as `default_config` out of this check so local user paths are not treated as
    repository files.
    """
    if isinstance(node, dict):
        for key, value in node.items():
            key = str(key)
            if key in PATH_KEYS and isinstance(value, str):
                yield value
            elif key == "values" and isinstance(value, dict):
                for route_path in value.values():
                    if isinstance(route_path, str):
                        yield route_path
                    else:
                        yield from iter_manifest_paths(route_path, key)
            else:
                yield from iter_manifest_paths(value, key)
    elif isinstance(node, list):
        for value in node:
            if parent_key in {"always_load", "on_demand"} and isinstance(value, str):
                yield value
            else:
                yield from iter_manifest_paths(value, parent_key)


def check_manifest_path(manifest_path: Path, skill_dir: Path, raw_path: str) -> str | None:
    if not raw_path.strip():
        return f"{manifest_path.relative_to(ROOT)}: empty referenced path"
    candidate = Path(raw_path)
    if candidate.is_absolute():
        return f"{manifest_path.relative_to(ROOT)}: referenced path must be relative: {raw_path}"

    parts = candidate.parts
    if ".." in parts and not (len(parts) >= 2 and parts[0] == ".." and parts[1] == "nature-shared"):
        return (
            f"{manifest_path.relative_to(ROOT)}: referenced path may only leave the skill "
            f"directory for ../nature-shared/: {raw_path}"
        )

    target = skill_dir / candidate
    try:
        target.resolve().relative_to(ROOT.resolve())
    except ValueError:
        return f"{manifest_path.relative_to(ROOT)}: referenced path escapes the repository: {raw_path}"

    if not target.exists():
        return f"{manifest_path.relative_to(ROOT)}: missing referenced path {raw_path}"
    return None


def check_badge_count(readme: Path, expected: int) -> list[str]:
    text = read_text(readme)
    errors: list[str] = []
    badge = re.search(r"skills-(\d+)-", text)
    if badge and int(badge.group(1)) != expected:
        errors.append(f"{readme.relative_to(ROOT)}: badge says skills-{badge.group(1)}, expected skills-{expected}")
    return errors


def main() -> int:
    errors: list[str] = []
    skill_dirs = sorted(p for p in SKILLS_DIR.iterdir() if p.is_dir())
    triggerable_count = sum(1 for p in skill_dirs if p.name not in SUPPORT_ONLY)

    for skill_dir in skill_dirs:
        rel = skill_dir.relative_to(ROOT)
        for filename in REQUIRED_FILES:
            path = skill_dir / filename
            if not path.exists():
                errors.append(f"{rel}: missing {filename}")

        manifest_path = skill_dir / "manifest.yaml"
        skill_md = skill_dir / "SKILL.md"
        if not manifest_path.exists() or not skill_md.exists():
            continue

        try:
            manifest = yaml.safe_load(read_text(manifest_path)) or {}
        except Exception as exc:
            errors.append(f"{manifest_path.relative_to(ROOT)}: invalid YAML: {exc}")
            continue

        manifest_name = manifest.get("name")
        skill_name = skill_frontmatter_name(skill_md)
        if manifest_name != skill_name:
            errors.append(
                f"{rel}: manifest name {manifest_name!r} does not match SKILL.md name {skill_name!r}"
            )

        for raw_path in iter_manifest_paths(manifest):
            error = check_manifest_path(manifest_path, skill_dir, raw_path)
            if error:
                errors.append(error)

    for readme in (ROOT / "README.md", ROOT / "README_EN.md"):
        if readme.exists():
            errors.extend(check_badge_count(readme, triggerable_count))

    if errors:
        print("Skill metadata validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(
        f"Skill metadata validation passed: {len(skill_dirs)} skill directories, "
        f"{triggerable_count} triggerable skills."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
