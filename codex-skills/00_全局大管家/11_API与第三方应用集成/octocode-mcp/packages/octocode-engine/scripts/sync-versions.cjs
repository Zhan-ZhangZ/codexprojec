'use strict'

/**
 * Sync every version reference in the engine package to ONE source of truth:
 * the `version` field in this package's package.json.
 *
 * Updates (in place):
 *   - Cargo.toml             [package] version
 *   - Cargo.lock             [[package]] octocode-engine version
 *   - package.json           optionalDependencies @octocodeai/octocode-engine-* → version
 *   - npm/<platform>/package.json   version
 *
 * After writing, it re-validates with check-version-consistency.cjs so a passing
 * run guarantees npm publish will see a fully consistent tree.
 *
 * Idempotent: re-running with everything already in sync changes nothing and
 * still exits 0. Run from anywhere (`node scripts/sync-versions.cjs`).
 */

const { readFileSync, writeFileSync, readdirSync, existsSync } = require('fs')
const { join } = require('path')
const { execFileSync } = require('child_process')

const root = join(__dirname, '..')

function fail(message) {
  console.error(`version:sync failed: ${message}`)
  process.exit(1)
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

const changes = []

// ── source of truth ──────────────────────────────────────────────────────────
const rootPackagePath = join(root, 'package.json')
const rootPackage = readJson(rootPackagePath)
const version = rootPackage.version
if (!version) {
  fail('package.json has no version field')
}

// ── Cargo.toml [package] version ─────────────────────────────────────────────
const cargoTomlPath = join(root, 'Cargo.toml')
const cargoToml = readFileSync(cargoTomlPath, 'utf8')
const cargoMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)
if (!cargoMatch) {
  fail('Cargo.toml package version not found')
}
if (cargoMatch[1] !== version) {
  // Replace only the first top-level `version = "..."` (the [package] one).
  const nextCargoToml = cargoToml.replace(
    /^version\s*=\s*"[^"]+"/m,
    `version = "${version}"`
  )
  writeFileSync(cargoTomlPath, nextCargoToml, 'utf8')
  changes.push(`Cargo.toml: ${cargoMatch[1]} → ${version}`)
}

// ── Cargo.lock [[package]] octocode-engine version ───────────────────────────
const cargoLockPath = join(root, 'Cargo.lock')
if (existsSync(cargoLockPath)) {
  const cargoLock = readFileSync(cargoLockPath, 'utf8')
  const lockRe = /(name = "octocode-engine"\nversion = ")([^"]+)(")/
  const lockMatch = cargoLock.match(lockRe)
  if (!lockMatch) {
    fail('Cargo.lock octocode-engine package entry not found')
  }
  if (lockMatch[2] !== version) {
    writeFileSync(cargoLockPath, cargoLock.replace(lockRe, `$1${version}$3`), 'utf8')
    changes.push(`Cargo.lock: ${lockMatch[2]} → ${version}`)
  }
}

// ── root optionalDependencies (platform binaries) ────────────────────────────
let optionalChanged = false
const optionalDependencies = rootPackage.optionalDependencies ?? {}
for (const [name, current] of Object.entries(optionalDependencies)) {
  if (current !== version) {
    optionalDependencies[name] = version
    optionalChanged = true
    changes.push(`optionalDependencies[${name}]: ${current} → ${version}`)
  }
}
if (optionalChanged) {
  writeJson(rootPackagePath, rootPackage)
}

// ── npm/<platform>/package.json versions ─────────────────────────────────────
const npmDir = join(root, 'npm')
if (existsSync(npmDir)) {
  for (const dirName of readdirSync(npmDir)) {
    const packagePath = join(npmDir, dirName, 'package.json')
    if (!existsSync(packagePath)) continue

    const platformPackage = readJson(packagePath)
    if (platformPackage.version !== version) {
      changes.push(`npm/${dirName}/package.json: ${platformPackage.version} → ${version}`)
      platformPackage.version = version
      writeJson(packagePath, platformPackage)
    }
  }
}

// ── report ───────────────────────────────────────────────────────────────────
if (changes.length === 0) {
  console.log(`version:sync ok: everything already at ${version}`)
} else {
  console.log(`version:sync updated ${changes.length} reference(s) to ${version}:`)
  for (const change of changes) {
    console.log(`  • ${change}`)
  }
}

// ── verify ───────────────────────────────────────────────────────────────────
execFileSync('node', [join(__dirname, 'check-version-consistency.cjs')], {
  stdio: 'inherit',
})
