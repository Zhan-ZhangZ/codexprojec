#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  InventoryError,
  PROVENANCE_RELATIVE_PATH,
  canonicalRelativePath,
  digestInventoryEntries,
} = require("./plugin-inventory.cjs");

const COMMIT = /^[a-f0-9]{40}$/i;
const MAX_GIT_OUTPUT = 128 * 1024 * 1024;

function fail(message) {
  process.stderr.write(`update provenance failed: ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = {
    pluginRoot: path.resolve(__dirname, ".."),
    immutableRef: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--plugin-root") {
      const value = argv[++index];
      if (!value) fail("--plugin-root requires a path");
      parsed.pluginRoot = path.resolve(value);
      continue;
    }
    if (argument === "--immutable-ref") {
      parsed.immutableRef = argv[++index];
      continue;
    }
    if (!argument.startsWith("-") && !parsed.immutableRef) {
      parsed.immutableRef = argument;
      continue;
    }
    fail(`unknown argument: ${argument}`);
  }
  if (!COMMIT.test(parsed.immutableRef || "")) {
    fail("--immutable-ref must be exactly 40 hexadecimal characters");
  }
  parsed.immutableRef = parsed.immutableRef.toLowerCase();
  return parsed;
}

function runGit(cwd, args, options = {}) {
  const result = spawnSync("git", ["-C", cwd, ...args], {
    encoding: options.encoding === undefined ? "utf8" : options.encoding,
    input: options.input,
    maxBuffer: MAX_GIT_OUTPUT,
  });
  if (result.error || result.status !== 0) {
    const detail = Buffer.isBuffer(result.stderr)
      ? result.stderr.toString("utf8")
      : (result.stderr || result.error?.message || "");
    throw new Error(`git ${args[0]} failed: ${detail.trim() || `exit ${result.status}`}`);
  }
  return result.stdout;
}

function gitRepositoryFor(pluginRoot) {
  const probe = spawnSync("git", ["-C", pluginRoot, "rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    maxBuffer: MAX_GIT_OUTPUT,
  });
  if (probe.error || probe.status !== 0) return null;
  const repositoryRoot = fs.realpathSync(path.resolve(probe.stdout.trim()));
  const realPluginRoot = fs.realpathSync(pluginRoot);
  const relativePluginRoot = path.relative(repositoryRoot, realPluginRoot);
  if (
    !relativePluginRoot
    || relativePluginRoot === ".."
    || relativePluginRoot.startsWith(`..${path.sep}`)
    || path.isAbsolute(relativePluginRoot)
  ) {
    return null;
  }
  return {
    repositoryRoot,
    relativePluginRoot: canonicalRelativePath(relativePluginRoot),
  };
}

function gitTreeEntries(repositoryRoot, relativePluginRoot, immutableRef) {
  runGit(repositoryRoot, ["cat-file", "-e", `${immutableRef}^{commit}`]);
  const prefix = `${relativePluginRoot}/`;
  const output = runGit(
    repositoryRoot,
    ["ls-tree", "-r", "-z", "--full-tree", immutableRef, "--", relativePluginRoot],
    { encoding: null },
  );
  const records = output.toString("binary").split("\0").filter(Boolean);
  if (!records.length) {
    throw new InventoryError(`immutable ref does not contain plugin path: ${relativePluginRoot}`);
  }

  return records.map((record) => {
    const separator = record.indexOf("\t");
    if (separator < 0) throw new InventoryError("invalid git tree inventory record");
    const header = record.slice(0, separator);
    const pathBytes = Buffer.from(record.slice(separator + 1), "binary");
    const relativeToRepository = pathBytes.toString("utf8");
    if (!Buffer.from(relativeToRepository, "utf8").equals(pathBytes)) {
      throw new InventoryError("git inventory paths must be valid UTF-8");
    }
    const match = /^(\d{6}) ([^ ]+) ([a-f0-9]+)$/.exec(header);
    if (!match || !relativeToRepository.startsWith(prefix)) {
      throw new InventoryError("invalid git tree inventory entry");
    }
    const [, mode, type, objectId] = match;
    const relativePath = canonicalRelativePath(relativeToRepository.slice(prefix.length));
    if (mode === "120000") {
      throw new InventoryError(`symbolic links are forbidden in plugin inventory: ${relativePath}`);
    }
    if (type !== "blob") {
      throw new InventoryError(`non-file git inventory entry is forbidden: ${relativePath}`);
    }
    const content = runGit(repositoryRoot, ["cat-file", "blob", objectId], { encoding: null });
    return { relativePath, content };
  });
}

function assertWorktreeMatchesRef(repositoryRoot, relativePluginRoot, immutableRef) {
  const provenancePath = `${relativePluginRoot}/${PROVENANCE_RELATIVE_PATH}`;
  const compared = spawnSync(
    "git",
    [
      "-C",
      repositoryRoot,
      "diff",
      "--quiet",
      immutableRef,
      "--",
      relativePluginRoot,
      `:(exclude)${provenancePath}`,
    ],
    { maxBuffer: MAX_GIT_OUTPUT },
  );
  if (compared.error || compared.status !== 0) {
    throw new Error("plugin worktree differs from immutable ref outside update-provenance.json");
  }
  const untracked = runGit(
    repositoryRoot,
    ["ls-files", "--others", "--exclude-standard", "-z", "--", relativePluginRoot],
    { encoding: null },
  )
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter((entry) => canonicalRelativePath(entry) !== provenancePath);
  if (untracked.length) {
    throw new Error(`plugin worktree has uncommitted inventory entries: ${untracked.join(", ")}`);
  }
}

function readManifestFromEntries(entries) {
  const manifestEntry = entries.find(
    (entry) => entry.relativePath === ".codex-plugin/plugin.json",
  );
  if (!manifestEntry) throw new Error("plugin manifest is missing from inventory");
  let manifest;
  try {
    manifest = JSON.parse(manifestEntry.content.toString("utf8"));
  } catch (error) {
    throw new Error(`plugin manifest is invalid JSON: ${error.message}`);
  }
  if (typeof manifest.name !== "string" || !manifest.name) {
    throw new Error("plugin manifest name is required");
  }
  if (typeof manifest.version !== "string" || !manifest.version) {
    throw new Error("plugin manifest version is required");
  }
  return manifest;
}

function ensureWritableProvenancePath(pluginRoot) {
  const rootStat = fs.lstatSync(pluginRoot);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error("plugin root must be a real directory");
  }
  const parent = path.join(pluginRoot, ".codex-plugin");
  const parentStat = fs.lstatSync(parent);
  if (parentStat.isSymbolicLink() || !parentStat.isDirectory()) {
    throw new Error(".codex-plugin must be a real directory");
  }
  const outputPath = path.join(pluginRoot, ...PROVENANCE_RELATIVE_PATH.split("/"));
  if (fs.existsSync(outputPath) && fs.lstatSync(outputPath).isSymbolicLink()) {
    throw new Error("update-provenance.json must not be a symbolic link");
  }
  return outputPath;
}

function main() {
  const input = parseArgs(process.argv.slice(2));
  const repository = gitRepositoryFor(input.pluginRoot);
  if (!repository) {
    throw new Error(
      "plugin root must be inside a Git repository; filesystem-only provenance is forbidden",
    );
  }
  const head = runGit(
    repository.repositoryRoot,
    ["rev-parse", "HEAD^{commit}"],
  ).trim().toLowerCase();
  if (head !== input.immutableRef) {
    throw new Error(
      "immutable ref must equal the repository HEAD used for the content snapshot",
    );
  }
  const entries = gitTreeEntries(
    repository.repositoryRoot,
    repository.relativePluginRoot,
    input.immutableRef,
  );
  assertWorktreeMatchesRef(
    repository.repositoryRoot,
    repository.relativePluginRoot,
    input.immutableRef,
  );

  const manifest = readManifestFromEntries(entries);
  const publisherChecksum = digestInventoryEntries(entries);
  const provenance = {
    name: manifest.name,
    version: manifest.version,
    immutableRef: input.immutableRef,
    publisherChecksum,
  };
  const outputPath = ensureWritableProvenancePath(input.pluginRoot);
  fs.writeFileSync(outputPath, `${JSON.stringify(provenance, null, 2)}\n`, "utf8");
  process.stdout.write(
    `${JSON.stringify({ ok: true, source: "git-tree", outputPath, ...provenance })}\n`,
  );
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
