#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
codex_home="${CODEX_HOME:-$HOME/.codex}"
polywave_home="$codex_home/polywave"
hook_dir="$polywave_home/hooks"
config_dir="$polywave_home/config"
skill_dir="$codex_home/skills/polywave"
skill_scripts_dir="$skill_dir/scripts"
skill_references_dir="$skill_dir/references"
agent_dir="$codex_home/agents"
write_user_hooks=false

usage() {
  cat <<'USAGE'
Usage: ./install.sh [--write-user-hooks]

Installs current Polywave Codex artifacts under $CODEX_HOME/polywave.

Options:
  --write-user-hooks  Write ~/.codex/hooks.json only if it does not already exist.
  -h, --help          Show this help.

This installer does not overwrite existing Codex config. Without
--write-user-hooks, it prints the required hook configuration after installing
the hook scripts.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --write-user-hooks)
      write_user_hooks=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$name" >&2
    exit 1
  fi
}

install_file() {
  local source="$1"
  local target="$2"
  install -m 0755 "$source" "$target"
  printf 'Installed %s\n' "$target"
}

install_data_file() {
  local source="$1"
  local target="$2"
  install -m 0644 "$source" "$target"
  printf 'Installed %s\n' "$target"
}

require_command jq
require_command install

mkdir -p "$hook_dir" "$config_dir" "$skill_dir" "$skill_scripts_dir" "$skill_references_dir" "$agent_dir"

install_file "$repo_root/hooks/pre_tool_use_bash_policy" "$hook_dir/pre_tool_use_bash_policy"
install_file "$repo_root/hooks/pre_tool_use_apply_patch_policy" "$hook_dir/pre_tool_use_apply_patch_policy"
install_file "$repo_root/hooks/pre_tool_use_safe_edit_policy" "$hook_dir/pre_tool_use_safe_edit_policy"
install_file "$repo_root/hooks/pre_tool_use_audit" "$hook_dir/pre_tool_use_audit"
install_data_file "$repo_root/hooks/hooks.json" "$config_dir/hooks.json"
install_data_file "$repo_root/hooks/codex-config.toml" "$config_dir/codex-config.toml"
install_data_file "$repo_root/hooks/audit-hooks.json" "$config_dir/audit-hooks.json"
install_data_file "$repo_root/hooks/audit-codex-config.toml" "$config_dir/audit-codex-config.toml"
install_data_file "$repo_root/SKILL.md" "$skill_dir/SKILL.md"
install_file "$repo_root/scripts/inject-context" "$skill_scripts_dir/inject-context"
install_file "$repo_root/scripts/inject-agent-context" "$skill_scripts_dir/inject-agent-context"
install_file "$repo_root/scripts/build-scout-prompt" "$skill_scripts_dir/build-scout-prompt"
install_file "$repo_root/scripts/build-wave-agent-prompt" "$skill_scripts_dir/build-wave-agent-prompt"
install_data_file "$repo_root/references/program-flow.md" "$skill_references_dir/program-flow.md"
install_data_file "$repo_root/references/amend-flow.md" "$skill_references_dir/amend-flow.md"
install_data_file "$repo_root/references/failure-routing.md" "$skill_references_dir/failure-routing.md"
install_data_file "$repo_root/references/impl-targeting.md" "$skill_references_dir/impl-targeting.md"
install_data_file "$repo_root/references/integration-gap-detection.md" "$skill_references_dir/integration-gap-detection.md"
install_data_file "$repo_root/references/model-selection.md" "$skill_references_dir/model-selection.md"
install_data_file "$repo_root/references/pre-wave-validation.md" "$skill_references_dir/pre-wave-validation.md"
install_data_file "$repo_root/references/scout-program-contracts.md" "$skill_references_dir/scout-program-contracts.md"
install_data_file "$repo_root/references/wave-agent-build-diagnosis.md" "$skill_references_dir/wave-agent-build-diagnosis.md"
install_data_file "$repo_root/references/wave-agent-contracts.md" "$skill_references_dir/wave-agent-contracts.md"
install_data_file "$repo_root/references/wave-agent-program-contracts.md" "$skill_references_dir/wave-agent-program-contracts.md"
install_data_file "$repo_root/references/target-project-AGENTS.snippet.md" "$skill_references_dir/target-project-AGENTS.snippet.md"
install_data_file "$repo_root/references/live-loop-playbook.md" "$skill_references_dir/live-loop-playbook.md"
install_data_file "$repo_root/agents/polywave-scout.toml" "$agent_dir/polywave-scout.toml"
install_data_file "$repo_root/agents/polywave-wave-agent.toml" "$agent_dir/polywave-wave-agent.toml"
install_data_file "$repo_root/agents/polywave-planner.toml" "$agent_dir/polywave-planner.toml"
install_data_file "$repo_root/agents/polywave-scaffold-agent.toml" "$agent_dir/polywave-scaffold-agent.toml"
install_data_file "$repo_root/agents/polywave-critic-agent.toml" "$agent_dir/polywave-critic-agent.toml"
install_data_file "$repo_root/agents/polywave-integration-agent.toml" "$agent_dir/polywave-integration-agent.toml"

if [[ "$write_user_hooks" == true ]]; then
  user_hooks="$codex_home/hooks.json"
  if [[ -e "$user_hooks" ]]; then
    printf 'Refusing to overwrite existing %s\n' "$user_hooks" >&2
    printf 'Use the printed config and merge it manually.\n' >&2
  else
    install -m 0644 "$repo_root/hooks/hooks.json" "$user_hooks"
    printf 'Installed %s\n' "$user_hooks"
  fi
fi

cat <<MSG

Polywave Codex artifacts installed under:
  $polywave_home

Installed skill:
  $skill_dir/SKILL.md

Installed disclosure assets:
  $skill_scripts_dir/inject-context
  $skill_scripts_dir/inject-agent-context
  $skill_scripts_dir/build-scout-prompt
  $skill_scripts_dir/build-wave-agent-prompt
  $skill_references_dir/*.md

Installed agents:
  $agent_dir/polywave-scout.toml
  $agent_dir/polywave-wave-agent.toml
  $agent_dir/polywave-planner.toml
  $agent_dir/polywave-scaffold-agent.toml
  $agent_dir/polywave-critic-agent.toml
  $agent_dir/polywave-integration-agent.toml

Codex hook support still requires:
  [features]
  hooks = true

MSG

"$repo_root/scripts/print-codex-config"

printf "\nRun install verification with:\n  %s/scripts/verify-codex-install\n" "$repo_root"
