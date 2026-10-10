#!/usr/bin/env node
/**
 * dedupe-deps.mjs — workspace dependency-version deduper.
 *
 * Replaces `syncpack`: ensures every external dependency is declared at ONE
 * consistent version range across all workspace packages. A package that pins
 * `zod@^4.3.6` while another pins `zod@^4.4.3` is a mismatch — it lets two
 * copies resolve and drifts the API surface.
 *
 *   node scripts/dedupe-deps.mjs          # report mismatches (exit 1 if any)
 *   node scripts/dedupe-deps.mjs --fix    # rewrite all to the highest version
 *
 * Local protocols (workspace:/file:/link:/portal:/npm: alias) are left as-is,
 * and only the top-level packages/<pkg>/package.json + root are scanned (the
 * exact-pinned native platform sub-packages under the per-package npm folders
 * are intentionally excluded).
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIX = process.argv.includes('--fix');
const DEP_KINDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];
const SKIP_PROTOCOL = /^(workspace:|file:|link:|portal:|npm:)/;

function packageJsonPaths() {
  const files = [join(ROOT, 'package.json')];
  const pkgDir = join(ROOT, 'packages');
  for (const entry of readdirSync(pkgDir)) {
    const p = join(pkgDir, entry, 'package.json');
    if (existsSync(p)) files.push(p);
  }
  return files;
}

/** Parse a semver range into a comparable [major, minor, patch] tuple. */
function parseVersion(range) {
  const m = String(range)
    .replace(/^[\^~>=<\s]+/, '')
    .match(/^(\d+)\.(\d+)\.(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : null;
}

/** Return whichever range is the higher version (a wins on ties / unparseable). */
function higher(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pb) return a;
  if (!pa) return b;
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? a : b;
  }
  return a;
}

const pkgs = packageJsonPaths().map((file) => ({
  file,
  json: JSON.parse(readFileSync(file, 'utf8')),
}));

// name -> { range -> ["<pkg>:<kind>", ...] }
const declared = {};
for (const { json } of pkgs) {
  const who = json.name || '(root)';
  for (const kind of DEP_KINDS) {
    for (const [name, range] of Object.entries(json[kind] || {})) {
      if (SKIP_PROTOCOL.test(range)) continue;
      (declared[name] ??= {});
      (declared[name][range] ??= []).push(`${who}:${kind}`);
    }
  }
}

const mismatches = Object.entries(declared).filter(
  ([, ranges]) => Object.keys(ranges).length > 1
);

if (mismatches.length === 0) {
  console.log('✓ deps in sync — no version mismatches across workspace packages');
  process.exit(0);
}

console.log(`Found ${mismatches.length} dependency version mismatch(es):\n`);
const target = {};
for (const [name, ranges] of mismatches.sort((a, b) => a[0].localeCompare(b[0]))) {
  const winner = Object.keys(ranges).reduce(higher);
  target[name] = winner;
  console.log(`  ${name}`);
  for (const [range, where] of Object.entries(ranges)) {
    const note = range === winner ? 'keep' : FIX ? `→ ${winner}` : 'MISMATCH';
    console.log(`    ${range.padEnd(18)} ${note.padEnd(14)} (${where.join(', ')})`);
  }
}

if (!FIX) {
  console.log('\nRun `yarn deps:dedupe:fix` to align all to the highest version, then `yarn install`.');
  process.exit(1);
}

let changed = 0;
for (const { file, json } of pkgs) {
  let dirty = false;
  for (const kind of DEP_KINDS) {
    const block = json[kind];
    if (!block) continue;
    for (const name of Object.keys(block)) {
      if (
        target[name] &&
        !SKIP_PROTOCOL.test(block[name]) &&
        block[name] !== target[name]
      ) {
        block[name] = target[name];
        dirty = true;
      }
    }
  }
  if (dirty) {
    writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
    changed++;
  }
}
console.log(
  `\n✓ Aligned ${mismatches.length} dep(s) across ${changed} package.json file(s). Run \`yarn install\`.`
);
