#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  PROVENANCE_RELATIVE_PATH,
  inventoryDigest: computeInventoryDigest,
} = require("./plugin-inventory.cjs");

const PLUGIN = "chengfeng-videocut";
const EXPECTED_MARKETPLACE_SOURCE =
  "https://github.com/Agentchengfeng/chengfeng-videocut-skills.git";
const EXPECTED_MARKETPLACE_ADD_SOURCE =
  "Agentchengfeng/chengfeng-videocut-skills";
const STAGING_REF = "stable";
const MARKETPLACE_INSTALL_METADATA = ".codex-marketplace-install.json";
const PROVENANCE = path.join(...PROVENANCE_RELATIVE_PATH.split("/"));
const SHA256 = /^[a-f0-9]{64}$/i;
const COMMIT = /^[a-f0-9]{40}$/i;
const MARKETPLACE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z.-]+)?$/;

function out(value, code = 0) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
  process.exit(code);
}

function stop(status, message, extra = {}, code = 20) {
  out(
    {
      schemaVersion: 2,
      ok: false,
      status,
      error: { code: status, message },
      ...extra,
    },
    code,
  );
}

function parseArgs() {
  const input = {
    mode: "check",
    marketplace: null,
    confirmed: false,
  };
  for (let index = 2; index < process.argv.length; index += 1) {
    const argument = process.argv[index];
    if (argument === "--json") continue;
    if (argument === "--inspect") {
      input.mode = "inspect";
      continue;
    }
    if (argument === "--activate") {
      input.mode = "activate";
      continue;
    }
    if (argument === "--confirmed") {
      input.confirmed = true;
      continue;
    }
    const readValue = () => {
      const value = process.argv[++index];
      if (!value || value.startsWith("--")) {
        stop("invalid_arguments", `${argument} requires a value`);
      }
      return value;
    };
    if (argument === "--marketplace") {
      input.marketplace = readValue();
      continue;
    }
    if (argument === "--expected-version") {
      input.expectedVersion = readValue();
      continue;
    }
    if (argument === "--expected-snapshot-revision") {
      input.expectedSnapshotRevision = readValue();
      continue;
    }
    if (argument === "--expected-content-revision") {
      input.expectedContentRevision = readValue();
      continue;
    }
    if (argument === "--expected-ref") {
      const compatibilityValue = readValue();
      if (
        input.expectedContentRevision
        && input.expectedContentRevision !== compatibilityValue
      ) {
        stop(
          "invalid_arguments",
          "--expected-ref and --expected-content-revision disagree",
        );
      }
      input.expectedContentRevision = compatibilityValue;
      continue;
    }
    if (argument === "--expected-sha256") {
      input.expectedChecksum = readValue();
      continue;
    }
    stop("invalid_arguments", `unknown argument: ${argument}`);
  }
  if (
    !input.marketplace
    || !MARKETPLACE_SEGMENT.test(input.marketplace)
    || input.marketplace === "."
    || input.marketplace === ".."
  ) {
    stop(
      "invalid_arguments",
      "--marketplace must be a single safe marketplace name",
    );
  }
  return input;
}

function normalizedPath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function samePath(left, right) {
  return normalizedPath(left) === normalizedPath(right);
}

function isSameOrInside(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return (
    relative === ""
    || (!relative.startsWith(`..${path.sep}`)
      && relative !== ".."
      && !path.isAbsolute(relative))
  );
}

function inspectRealDirectory(directory) {
  try {
    const stat = fs.lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      return { ok: false, message: "path is not a real directory" };
    }
    const real = fs.realpathSync.native(directory);
    if (!samePath(real, directory)) {
      return {
        ok: false,
        message: "directory resolves through a symbolic link or junction",
      };
    }
    return { ok: true, real };
  } catch (error) {
    return { ok: false, message: error.message, code: error.code };
  }
}

function readJsonFile(file) {
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      return { ok: false, message: "JSON path is not a real file" };
    }
    const contents = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    const data = JSON.parse(contents);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { ok: false, message: "JSON root must be an object" };
    }
    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: error.message, code: error.code };
  }
}

