#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

MODE="write"
CLEAN=0

CHECK_DIR="${DXF_SKILL_CHECK_DIR:-$REPO_ROOT/tmp/dxf-skill-runtime-check}"
CADPY_PACKAGE_DIR="$REPO_ROOT/packages/cadpy"
CADPY_RUNTIME_DIR="$REPO_ROOT/skills/dxf/scripts/packages/cadpy"

usage() {
  cat <<'EOF'
Usage:
  scripts/bundle/bundle-skill.sh dxf [--check] [--clean]

Vendors packages/cadpy into skills/dxf/scripts/packages/cadpy.

Options:
  --check  Fail if the generated DXF skill runtime copy is stale.
  --clean  Remove the temporary check directory first.
  -h, --help
           Show this help.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --check)
      MODE="check"
      ;;
    --clean)
      CLEAN=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

if [ ! -f "$CADPY_PACKAGE_DIR/pyproject.toml" ] || [ ! -d "$CADPY_PACKAGE_DIR/src/cadpy" ]; then
  echo "Missing cadpy package source: $CADPY_PACKAGE_DIR" >&2
  echo "The DXF skill Python runtime is bundled from packages/cadpy." >&2
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required to vendor cadpy into the DXF skill runtime." >&2
  exit 1
fi

if [ "$CLEAN" -eq 1 ]; then
  rm -rf "$CHECK_DIR"
fi

sync_cadpy_runtime() {
  local target_dir="$1"
  rm -rf "$target_dir"
  mkdir -p "$target_dir"
  rsync -a --delete \
    --delete-excluded \
    --exclude __pycache__ \
    --exclude .pytest_cache \
    --exclude '*.pyc' \
    --exclude '*.md' \
    --exclude build \
    --exclude dist \
    --exclude '*.egg-info' \
    --exclude tests \
    --exclude __tests__ \
    --exclude 'test_*.py' \
    --exclude '*_test.py' \
    "$CADPY_PACKAGE_DIR/" "$target_dir/"
}

check_cadpy_runtime() {
  local check_dir="$CHECK_DIR/packages/cadpy"
  if [ ! -d "$CADPY_RUNTIME_DIR" ]; then
    echo "Missing generated cadpy runtime: skills/dxf/scripts/packages/cadpy" >&2
    echo "" >&2
    echo "Run scripts/bundle/bundle-skill.sh dxf and commit the updated runtime files." >&2
    exit 1
  fi
  if ! diff -qr \
    -x __pycache__ \
    -x .pytest_cache \
    -x '*.pyc' \
    -x '*.egg-info' \
    -x '*.md' \
    -x tests \
    -x __tests__ \
    -x 'test_*.py' \
    -x '*_test.py' \
    "$check_dir" "$CADPY_RUNTIME_DIR" >/tmp/dxf-skill-cadpy-runtime-diff.txt; then
    cat /tmp/dxf-skill-cadpy-runtime-diff.txt >&2
    echo "" >&2
    echo "DXF skill cadpy runtime is stale." >&2
    echo "Run scripts/bundle/bundle-skill.sh dxf and commit skills/dxf/scripts/packages/cadpy." >&2
    exit 1
  fi
  echo "DXF skill cadpy runtime is up to date."
}

if [ "$MODE" = "check" ]; then
  sync_cadpy_runtime "$CHECK_DIR/packages/cadpy"
  check_cadpy_runtime
else
  sync_cadpy_runtime "$CADPY_RUNTIME_DIR"
  echo "Bundled skills/dxf/scripts/packages/cadpy"
fi
