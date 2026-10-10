import type { AgentWithStatus } from "@/types";

export const CENTRAL_AGENT_ID = "central";
export const OBSIDIAN_AGENT_ID = "obsidian";

const NON_INSTALL_TARGET_AGENT_IDS = new Set([
  CENTRAL_AGENT_ID,
  OBSIDIAN_AGENT_ID,
]);

export function isInstallTargetAgent(agent: Pick<AgentWithStatus, "id">): boolean {
  return !NON_INSTALL_TARGET_AGENT_IDS.has(agent.id);
}

export function isEnabledInstallTargetAgent(
  agent: Pick<AgentWithStatus, "id" | "is_enabled">
): boolean {
  return isInstallTargetAgent(agent) && agent.is_enabled;
}

const PLATFORM_PRIORITY = [
  "codex",
  "claude-code",
  "cursor",
  "copilot",
  "gemini-cli",
  "opencode",
  "windsurf",
  "trae",
  "qwen",
  "kiro",
  "openclaw",
  "qclaw",
  "easyclaw",
  "workbuddy",
];

export function sortAgentsByLocalPriority<T extends AgentWithStatus>(
  agents: T[]
): T[] {
  const priority = new Map(PLATFORM_PRIORITY.map((id, index) => [id, index]));
  return [...agents].sort((left, right) => {
    if (left.id === "codex" && right.id !== "codex") return -1;
    if (right.id === "codex" && left.id !== "codex") return 1;
    if (left.is_detected !== right.is_detected) return left.is_detected ? -1 : 1;
    const order =
      (priority.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (priority.get(right.id) ?? Number.MAX_SAFE_INTEGER);
    return order || left.display_name.localeCompare(right.display_name);
  });
}
