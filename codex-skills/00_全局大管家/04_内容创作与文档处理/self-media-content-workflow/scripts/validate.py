#!/usr/bin/env python3
"""Validate the self-media Skill suite without third-party dependencies."""

from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote


ROOT = Path(__file__).resolve().parents[1]
SKILLS_DIR = ROOT / "skills"
FRONTMATTER_RE = re.compile(r"\A---\r?\n(.*?)\r?\n---\r?\n", re.DOTALL)
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
ALLOWED_FRONTMATTER = {"name", "description"}


def parse_frontmatter(path: Path, text: str) -> dict[str, str]:
    match = FRONTMATTER_RE.match(text)
    if not match:
        raise ValueError(f"{path}: missing YAML frontmatter")

    values: dict[str, str] = {}
    for raw_line in match.group(1).splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if ":" not in line:
            raise ValueError(f"{path}: invalid frontmatter line: {raw_line}")
        key, value = line.split(":", 1)
        values[key.strip()] = value.strip().strip('"\'')

    missing = ALLOWED_FRONTMATTER - values.keys()
    extra = values.keys() - ALLOWED_FRONTMATTER
    if missing:
        raise ValueError(f"{path}: missing frontmatter fields: {sorted(missing)}")
    if extra:
        raise ValueError(f"{path}: unsupported frontmatter fields: {sorted(extra)}")
    return values


def validate_skill(skill_dir: Path) -> list[str]:
    errors: list[str] = []
    skill_file = skill_dir / "SKILL.md"
    if not skill_file.exists():
        return [f"{skill_dir}: missing SKILL.md"]

    text = skill_file.read_text(encoding="utf-8")
    try:
        frontmatter = parse_frontmatter(skill_file, text)
        if frontmatter["name"] != skill_dir.name:
            errors.append(
                f"{skill_file}: name '{frontmatter['name']}' does not match folder '{skill_dir.name}'"
            )
        if not frontmatter["description"]:
            errors.append(f"{skill_file}: empty description")
    except ValueError as exc:
        errors.append(str(exc))

    line_count = len(text.splitlines())
    if line_count > 500:
        errors.append(f"{skill_file}: {line_count} lines exceeds the 500-line limit")
    if "TODO" in text:
        errors.append(f"{skill_file}: unresolved TODO")

    metadata = skill_dir / "agents" / "openai.yaml"
    if not metadata.exists():
        errors.append(f"{skill_dir}: missing agents/openai.yaml")
    else:
        metadata_text = metadata.read_text(encoding="utf-8")
        for field in ("display_name", "short_description", "default_prompt"):
            if f"{field}:" not in metadata_text:
                errors.append(f"{metadata}: missing {field}")
        if f"${skill_dir.name}" not in metadata_text:
            errors.append(f"{metadata}: default_prompt must mention ${skill_dir.name}")

    return errors


def validate_links() -> list[str]:
    errors: list[str] = []
    for path in ROOT.rglob("*.md"):
        relative_parts = path.relative_to(ROOT).parts
        if any(part.startswith(".") or part == "__pycache__" for part in relative_parts):
            continue
        text = path.read_text(encoding="utf-8")
        text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
        for target in LINK_RE.findall(text):
            target = unquote(target.strip())
            if target.startswith(("http://", "https://", "mailto:", "#")):
                continue
            file_part = target.split("#", 1)[0]
            if not file_part:
                continue
            resolved = (path.parent / file_part).resolve()
            if not resolved.exists():
                errors.append(f"{path}: broken relative link: {target}")
    return errors


def main() -> int:
    if not SKILLS_DIR.exists():
        print("skills directory is missing", file=sys.stderr)
        return 1

    skill_dirs = sorted(path for path in SKILLS_DIR.iterdir() if path.is_dir())
    errors: list[str] = []
    if not skill_dirs:
        errors.append("no Skill directories found under skills/")

    for skill_dir in skill_dirs:
        errors.extend(validate_skill(skill_dir))
    errors.extend(validate_links())

    if errors:
        print("Validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"Validated {len(skill_dirs)} Skills successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
