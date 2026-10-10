#!/usr/bin/env node
/**
 * bundle-engine.mjs — copies the @octocodeai/octocode-engine native .node binary
 * for a given platform into the output directory, alongside a compiled Bun binary.
 */

import { chmodSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PLATFORM_MAP = {
  'darwin-arm64': 'darwin-arm64',
  'darwin-x64': 'darwin-x64',
  'linux-arm64': 'linux-arm64-gnu',
  'linux-x64': 'linux-x64-gnu',
  'linux-x64-musl': 'linux-x64-musl',
  'windows-x64': 'win32-x64-msvc',
};

const [platform, outDir] = process.argv.slice(2);

if (!platform || !outDir) {
  console.error('Usage: node scripts/bundle-engine.mjs <platform> <outDir>');
  console.error('  Platforms:', Object.keys(PLATFORM_MAP).join(', '));
  process.exit(1);
}

const triple = PLATFORM_MAP[platform];
if (!triple) {
  console.error(`Unknown platform: ${platform}`);
  console.error('  Valid platforms:', Object.keys(PLATFORM_MAP).join(', '));
  process.exit(1);
}

const enginePkg = join(__dirname, '..', '..', 'octocode-engine');
const binaryName = `octocode-engine.${triple}.node`;
const src = join(enginePkg, 'npm', triple, binaryName);
const dest = join(outDir, binaryName);
const runtimeDir = join(outDir, 'runtime', 'engine');
const runtimeDest = join(runtimeDir, binaryName);

if (!existsSync(src)) {
  console.warn(`⚠  octocode-engine binary not found: ${src}`);
  console.warn('   Run: cd packages/octocode-engine && yarn build:all');
  process.exit(1);
}

copyFileSync(src, dest);
chmodSync(dest, 0o755);
mkdirSync(runtimeDir, { recursive: true });
copyFileSync(src, runtimeDest);
chmodSync(runtimeDest, 0o755);
console.log(`✓ copied ${binaryName} → ${dest}`);
