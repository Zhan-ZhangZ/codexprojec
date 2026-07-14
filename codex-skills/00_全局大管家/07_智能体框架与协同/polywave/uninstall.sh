#!/usr/bin/env bash
set -euo pipefail

codex_home="${CODEX_HOME:-$HOME/.codex}"
polywave_home="$codex_home/polywave"
skill_dir="$codex_home/skills/polywave"
agent_dir="$codex_home/agents"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
user_hooks="$codex_home/hooks.json"

if [[ ! -d "$polywave_home" ]]; then
  printf 'Nothing to remove: %s does not exist\n' "$polywave_home"
else
  rm -rf "$polywave_home"
  printf 'Removed %s\n' "$polywave_home"
fi

if [[ -d "$skill_dir" ]]; then
  rm -rf "$skill_dir"
  printf 'Removed %s\n' "$skill_dir"
fi

for agent_file in "$agent_dir/polywave-scout.toml" "$agent_dir/polywave-wave-agent.toml" "$agent_dir/polywave-planner.toml" "$agent_dir/polywave-scaffold-agent.toml" "$agent_dir/polywave-critic-agent.toml" "$agent_dir/polywave-integration-agent.toml"; do
  if [[ -f "$agent_file" ]]; then
    rm "$agent_file"
    printf 'Removed %s\n' "$agent_file"
  fi
done

if [[ -f "$user_hooks" ]]; then
  if cmp -s "$repo_root/hooks/hooks.json" "$user_hooks"; then
    rm "$user_hooks"
    printf 'Removed %s because it matched the Polywave template\n' "$user_hooks"
  else
    cat <<MSG
Left $user_hooks in place because it does not exactly match the Polywave template.
Remove Polywave hook entries manually if needed.
MSG
  fi
fi

cat <<MSG

Review Codex config for remaining Polywave entries:
  $codex_home/config.toml
  $codex_home/hooks.json
MSG
