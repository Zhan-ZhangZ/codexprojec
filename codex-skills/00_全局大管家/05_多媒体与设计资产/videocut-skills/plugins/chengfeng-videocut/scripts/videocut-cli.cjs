#!/usr/bin/env node

"use strict";

// Node 拒绝直接 spawn .cmd/.bat（CVE-2024-27980 后策略）；Windows 启动器经 cmd.exe 转发。
function windowsSafeInvocation(command, args) {
  if (process.platform === "win32" && /\.(cmd|bat)$/i.test(command)) {
    return { command: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", command, ...args] };
  }
  return { command, args };
}


const { spawn } = require("node:child_process");
const { resolveRuntimeInvocation } = require("./ensure-runtime.cjs");

let invocation;
try {
  invocation = resolveRuntimeInvocation(process.argv.slice(2));
} catch (error) {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

if (!invocation) {
  console.error(
    "ERROR: 找不到 chengfeng-videocut。请先运行 ensure-runtime.cjs --install-if-missing --json。",
  );
  process.exit(10);
}

const safe = windowsSafeInvocation(invocation.command, invocation.args);
const child = spawn(safe.command, safe.args, {
  cwd: invocation.cwd,
  env: process.env,
  stdio: "inherit",
});

child.once("error", (error) => {
  console.error(`ERROR: 无法启动 chengfeng-videocut: ${error.message}`);
  process.exitCode = 1;
});

child.once("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
