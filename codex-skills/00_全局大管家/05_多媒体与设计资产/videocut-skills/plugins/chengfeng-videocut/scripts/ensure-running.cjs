#!/usr/bin/env node

"use strict";

// Node 拒绝直接 spawn .cmd/.bat（CVE-2024-27980 后策略）；Windows 启动器经 cmd.exe 转发。
function windowsSafeInvocation(command, args) {
  if (process.platform === "win32" && /\.(cmd|bat)$/i.test(command)) {
    return { command: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", command, ...args] };
  }
  return { command, args };
}


// darwin 的托管形态是 launchd，Windows（Runtime v0.4.0 起）是计划任务 + 看门狗。
// 跨模式（比如 win 上冒出 launchd）由 Runtime 侧判为冲突，这里只认本平台的形态。
const EXPECTED_RUNTIME_MODE = process.platform === "win32" ? "windows-task" : "launchd";

const { spawnSync } = require("node:child_process");
const {
  RUNTIME_CONTRACT,
  resolveRuntimeInvocation,
  supportsRequiredVersion,
} = require("./ensure-runtime.cjs");

const CANONICAL_URL = "http://127.0.0.1:5190/";

function parseJson(stdout) {
  const lines = String(stdout || "").trim().split(/\r?\n/).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]);
    } catch {
      // The Product may emit a human-readable line before its JSON envelope.
    }
  }
  return null;
}

function output(payload, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
    return;
  }
  if (payload?.ok === true) {
    process.stdout.write("chengfeng-videocut Studio service ready\n");
    return;
  }
  process.stderr.write(`${payload?.error?.message || "Studio service ensure failed"}\n`);
}

function isReadyService(payload) {
  const data = payload?.data;
  const identity = data?.identity;
  let canonicalUrl = null;
  try {
    canonicalUrl = new URL(data?.url).href;
  } catch {
    return false;
  }
  return payload?.schemaVersion === 1 &&
    payload?.product === "chengfeng-videocut" &&
    payload?.command === "service.ensure" &&
    payload?.ok === true &&
    data?.serviceApiVersion === RUNTIME_CONTRACT.capabilities.serviceApiVersion &&
    data?.action === "ensure" &&
    data?.state === "running" &&
    data?.ready === true &&
    data?.healthy === true &&
    data?.configured === true &&
    data?.runtimeMode === EXPECTED_RUNTIME_MODE &&
    Number.isInteger(data?.pid) && data.pid > 0 &&
    typeof data?.studioBuildId === "string" && data.studioBuildId.trim().length > 0 &&
    supportsRequiredVersion(data?.productVersion, RUNTIME_CONTRACT.minimumRuntimeVersion) &&
    identity?.product === "chengfeng-videocut" &&
    identity?.productVersion === data.productVersion &&
    identity?.pid === data.pid &&
    identity?.runtimeMode === data.runtimeMode &&
    identity?.studioBuildId === data.studioBuildId &&
    canonicalUrl === CANONICAL_URL;
}

function main(argv = process.argv.slice(2)) {
  const json = argv.includes("--json");
  const unknown = argv.filter((arg) => arg !== "--json");
  if (unknown.length > 0) {
    output({
      ok: false,
      error: { code: "invalid_argument", message: `未知参数: ${unknown.join(" ")}` },
    }, json);
    return 2;
  }

  let invocation;
  try {
    invocation = resolveRuntimeInvocation(["service", "ensure", "--json"]);
  } catch (error) {
    output({
      ok: false,
      error: {
        code: "runtime_resolution_failed",
        message: error instanceof Error ? error.message : String(error),
      },
    }, json);
    return 10;
  }

  if (!invocation) {
    output({
      ok: false,
      error: {
        code: "runtime_missing",
        message: "找不到 chengfeng-videocut；请先执行 ensure-runtime.cjs。",
      },
    }, json);
    return 10;
  }

  const result = spawnSync(...(({ command, args }) => [command, args])(windowsSafeInvocation(invocation.command, invocation.args)), {
    cwd: invocation.cwd,
    env: process.env,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const payload = parseJson(result.stdout);

  if (result.status === 0 && isReadyService(payload)) {
    output(payload, json);
    return 0;
  }


  if (result.status === 0 && payload?.ok === true) {
    output({
      ok: false,
      error: {
        code: "service_identity_mismatch",
        message: "Studio 服务已响应，但 envelope、Service API、健康状态、托管服务身份（launchd/windows-task）、版本、PID、build 或 canonical URL 不满足 Plugin 合同。",
        details: {
          requiredRuntimeMode: EXPECTED_RUNTIME_MODE,
          minimumRuntimeVersion: RUNTIME_CONTRACT.minimumRuntimeVersion,
          canonicalUrl: CANONICAL_URL,
          actual: payload.data || null,
        },
      },
    }, json);
    return 21;
  }

  if (payload?.ok === false) {
    output(payload, json);
    return Number.isInteger(result.status) && result.status > 0 ? result.status : 20;
  }

  output({
    ok: false,
    error: {
      code: "service_ensure_failed",
      message: "chengfeng-videocut service ensure 未返回有效的 JSON 成功结果。",
      details: {
        exitCode: result.status,
        signal: result.signal || null,
        stderr: String(result.stderr || "").trim(),
      },
    },
  }, json);
  return 20;
}

module.exports = { CANONICAL_URL, isReadyService, main, parseJson };

if (require.main === module) process.exitCode = main();
