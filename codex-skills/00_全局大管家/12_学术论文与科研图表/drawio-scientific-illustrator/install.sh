#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${1:-$HOME/.codex/marketplaces/drawio-scientific-illustrator}"
REPOSITORY="https://github.com/icebird1998/drawio-scientific-illustrator.git"
PLUGIN="drawio-scientific-illustrator@drawio-scientific-tools"

command -v git >/dev/null || { echo "Git is required." >&2; exit 1; }
command -v codex >/dev/null || { echo "Codex CLI is required." >&2; exit 1; }

if [[ -d "$INSTALL_DIR/.git" ]]; then
  git -C "$INSTALL_DIR" pull --ff-only
elif [[ -e "$INSTALL_DIR" ]]; then
  echo "Install directory exists but is not this Git repository: $INSTALL_DIR" >&2
  exit 1
else
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone "$REPOSITORY" "$INSTALL_DIR"
fi

codex plugin marketplace add "$INSTALL_DIR"
codex plugin add "$PLUGIN"

echo "Installed $PLUGIN"
echo "Restart Codex and start a new task before first use."
