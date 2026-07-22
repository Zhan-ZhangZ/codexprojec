import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverFiles = [
  "plugins/drawio-scientific-illustrator/scripts/live-server.mjs",
  "plugins/drawio-scientific-illustrator/scripts/server.mjs",
];

async function testServer(relativeFile) {
  const child = spawn(process.execPath, [path.join(root, relativeFile)], { stdio: ["pipe", "pipe", "pipe"] });
  const lines = createInterface({ input: child.stdout });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += String(chunk); });

  const responses = new Map();
  const completed = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out: ${relativeFile}\n${stderr}`)), 8000);
    lines.on("line", (line) => {
      try {
        const message = JSON.parse(line);
        if (message.id === 1 || message.id === 2) responses.set(message.id, message);
        if (responses.size === 2) {
          clearTimeout(timer);
          resolve();
        }
      } catch (error) {
        clearTimeout(timer);
        reject(new Error(`Invalid MCP JSON from ${relativeFile}: ${error.message}`));
      }
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (responses.size < 2) reject(new Error(`${relativeFile} exited early with ${code}. ${stderr}`));
    });
  });

  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "smoke-test", version: "1.0.0" } } })}\n`);
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })}\n`);

  try {
    await completed;
    if (responses.get(1)?.error) throw new Error(JSON.stringify(responses.get(1).error));
    const tools = responses.get(2)?.result?.tools;
    if (!Array.isArray(tools) || tools.length === 0) throw new Error(`${relativeFile} returned no tools.`);
    console.log(`${relativeFile}: ${tools.length} tools`);
  } finally {
    lines.close();
    child.kill();
  }
}

for (const server of serverFiles) await testServer(server);
console.log("MCP smoke tests passed.");
