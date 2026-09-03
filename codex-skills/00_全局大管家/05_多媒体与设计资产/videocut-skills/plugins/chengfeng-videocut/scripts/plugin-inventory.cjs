"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const PROVENANCE_RELATIVE_PATH = ".codex-plugin/update-provenance.json";
const INVENTORY_DIGEST_SCHEMA = "chengfeng-videocut-inventory-v1";

class InventoryError extends Error {
  constructor(message) {
    super(message);
    this.name = "InventoryError";
  }
}

function canonicalRelativePath(relativePath) {
  if (typeof relativePath !== "string" || !relativePath) {
    throw new InventoryError("inventory path must be a non-empty string");
  }
  const canonical = relativePath.split(path.sep).join("/");
  if (
    canonical.startsWith("/")
    || canonical.endsWith("/")
    || canonical.includes("\\")
    || canonical.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new InventoryError(`inventory path is not portable: ${relativePath}`);
  }
  return canonical;
}

function comparePaths(left, right) {
  if (left.relativePath < right.relativePath) return -1;
  if (left.relativePath > right.relativePath) return 1;
  return 0;
}

function digestInventoryEntries(entries) {
  const normalized = [];
  for (const entry of entries) {
    const relativePath = canonicalRelativePath(entry.relativePath);
    if (relativePath === PROVENANCE_RELATIVE_PATH) continue;
    if (!Buffer.isBuffer(entry.content)) {
      throw new InventoryError(`inventory entry is not a byte buffer: ${relativePath}`);
    }
    normalized.push({ relativePath, content: entry.content });
  }
  normalized.sort(comparePaths);
  for (let index = 1; index < normalized.length; index += 1) {
    if (normalized[index - 1].relativePath === normalized[index].relativePath) {
      throw new InventoryError(`duplicate inventory path: ${normalized[index].relativePath}`);
    }
  }

  const hash = crypto.createHash("sha256");
  hash.update(INVENTORY_DIGEST_SCHEMA, "utf8");
  hash.update("\0");
  for (const entry of normalized) {
    const relativePath = Buffer.from(entry.relativePath, "utf8");
    for (const field of [relativePath, entry.content]) {
      const length = Buffer.allocUnsafe(8);
      length.writeBigUInt64BE(BigInt(field.length));
      hash.update(length);
      hash.update(field);
    }
  }
  return hash.digest("hex");
}

function filesystemInventoryEntries(root) {
  const resolvedRoot = path.resolve(root);
  let rootStat;
  try {
    rootStat = fs.lstatSync(resolvedRoot);
  } catch (error) {
    throw new InventoryError(`plugin root is not readable: ${error.message}`);
  }
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new InventoryError("plugin root must be a real directory, not a symbolic link");
  }

  const entries = [];
  function visit(directory) {
    let children;
    try {
      children = fs.readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      throw new InventoryError(`inventory directory is not readable: ${error.message}`);
    }
    children.sort((left, right) => {
      if (left.name < right.name) return -1;
      if (left.name > right.name) return 1;
      return 0;
    });
    for (const child of children) {
      const fullPath = path.join(directory, child.name);
      let stat;
      try {
        stat = fs.lstatSync(fullPath);
      } catch (error) {
        throw new InventoryError(`inventory entry is not readable: ${error.message}`);
      }
      const relativePath = canonicalRelativePath(path.relative(resolvedRoot, fullPath));
      if (stat.isSymbolicLink()) {
        throw new InventoryError(`symbolic links are forbidden in plugin inventory: ${relativePath}`);
      }
      if (stat.isDirectory()) {
        visit(fullPath);
        continue;
      }
      if (!stat.isFile()) {
        throw new InventoryError(`non-file inventory entry is forbidden: ${relativePath}`);
      }
      let content;
      try {
        content = fs.readFileSync(fullPath);
      } catch (error) {
        throw new InventoryError(`inventory file is not readable: ${relativePath}: ${error.message}`);
      }
      entries.push({ relativePath, content });
    }
  }
  visit(resolvedRoot);
  return entries;
}

function inventoryDigest(root) {
  return digestInventoryEntries(filesystemInventoryEntries(root));
}

module.exports = {
  InventoryError,
  INVENTORY_DIGEST_SCHEMA,
  PROVENANCE_RELATIVE_PATH,
  canonicalRelativePath,
  digestInventoryEntries,
  filesystemInventoryEntries,
  inventoryDigest,
};