function isFile(candidate) {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function windowsExecutableExtensions() {
  const supported = new Set([".COM", ".EXE", ".CMD", ".BAT"]);
  const seen = new Set();
  const extensions = [];
  for (const raw of (
    process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM"
  ).split(";")) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const normalized = `${
      trimmed.startsWith(".") ? "" : "."
    }${trimmed}`.toUpperCase();
    if (!supported.has(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    extensions.push(normalized);
  }
  return extensions;
}

function windowsSafeExecutable(command) {
  return /\.(cmd|bat)$/i.test(command)
    ? {
        command: process.env.ComSpec || "cmd.exe",
        batchCommand: command,
      }
    : { command };
}

function resolveExecutable(bin) {
  if (process.platform !== "win32") return { command: bin };
  const extensions = windowsExecutableExtensions();
  const hasPath = bin.includes("\\") || bin.includes("/");
  if (hasPath) {
    const candidates = path.extname(bin)
      ? [bin]
      : [...extensions.map((extension) => `${bin}${extension}`), bin];
    const found = candidates.find(isFile);
    return windowsSafeExecutable(found || bin);
  }
  const directories = (process.env.PATH || "")
    .split(path.delimiter)
    .filter(Boolean);
  for (const directory of directories) {
    for (const extension of extensions) {
      const candidate = path.join(directory, `${bin}${extension}`);
      if (isFile(candidate)) return windowsSafeExecutable(candidate);
    }
  }
  for (const directory of directories) {
    const candidate = path.join(directory, bin);
    if (isFile(candidate)) return windowsSafeExecutable(candidate);
  }
  return windowsSafeExecutable(bin);
}

function quoteCmdArgument(value) {
  const text = String(value);
  if (/[\0\r\n"]/.test(text)) {
    throw new Error("unsafe Windows command argument");
  }
  return `"${text.replaceAll("%", "%%")}"`;
}

function runRaw(bin, argv, env) {
  const resolved = resolveExecutable(bin);
  const batch = resolved.batchCommand;
  const childArgs = batch
    ? [
        "/d",
        "/v:off",
        "/s",
        "/c",
        `"${[
          quoteCmdArgument(batch),
          ...argv.map(quoteCmdArgument),
        ].join(" ")}"`,
      ]
    : argv;
  let result;
  try {
    result = spawnSync(resolved.command, childArgs, {
      cwd: fs.realpathSync.native(os.tmpdir()),
      encoding: "utf8",
      env,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
      windowsVerbatimArguments: Boolean(batch),
    });
  } catch (error) {
    return {
      ok: false,
      command: [bin, ...argv],
      status: null,
      stderr: String(error),
    };
  }
  if (result.error || result.status !== 0) {
    return {
      ok: false,
      command: [bin, ...argv],
      status: result.status,
      stderr: (
        result.stderr
        || result.error?.message
        || ""
      ).trim(),
    };
  }
  return {
    ok: true,
    command: [bin, ...argv],
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function run(bin, argv, env) {
  const result = runRaw(bin, argv, env);
  if (!result.ok) return result;
  try {
    return {
      ok: true,
      command: result.command,
      data: JSON.parse(result.stdout.replace(/^\uFEFF/, "")),
    };
  } catch {
    return {
      ok: false,
      command: result.command,
      status: result.status,
      stderr: "Codex command did not return JSON",
    };
  }
}

function canonicalGitHubSource(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:"
      || url.hostname.toLowerCase() !== "github.com"
      || url.port
      || url.search
      || url.hash
    ) {
      return null;
    }
    const pathname = url.pathname.replace(/\/$/, "").toLowerCase();
    if (!pathname.endsWith(".git")) return null;
    return `https://github.com${pathname}`;
  } catch {
    return null;
  }
}

function marketplaceRoot(codexHome, marketplace) {
  return path.join(codexHome, ".tmp", "marketplaces", marketplace);
}

function pluginCacheBase(codexHome, marketplace) {
  return path.join(
    codexHome,
    "plugins",
    "cache",
    marketplace,
    PLUGIN,
  );
}

function installedExecutionContext() {
  let pluginRoot;
  try {
    pluginRoot = fs.realpathSync.native(path.resolve(__dirname, ".."));
  } catch {
    return null;
  }
  const version = path.basename(pluginRoot);
  const pluginDirectory = path.dirname(pluginRoot);
  if (path.basename(pluginDirectory) !== PLUGIN) return null;
  const marketplaceDirectory = path.dirname(pluginDirectory);
  const marketplace = path.basename(marketplaceDirectory);
  const cacheDirectory = path.dirname(marketplaceDirectory);
  const pluginsDirectory = path.dirname(cacheDirectory);
  if (
    path.basename(cacheDirectory) !== "cache"
    || path.basename(pluginsDirectory) !== "plugins"
    || !MARKETPLACE_SEGMENT.test(marketplace)
  ) {
    return null;
  }
  const codexHome = path.dirname(pluginsDirectory);
  const expected = path.join(
    codexHome,
    "plugins",
    "cache",
    marketplace,
    PLUGIN,
    version,
  );
  if (!samePath(pluginRoot, expected)) return null;
  return { codexHome, marketplace, pluginRoot, version };
}

function readMarketplace(codexHome, marketplace, refMode) {
  const root = marketplaceRoot(codexHome, marketplace);
  const directory = inspectRealDirectory(root);
  if (!directory.ok) {
    return {
      ok: false,
      status:
        directory.code === "ENOENT"
          ? "marketplace_not_found"
          : "marketplace_source_untrusted",
      message:
        directory.code === "ENOENT"
          ? `marketplace ${marketplace} is not configured`
          : `marketplace root is unsafe: ${directory.message}`,
    };
  }
  const parsed = readJsonFile(
    path.join(root, MARKETPLACE_INSTALL_METADATA),
  );
  if (!parsed.ok) {
    return {
      ok: false,
      status: "marketplace_source_untrusted",
      message: `marketplace install metadata is missing or invalid: ${parsed.message}`,
    };
  }
  const metadata = parsed.data;
  const expectedSource = canonicalGitHubSource(
    EXPECTED_MARKETPLACE_SOURCE,
  );
  if (
    metadata.source_type !== "git"
    || canonicalGitHubSource(metadata.source) !== expectedSource
    || !Array.isArray(metadata.sparse_paths)
    || metadata.sparse_paths.length !== 0
    || !COMMIT.test(metadata.revision || "")
  ) {
    return {
      ok: false,
      status: "marketplace_source_untrusted",
      message:
        "marketplace metadata does not prove the complete official Git snapshot",
    };
  }
  const snapshotRevision = metadata.revision.toLowerCase();
  if (
    metadata.last_revision !== undefined
    && (
      !COMMIT.test(metadata.last_revision)
      || metadata.last_revision.toLowerCase() !== snapshotRevision
    )
  ) {
    return {
      ok: false,
      status: "marketplace_source_untrusted",
      message: "marketplace metadata contains a conflicting last revision",
    };
  }
  if (refMode === "pinned") {
    if (
      !COMMIT.test(metadata.ref_name || "")
      || metadata.ref_name.toLowerCase() !== snapshotRevision
    ) {
      return {
        ok: false,
        status: "marketplace_ref_unsafe",
        message:
          "the user marketplace must remain permanently pinned to its exact 40-hex snapshot revision",
      };
    }
  } else if (refMode === "stable" && metadata.ref_name !== STAGING_REF) {
    return {
      ok: false,
      status: "update_metadata_untrusted",
      message:
        "the isolated candidate marketplace is not on the official stable staging channel",
    };
  }
  return {
    ok: true,
    value: {
      root,
      source: expectedSource,
      refName: metadata.ref_name,
      snapshotRevision,
    },
  };
}

function parseSemver(value) {
  const match = SEMVER.exec(value || "");
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

function comparePrerelease(left, right) {
  if (left.length === 0 && right.length === 0) return 0;
  if (left.length === 0) return 1;
  if (right.length === 0) return -1;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    if (left[index] === undefined) return -1;
    if (right[index] === undefined) return 1;
    if (left[index] === right[index]) continue;
    const leftNumber = /^\d+$/.test(left[index]);
    const rightNumber = /^\d+$/.test(right[index]);
    if (leftNumber && rightNumber) {
      return Number(left[index]) < Number(right[index]) ? -1 : 1;
    }
    if (leftNumber !== rightNumber) return leftNumber ? -1 : 1;
    return left[index] < right[index] ? -1 : 1;
  }
  return 0;
}

function compareSemver(leftValue, rightValue) {
  const left = parseSemver(leftValue);
  const right = parseSemver(rightValue);
  if (!left || !right) return null;
  for (const field of ["major", "minor", "patch"]) {
    if (left[field] !== right[field]) {
      return left[field] < right[field] ? -1 : 1;
    }
  }
  return comparePrerelease(left.prerelease, right.prerelease);
}

function readBundle(bundlePath, { requireProvenance }) {
  const directory = inspectRealDirectory(bundlePath);
  if (!directory.ok) {
    return {
      ok: false,
      message: `plugin bundle is not a real readable directory: ${directory.message}`,
    };
  }
  const manifestResult = readJsonFile(
    path.join(bundlePath, ".codex-plugin", "plugin.json"),
  );
  if (!manifestResult.ok) {
    return {
      ok: false,
      message: `plugin manifest is missing or invalid: ${manifestResult.message}`,
    };
  }
  const manifest = manifestResult.data;
  if (
    manifest.name !== PLUGIN
    || typeof manifest.version !== "string"
    || !parseSemver(manifest.version)
  ) {
    return {
      ok: false,
      message: "plugin manifest name or strict semver version is invalid",
    };
  }

  const provenancePath = path.join(bundlePath, PROVENANCE);
  let provenance = null;
  try {
    fs.lstatSync(provenancePath);
    const provenanceResult = readJsonFile(provenancePath);
    if (!provenanceResult.ok) {
      return {
        ok: false,
        message: `plugin provenance is invalid: ${provenanceResult.message}`,
      };
    }
    provenance = provenanceResult.data;
  } catch (error) {
    if (error.code !== "ENOENT") {
      return {
        ok: false,
        message: `plugin provenance is unreadable: ${error.message}`,
      };
    }
  }
  if (requireProvenance && !provenance) {
    return {
      ok: false,
      message: "plugin provenance is required",
    };
  }

  let bundleDigest;
  try {
    bundleDigest = computeInventoryDigest(bundlePath).toLowerCase();
  } catch (error) {
    return {
      ok: false,
      message: `plugin inventory is invalid: ${error.message}`,
    };
  }

  if (provenance) {
    if (
      provenance.name !== manifest.name
      || provenance.version !== manifest.version
      || !COMMIT.test(provenance.immutableRef || "")
      || !SHA256.test(provenance.publisherChecksum || "")
      || provenance.publisherChecksum.toLowerCase() !== bundleDigest
    ) {
      return {
        ok: false,
        message:
          "plugin manifest, provenance, and inventory digest do not bind to one identity",
      };
    }
  }

  return {
    ok: true,
    value: {
      name: manifest.name,
      version: manifest.version,
      contentRevision: provenance
        ? provenance.immutableRef.toLowerCase()
        : undefined,
      publisherChecksum: provenance
        ? provenance.publisherChecksum.toLowerCase()
        : undefined,
      bundleDigest,
      provenancePresent: Boolean(provenance),
      bundlePath,
    },
  };
}

function readActiveCache(codexHome, marketplace) {
  const base = pluginCacheBase(codexHome, marketplace);
  const directory = inspectRealDirectory(base);
  if (!directory.ok) {
    return {
      ok: false,
      status: "installed_identity_missing",
      message: `installed plugin cache is missing or unsafe: ${directory.message}`,
    };
  }
  let versions;
  try {
    versions = fs
      .readdirSync(base, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
      .map((entry) => entry.name);
  } catch (error) {
    return {
      ok: false,
      status: "installed_identity_missing",
      message: `installed plugin cache cannot be enumerated: ${error.message}`,
    };
  }
  const unsupportedVersions = versions.filter(
    (version) => !parseSemver(version),
  );
  if (unsupportedVersions.length) {
    return {
      ok: false,
      status: "installed_identity_untrusted",
      message:
        `plugin cache contains unsupported version entries: ${unsupportedVersions.join(", ")}`,
    };
  }
  if (versions.length === 0) {
    return {
      ok: false,
      status: "installed_identity_missing",
      message: "installed plugin cache has no active semver version",
    };
  }
  versions.sort((left, right) => {
    const compared = compareSemver(left, right);
    return compared || left.localeCompare(right);
  });
  const cacheVersion = versions.at(-1);
  const equivalentHighest = versions.filter(
    (version) => compareSemver(version, cacheVersion) === 0,
  );
  if (equivalentHighest.length !== 1) {
    return {
      ok: false,
      status: "installed_identity_untrusted",
      message:
        `plugin cache has multiple directories with equivalent highest semver precedence: ${equivalentHighest.join(", ")}`,
    };
  }
  const bundle = readBundle(path.join(base, cacheVersion), {
    requireProvenance: false,
  });
  if (!bundle.ok) {
    return {
      ok: false,
      status: "installed_identity_untrusted",
      message: bundle.message,
    };
  }
  if (cacheVersion !== bundle.value.version) {
    return {
      ok: false,
      status: "installed_identity_untrusted",
      message:
        "active cache directory version does not match its plugin manifest",
    };
  }
  if (
    !bundle.value.provenancePresent
    && compareSemver(cacheVersion, "0.10.5") > 0
  ) {
    return {
      ok: false,
      status: "installed_identity_untrusted",
      message:
        "installed plugin versions newer than 0.10.5 require update provenance",
    };
  }
  return {
    ok: true,
    value: {
      ...bundle.value,
      cacheVersion,
      legacyInstalledIdentity: !bundle.value.provenancePresent,
    },
  };
}

function publicCacheIdentity(cache) {
  const value = {
    name: cache.name,
    version: cache.version,
    cacheVersion: cache.cacheVersion,
    bundleDigest: cache.bundleDigest,
  };
  if (cache.contentRevision) {
    value.contentRevision = cache.contentRevision;
    value.publisherChecksum = cache.publisherChecksum;
  }
  return value;
}

function verifyLegacyInstalledIdentity(market, cache) {
  const sourcePath = path.join(market.root, "plugins", PLUGIN);
  const source = readBundle(sourcePath, { requireProvenance: false });
  if (!source.ok) {
    return {
      ok: false,
      message:
        `legacy marketplace plugin source is missing or invalid: ${source.message}`,
    };
  }
  if (
    source.value.provenancePresent
    || source.value.name !== cache.name
    || source.value.version !== cache.version
    || source.value.bundleDigest !== cache.bundleDigest
  ) {
    return {
      ok: false,
      message:
        "legacy installed cache does not match the plugin bytes in its pinned marketplace snapshot",
    };
  }
  const git = process.env.GIT_BIN || "git";
  const env = {
    ...process.env,
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
  };
  const invoke = (args) => runRaw(
    git,
    ["-C", market.root, ...args],
    env,
  );
  const top = invoke(["rev-parse", "--show-toplevel"]);
  if (!top.ok || !samePath(top.stdout.trim(), market.root)) {
    return {
      ok: false,
      message:
        "legacy marketplace is not the expected Git worktree root",
      detail: top,
    };
  }
  const origin = invoke(["remote", "get-url", "origin"]);
  if (
    !origin.ok
    || canonicalGitHubSource(origin.stdout.trim())
      !== canonicalGitHubSource(EXPECTED_MARKETPLACE_SOURCE)
  ) {
    return {
      ok: false,
      message: "legacy marketplace Git origin is not official",
      detail: origin,
    };
  }
  const head = invoke(["rev-parse", "HEAD^{commit}"]);
  if (
    !head.ok
    || head.stdout.trim().toLowerCase() !== market.snapshotRevision
  ) {
    return {
      ok: false,
      message:
        "legacy marketplace Git HEAD does not match its pinned snapshot revision",
      detail: head,
    };
  }
  const clean = invoke([
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "--",
    `plugins/${PLUGIN}`,
  ]);
  if (!clean.ok || clean.stdout.length !== 0) {
    return {
      ok: false,
      message: "legacy marketplace plugin subtree is not a clean Git checkout",
      detail: clean,
    };
  }
  return { ok: true };
}

function verifyProvenancedInstalledIdentity(market, cache) {
  const sourcePath = path.join(market.root, "plugins", PLUGIN);
  const source = readBundle(sourcePath, { requireProvenance: true });
  if (!source.ok) {
    return {
      ok: false,
      message:
        `installed marketplace plugin source is missing or invalid: ${source.message}`,
    };
  }
  if (
    source.value.name !== cache.name
    || source.value.version !== cache.version
    || source.value.contentRevision !== cache.contentRevision
    || source.value.publisherChecksum !== cache.publisherChecksum
    || source.value.bundleDigest !== cache.bundleDigest
  ) {
    return {
      ok: false,
      message:
        "installed cache identity does not match the plugin bytes in its pinned marketplace snapshot",
    };
  }
  return verifyCandidateGitSnapshot(
    market,
    sourcePath,
    cache.contentRevision,
  );
}

function validateAddOutput(data, marketplace, expectedRoot, alreadyAdded) {
  if (
    !data
    || typeof data !== "object"
    || Array.isArray(data)
    || data.marketplaceName !== marketplace
    || typeof data.installedRoot !== "string"
    || !samePath(data.installedRoot, expectedRoot)
    || data.alreadyAdded !== alreadyAdded
  ) {
    return {
      ok: false,
      message: "Codex marketplace add returned an unexpected JSON shape",
    };
  }
  return { ok: true };
}

function validateRemoveOutput(data, marketplace, expectedRoot) {
  if (
    !data
    || typeof data !== "object"
    || Array.isArray(data)
    || data.marketplaceName !== marketplace
    || typeof data.installedRoot !== "string"
    || !samePath(data.installedRoot, expectedRoot)
  ) {
    return {
      ok: false,
      message: "Codex marketplace remove returned an unexpected JSON shape",
    };
  }
  return { ok: true };
}

function validateUpgradeOutput(data, marketplace, expectedRoot) {
  if (
    !data
    || typeof data !== "object"
    || Array.isArray(data)
    || !Array.isArray(data.selectedMarketplaces)
    || !Array.isArray(data.upgradedRoots)
    || !Array.isArray(data.errors)
    || data.errors.length !== 0
    || data.selectedMarketplaces.length !== 1
    || data.selectedMarketplaces[0] !== marketplace
    || data.upgradedRoots.length !== 1
    || typeof data.upgradedRoots[0] !== "string"
    || !samePath(data.upgradedRoots[0], expectedRoot)
  ) {
    return {
      ok: false,
      message: "Codex marketplace upgrade returned an unexpected JSON shape",
    };
  }
  return { ok: true };
}

function verifyCandidateGitSnapshot(market, sourcePath, contentRevision) {
  const relativePluginPath = path
    .relative(market.root, sourcePath)
    .split(path.sep)
    .join("/");
  if (relativePluginPath !== `plugins/${PLUGIN}`) {
    return {
      ok: false,
      message:
        "isolated candidate path does not match the official plugin subtree",
    };
  }
  const git = process.env.GIT_BIN || "git";
  const env = {
    ...process.env,
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
  };
  const invoke = (args) => runRaw(
    git,
    ["-C", market.root, ...args],
    env,
  );
  const top = invoke(["rev-parse", "--show-toplevel"]);
  if (
    !top.ok
    || !samePath(top.stdout.trim(), market.root)
  ) {
    return {
      ok: false,
      message:
        "isolated marketplace is not the expected Git worktree root",
      detail: top,
    };
  }
  const origin = invoke(["remote", "get-url", "origin"]);
  if (
    !origin.ok
    || canonicalGitHubSource(origin.stdout.trim())
      !== canonicalGitHubSource(EXPECTED_MARKETPLACE_SOURCE)
  ) {
    return {
      ok: false,
      message: "isolated marketplace Git origin is not official",
      detail: origin,
    };
  }
  const head = invoke(["rev-parse", "HEAD^{commit}"]);
  if (
    !head.ok
    || head.stdout.trim().toLowerCase() !== market.snapshotRevision
  ) {
    return {
      ok: false,
      message:
        "isolated marketplace Git HEAD does not match its snapshot revision",
      detail: head,
    };
  }
  const contentCommit = invoke([
    "cat-file",
    "-e",
    `${contentRevision}^{commit}`,
  ]);
  if (!contentCommit.ok) {
    return {
      ok: false,
      message: "candidate content revision is not a Git commit in the official snapshot",
      detail: contentCommit,
    };
  }
  const ancestor = invoke([
    "merge-base",
    "--is-ancestor",
    contentRevision,
    market.snapshotRevision,
  ]);
  if (!ancestor.ok) {
    return {
      ok: false,
      message:
        "candidate content revision is not an ancestor of the snapshot revision",
      detail: ancestor,
    };
  }
  const clean = invoke([
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "--",
    relativePluginPath,
  ]);
  if (!clean.ok || clean.stdout.length !== 0) {
    return {
      ok: false,
      message: "isolated candidate plugin subtree is not a clean Git checkout",
      detail: clean,
    };
  }
  const treeDiff = invoke([
    "diff",
    "--quiet",
    contentRevision,
    market.snapshotRevision,
    "--",
    relativePluginPath,
    `:(exclude)${relativePluginPath}/${PROVENANCE_RELATIVE_PATH}`,
  ]);
  if (!treeDiff.ok) {
    return {
      ok: false,
      message:
        "candidate content and snapshot commits differ outside update provenance",
      detail: treeDiff,
    };
  }
  return { ok: true };
}

function candidateFromList(data, marketplace, market) {
  if (
    !data
    || typeof data !== "object"
    || Array.isArray(data)
    || !Array.isArray(data.installed)
    || !Array.isArray(data.available)
  ) {
    return {
      ok: false,
      message: "Codex plugin list returned an unexpected JSON shape",
    };
  }
  const pluginId = `${PLUGIN}@${marketplace}`;
  const installedMatches = data.installed.filter(
    (row) =>
      row
      && typeof row === "object"
      && (
        row.pluginId === pluginId
        || (
          row.name === PLUGIN
          && (
            row.marketplaceName === marketplace
            || row.pluginId?.endsWith(`@${marketplace}`)
          )
        )
      ),
  );
  if (installedMatches.length !== 0) {
    return {
      ok: false,
      message:
        "isolated candidate home unexpectedly contains an installed target plugin",
    };
  }
  const matches = data.available.filter(
    (row) =>
      row
      && typeof row === "object"
      && row.pluginId === pluginId
      && row.name === PLUGIN
      && row.marketplaceName === marketplace,
  );
  if (matches.length !== 1) {
    return {
      ok: false,
      message: "isolated marketplace did not expose exactly one plugin candidate",
    };
  }
  const row = matches[0];
  const marketplaceSource = row.marketplaceSource;
  const sourcePath = row.source?.path;
  if (
    row.installed !== false
    || row.source?.source !== "local"
    || typeof sourcePath !== "string"
    || !path.isAbsolute(sourcePath)
    || !isSameOrInside(market.root, sourcePath)
    || samePath(market.root, sourcePath)
    || marketplaceSource?.sourceType !== "git"
    || canonicalGitHubSource(marketplaceSource.source)
      !== canonicalGitHubSource(EXPECTED_MARKETPLACE_SOURCE)
  ) {
    return {
      ok: false,
      message:
        "isolated candidate source does not belong to the verified official snapshot",
    };
  }
  const bundle = readBundle(sourcePath, { requireProvenance: true });
  if (!bundle.ok) return bundle;
  const gitSnapshot = verifyCandidateGitSnapshot(
    market,
    sourcePath,
    bundle.value.contentRevision,
  );
  if (!gitSnapshot.ok) return gitSnapshot;
  if (
    row.version !== bundle.value.version
    || bundle.value.contentRevision === market.snapshotRevision
  ) {
    return {
      ok: false,
      message:
        "candidate row, manifest, content revision, and snapshot revision are not independently bound",
    };
  }
  return {
    ok: true,
    value: {
      name: PLUGIN,
      version: bundle.value.version,
      snapshotRevision: market.snapshotRevision,
      contentRevision: bundle.value.contentRevision,
      publisherChecksum: bundle.value.publisherChecksum,
      bundleDigest: bundle.value.bundleDigest,
    },
  };
}

function stageError(status, message, extra = {}) {
  return {
    ok: false,
    status,
    message,
    extra: {
      scope: "isolated",
      isolatedCandidateCheck: true,
      userMutationPerformed: false,
      ...extra,
    },
  };
}

function cleanupTemporaryHome(codexHome, canonicalParent) {
  try {
    if (
      !samePath(path.dirname(codexHome), canonicalParent)
      || !path.basename(codexHome).startsWith(`${PLUGIN}-update-`)
    ) {
      return {
        ok: false,
        message: "temporary CODEX_HOME escaped its canonical parent",
      };
    }
    const directory = inspectRealDirectory(codexHome);
    if (!directory.ok) {
      return {
        ok: false,
        message: `temporary CODEX_HOME is unsafe: ${directory.message}`,
      };
    }
    let cwd = process.cwd();
    try {
      cwd = fs.realpathSync.native(cwd);
    } catch {
      cwd = path.resolve(cwd);
    }
    if (isSameOrInside(directory.real, cwd)) {
      return {
        ok: false,
        message: "refusing to remove a temporary home containing process cwd",
      };
    }
    fs.rmSync(directory.real, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
    if (fs.existsSync(directory.real)) {
      return {
        ok: false,
        message: "temporary CODEX_HOME still exists after cleanup",
      };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

function stageCandidate(bin, marketplace) {
  let canonicalParent;
  let codexHome;
  let result;
  try {
    canonicalParent = fs.realpathSync.native(os.tmpdir());
    const parentDirectory = inspectRealDirectory(canonicalParent);
    if (!parentDirectory.ok) {
      return stageError(
        "isolated_stage_failed",
        `canonical temporary parent is unsafe: ${parentDirectory.message}`,
      );
    }
    codexHome = fs.mkdtempSync(
      path.join(canonicalParent, `${PLUGIN}-update-`),
    );
    const isolatedEnv = { ...process.env, CODEX_HOME: codexHome };
    const root = marketplaceRoot(codexHome, marketplace);
    const added = run(
      bin,
      [
        "plugin",
        "marketplace",
        "add",
        EXPECTED_MARKETPLACE_ADD_SOURCE,
        "--ref",
        STAGING_REF,
        "--json",
      ],
      isolatedEnv,
    );
    if (!added.ok) {
      result = stageError(
        "isolated_stage_failed",
        "could not add the official stable marketplace in an isolated Codex home",
        { detail: added },
      );
    } else {
      const addShape = validateAddOutput(
        added.data,
        marketplace,
        root,
        false,
      );
      if (!addShape.ok) {
        result = stageError(
          "isolated_stage_schema_invalid",
          addShape.message,
          { detail: added },
        );
      }
    }
    if (!result) {
      const upgraded = run(
        bin,
        [
          "plugin",
          "marketplace",
          "upgrade",
          marketplace,
          "--json",
        ],
        isolatedEnv,
      );
      if (!upgraded.ok) {
        result = stageError(
          "isolated_stage_failed",
          "could not refresh and materialize the isolated stable snapshot",
          { detail: upgraded },
        );
      } else {
        const upgradeShape = validateUpgradeOutput(
          upgraded.data,
          marketplace,
          root,
        );
        if (!upgradeShape.ok) {
          result = stageError(
            "isolated_stage_schema_invalid",
            upgradeShape.message,
            { detail: upgraded },
          );
        }
      }
    }
    let market;
    if (!result) {
      const marketResult = readMarketplace(
        codexHome,
        marketplace,
        "stable",
      );
      if (!marketResult.ok) {
        result = stageError(
          marketResult.status,
          marketResult.message,
        );
      } else {
        market = marketResult.value;
      }
    }
    if (!result) {
      const listed = run(
        bin,
        [
          "plugin",
          "list",
          "--marketplace",
          marketplace,
          "--available",
          "--json",
        ],
        isolatedEnv,
      );
      if (!listed.ok) {
        result = stageError(
          "isolated_stage_failed",
          "could not list the isolated stable plugin candidate",
          { detail: listed },
        );
      } else {
        const candidate = candidateFromList(
          listed.data,
          marketplace,
          market,
        );
        if (!candidate.ok) {
          result = stageError(
            "update_metadata_untrusted",
            candidate.message,
          );
        } else {
          result = { ok: true, candidate: candidate.value };
        }
      }
    }
  } catch (error) {
    result = stageError(
      "isolated_stage_failed",
      `isolated candidate staging failed: ${error.message}`,
    );
  }

  if (codexHome) {
    const cleanup = cleanupTemporaryHome(codexHome, canonicalParent);
    if (!cleanup.ok) {
      return stageError(
        "isolated_cleanup_failed",
        cleanup.message,
        { stagedStatus: result?.status || "candidate_staged" },
      );
    }
  }
  return result;
}

function observeUserState(codexHome, marketplace) {
  const market = readMarketplace(codexHome, marketplace, "pinned");
  const cache = readActiveCache(codexHome, marketplace);
  if (!market.ok || !cache.ok) {
    return {
      ok: false,
      marketplace: market.ok
        ? market.value
        : { error: market.status, message: market.message },
      cache: cache.ok
        ? publicCacheIdentity(cache.value)
        : { error: cache.status, message: cache.message },
    };
  }
  return { ok: true, marketplace: market.value, cache: cache.value };
}

function sameOptionalIdentity(left, right) {
  if (left.provenancePresent !== right.provenancePresent) return false;
  if (!left.provenancePresent) return true;
  return (
    left.contentRevision === right.contentRevision
    && left.publisherChecksum === right.publisherChecksum
  );
}

function sameSavedState(observed, saved) {
  return (
    observed.ok
    && observed.marketplace.source === saved.marketplace.source
    && observed.marketplace.refName === saved.marketplace.refName
    && observed.marketplace.snapshotRevision
      === saved.marketplace.snapshotRevision
    && observed.cache.name === saved.cache.name
    && observed.cache.version === saved.cache.version
    && observed.cache.cacheVersion === saved.cache.cacheVersion
    && observed.cache.bundleDigest === saved.cache.bundleDigest
    && sameOptionalIdentity(observed.cache, saved.cache)
  );
}

function sameCandidateState(observed, candidate) {
  return (
    observed.ok
    && observed.marketplace.source
      === canonicalGitHubSource(EXPECTED_MARKETPLACE_SOURCE)
    && observed.marketplace.refName === candidate.snapshotRevision
    && observed.marketplace.snapshotRevision
      === candidate.snapshotRevision
    && observed.cache.name === candidate.name
    && observed.cache.version === candidate.version
    && observed.cache.cacheVersion === candidate.version
    && observed.cache.provenancePresent
    && observed.cache.contentRevision === candidate.contentRevision
    && observed.cache.publisherChecksum === candidate.publisherChecksum
    && observed.cache.bundleDigest === candidate.bundleDigest
  );
}

function commandFailure(step, result, validation) {
  if (!result.ok) {
    return {
      step,
      message: `Codex ${step} command failed`,
      detail: result,
    };
  }
  if (!validation.ok) {
    return {
      step,
      message: validation.message,
      detail: result,
    };
  }
  return null;
}

function looksLikeCacheLock(failure) {
  const text = JSON.stringify(failure).toLowerCase();
  return (
    text.includes("os error 5")
    || text.includes("access is denied")
    || text.includes("access denied")
    || text.includes("拒绝访问")
    || text.includes("eacces")
    || text.includes("eperm")
    || text.includes("failed to back up plugin cache")
  );
}

function rollbackToSavedState(
  bin,
  env,
  marketplace,
  saved,
  postFailureState,
  primaryFailure,
) {
  const expectedRoot = marketplaceRoot(env.CODEX_HOME, marketplace);
  const attempts = [];
  const remove = run(
    bin,
    ["plugin", "marketplace", "remove", marketplace, "--json"],
    env,
  );
  attempts.push({ step: "remove", detail: remove });
  const add = run(
    bin,
    [
      "plugin",
      "marketplace",
      "add",
      EXPECTED_MARKETPLACE_ADD_SOURCE,
      "--ref",
      saved.marketplace.snapshotRevision,
      "--json",
    ],
    env,
  );
  attempts.push({ step: "add_old_snapshot", detail: add });
  const upgrade = run(
    bin,
    [
      "plugin",
      "marketplace",
      "upgrade",
      marketplace,
      "--json",
    ],
    env,
  );
  attempts.push({ step: "upgrade_old_snapshot", detail: upgrade });

  const recovered = observeUserState(env.CODEX_HOME, marketplace);
  const rolledBack = sameSavedState(recovered, saved);
  const status = rolledBack
    ? (
        looksLikeCacheLock(primaryFailure)
          ? "activation_cache_locked_rolled_back"
          : "activation_failed_rolled_back"
      )
    : "activation_failed_rollback_incomplete";
  stop(
    status,
    rolledBack
      ? "activation failed; the exact previous pinned snapshot and cache identity were restored"
      : "activation failed and the exact previous marketplace/cache identity could not be restored",
    {
      marketplace,
      activationState: rolledBack ? "rolled_back" : "incomplete",
      legacyInstalledIdentity: saved.cache.legacyInstalledIdentity,
      primaryFailure,
      postFailureState,
      rollbackAttempts: attempts,
      recoveredState: recovered.ok
        ? {
            marketplaceSnapshotRevision:
              recovered.marketplace.snapshotRevision,
            installed: publicCacheIdentity(recovered.cache),
          }
        : recovered,
      userMutationPerformed: true,
      expectedRoot,
    },
  );
}

function activatePinnedCandidate(
  bin,
  codexHome,
  marketplace,
  saved,
  candidate,
) {
  const env = { ...process.env, CODEX_HOME: codexHome };
  const root = marketplaceRoot(codexHome, marketplace);
  let failure;

  const beforeMutation = observeUserState(codexHome, marketplace);
  if (!sameSavedState(beforeMutation, saved)) {
    stop(
      "activation_state_changed",
      "the installed marketplace or plugin cache changed while the candidate was being staged; activation was not started",
      {
        marketplace,
        savedState: {
          marketplaceSnapshotRevision:
            saved.marketplace.snapshotRevision,
          installed: publicCacheIdentity(saved.cache),
        },
        observedState: beforeMutation.ok
          ? {
              marketplaceSnapshotRevision:
                beforeMutation.marketplace.snapshotRevision,
              installed: publicCacheIdentity(beforeMutation.cache),
            }
          : beforeMutation,
        userMutationPerformed: false,
      },
    );
  }

  const removed = run(
    bin,
    ["plugin", "marketplace", "remove", marketplace, "--json"],
    env,
  );
  failure = commandFailure(
    "marketplace_remove",
    removed,
    removed.ok
      ? validateRemoveOutput(removed.data, marketplace, root)
      : { ok: false },
  );

  if (!failure) {
    const added = run(
      bin,
      [
        "plugin",
        "marketplace",
        "add",
        EXPECTED_MARKETPLACE_ADD_SOURCE,
        "--ref",
        candidate.snapshotRevision,
        "--json",
      ],
      env,
    );
    failure = commandFailure(
      "marketplace_add_pinned_snapshot",
      added,
      added.ok
        ? validateAddOutput(added.data, marketplace, root, false)
        : { ok: false },
    );
  }

  if (!failure) {
    const upgraded = run(
      bin,
      [
        "plugin",
        "marketplace",
        "upgrade",
        marketplace,
        "--json",
      ],
      env,
    );
    failure = commandFailure(
      "marketplace_upgrade_pinned_snapshot",
      upgraded,
      upgraded.ok
        ? validateUpgradeOutput(upgraded.data, marketplace, root)
        : { ok: false },
    );
  }

  const observed = observeUserState(codexHome, marketplace);
  if (!failure && !sameCandidateState(observed, candidate)) {
    failure = {
      step: "activation_verification",
      message:
        "pinned marketplace metadata and active cache did not match the exact staged candidate",
      observed: observed.ok
        ? {
            marketplaceSnapshotRevision:
              observed.marketplace.snapshotRevision,
            marketplaceRef: observed.marketplace.refName,
            installed: publicCacheIdentity(observed.cache),
          }
        : observed,
    };
  }
  if (failure) {
    if (sameSavedState(observed, saved)) {
      stop(
        "activation_failed_no_change",
        "activation failed before the installed marketplace or plugin cache changed; rollback was not needed",
        {
          marketplace,
          activationState: "unchanged",
          primaryFailure: failure,
          rollbackAttempts: [],
          cacheLockDetected: looksLikeCacheLock(failure),
          userMutationPerformed: false,
        },
      );
    }
    rollbackToSavedState(
      bin,
      env,
      marketplace,
      saved,
      observed,
      failure,
    );
  }

  out({
    schemaVersion: 2,
    ok: true,
    status: "activated",
    marketplace,
    installed: {
      ...publicCacheIdentity(observed.cache),
      snapshotRevision: observed.marketplace.snapshotRevision,
    },
    candidate,
    activationMethod: "marketplace_remove_add_pinned_upgrade",
    permanentMarketplacePin: candidate.snapshotRevision,
    previousLegacyInstalledIdentity:
      saved.cache.legacyInstalledIdentity,
    pluginAddInvoked: false,
    restartRequired: true,
    userMutationPerformed: true,
  });
}

function main() {
  const input = parseArgs();
  const bin = process.env.CODEX_BIN || "codex";
  const execution = installedExecutionContext();
  if (
    execution
    && (
      input.marketplace !== execution.marketplace
      || (
        process.env.CODEX_HOME
        && !samePath(process.env.CODEX_HOME, execution.codexHome)
      )
    )
  ) {
    stop(
      "installed_context_mismatch",
      "the checker marketplace or CODEX_HOME does not match the cache directory from which this script is running",
      {
        marketplace: input.marketplace,
        installedMarketplace: execution.marketplace,
        userCodexCliCalls: 0,
        userMutationPerformed: false,
      },
    );
  }
  const codexHome = execution
    ? execution.codexHome
    : path.resolve(
        process.env.CODEX_HOME || path.join(os.homedir(), ".codex"),
      );

  const market = readMarketplace(
    codexHome,
    input.marketplace,
    "pinned",
  );
  if (!market.ok) {
    stop(market.status, market.message, {
      marketplace: input.marketplace,
      userCodexCliCalls: 0,
      userMutationPerformed: false,
    });
  }
  const cache = readActiveCache(codexHome, input.marketplace);
  if (!cache.ok) {
    stop(cache.status, cache.message, {
      marketplace: input.marketplace,
      marketplaceSnapshotRevision: market.value.snapshotRevision,
      userCodexCliCalls: 0,
      userMutationPerformed: false,
    });
  }
  const installedIdentity = cache.value.legacyInstalledIdentity
    ? verifyLegacyInstalledIdentity(market.value, cache.value)
    : verifyProvenancedInstalledIdentity(market.value, cache.value);
  if (!installedIdentity.ok) {
      stop(
        "installed_identity_untrusted",
        installedIdentity.message,
        {
          marketplace: input.marketplace,
          marketplaceSnapshotRevision:
            market.value.snapshotRevision,
          detail: installedIdentity.detail,
          userCodexCliCalls: 0,
          userMutationPerformed: false,
        },
      );
  }
  if (execution && !samePath(cache.value.bundlePath, execution.pluginRoot)) {
    stop(
      "installed_context_mismatch",
      "the checker is not running from the active plugin cache selected for this marketplace",
      {
        marketplace: input.marketplace,
        userCodexCliCalls: 0,
        userMutationPerformed: false,
      },
    );
  }
  const installed = {
    ...publicCacheIdentity(cache.value),
    snapshotRevision: market.value.snapshotRevision,
  };

  if (input.mode === "inspect") {
    out({
      schemaVersion: 2,
      ok: true,
      status: "inspected_no_refresh",
      marketplace: input.marketplace,
      installed,
      legacyInstalledIdentity:
        cache.value.legacyInstalledIdentity,
      marketplaceRef: market.value.refName,
      isolatedCandidateCheck: false,
      userCodexCliCalls: 0,
      userMutationPerformed: false,
    });
  }

  const staged = stageCandidate(bin, input.marketplace);
  if (!staged.ok) {
    stop(staged.status, staged.message, staged.extra);
  }
  const candidate = staged.candidate;
  const comparison = compareSemver(
    candidate.version,
    cache.value.version,
  );
  if (comparison === null) {
    stop(
      "installed_identity_untrusted",
      "installed or candidate version is not strict semver",
      {
        installed,
        candidate,
        userMutationPerformed: false,
      },
    );
  }
  if (comparison < 0) {
    stop(
      "candidate_older_than_installed",
      "the official stable candidate is older than the installed plugin",
      {
        installed,
        candidate,
        userMutationPerformed: false,
      },
    );
  }
  if (comparison === 0) {
    const observed = {
      ok: true,
      marketplace: market.value,
      cache: cache.value,
    };
    if (!sameCandidateState(observed, candidate)) {
      stop(
        "installed_identity_untrusted",
        "installed plugin version matches the channel but its pinned snapshot/content identity does not",
        {
          installed,
          candidate,
          legacyInstalledIdentity:
            cache.value.legacyInstalledIdentity,
          userMutationPerformed: false,
        },
      );
    }
    out({
      schemaVersion: 2,
      ok: true,
      status: "current",
      marketplace: input.marketplace,
      installed,
      candidate,
      isolatedCandidateCheck: true,
      userCodexCliCalls: 0,
      userMutationPerformed: false,
    });
  }

  if (input.mode === "check") {
    out({
      schemaVersion: 2,
      ok: true,
      status: "update_available_confirmation_required",
      marketplace: input.marketplace,
      installed,
      candidate,
      legacyInstalledIdentity:
        cache.value.legacyInstalledIdentity,
      legacyIdentityProtection:
        cache.value.legacyInstalledIdentity
          ? "pinned marketplace revision + cache version + manifest + inventory digest"
          : undefined,
      isolatedCandidateCheck: true,
      userCodexCliCalls: 0,
      userMutationPerformed: false,
      activation: "not_started",
    });
  }

  if (!input.confirmed) {
    stop(
      "confirmation_required",
      "activation requires explicit confirmation bound to the exact staged candidate",
      {
        marketplace: input.marketplace,
        installed,
        candidate,
        userMutationPerformed: false,
      },
    );
  }
  const received = {
    version: input.expectedVersion,
    snapshotRevision: input.expectedSnapshotRevision,
    contentRevision: input.expectedContentRevision,
    publisherChecksum: input.expectedChecksum,
  };
  const expected = {
    version: candidate.version,
    snapshotRevision: candidate.snapshotRevision,
    contentRevision: candidate.contentRevision,
    publisherChecksum: candidate.publisherChecksum,
  };
  if (
    received.version !== expected.version
    || received.snapshotRevision !== expected.snapshotRevision
    || received.contentRevision !== expected.contentRevision
    || received.publisherChecksum !== expected.publisherChecksum
  ) {
    stop(
      "confirmation_mismatch",
      "activation arguments do not match the newly restaged candidate",
      {
        marketplace: input.marketplace,
        expected,
        received,
        userMutationPerformed: false,
      },
    );
  }

  activatePinnedCandidate(
    bin,
    codexHome,
    input.marketplace,
    { marketplace: market.value, cache: cache.value },
    candidate,
  );
}

main();
