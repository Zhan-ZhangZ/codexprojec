import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "./paths";

// Load repo-root .env into process.env (only fills missing keys). Server-side
// only — shared by the agent service and the ingest CLI so they don't each
// reinvent it. Tiny on purpose: no dependency for what's a few lines.
export function loadEnv() {
  const envPath = resolve(REPO_ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && m[1] && !process.env[m[1]]) process.env[m[1]] = m[2]!.replace(/^["']|["']$/g, "");
  }
}
