#!/usr/bin/env node
'use strict';

/**
 * CommonJS runtime smoke test — regression guard for #864.
 *
 * The shipped artifact is compiled to CommonJS and `require()`s its dependencies. If a
 * dependency is ESM-only (no `require` export condition), `require()` throws
 * ERR_REQUIRE_ESM and the server crashes at startup before any config is read — exactly
 * how `uuid@14` broke v2.59.1–2.59.3.
 *
 * Node >= 20.19 / >= 22.12 enable `require(ESM)` by default, which silently masks the
 * mismatch — so just requiring the artifact on a modern Node would NOT catch it. We force
 * the strict (pre-`require(ESM)`) loader with `--no-experimental-require-module` so the
 * mismatch surfaces regardless of the runner's Node version.
 *
 * That flag does not exist on older Node (added in v22.0.0, backported to v20.19.0;
 * absent in 18.x and 20.0–20.18). On those versions the strict loader is already the
 * default, so the flag is unnecessary — and passing it would error with `bad option`. We
 * probe for flag support rather than hard-coding the version matrix, so the guard is
 * strict on every supported Node (>=18) instead of depending on which Node happens to run
 * it (the meta-mistake that produced #864).
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const FLAG = '--no-experimental-require-module';
const entry = path.resolve(__dirname, '..', 'dist', 'index.js');
const program =
  `require(${JSON.stringify(entry)}); ` +
  `console.log('CJS runtime load OK (node ' + process.versions.node + ')');`;

// Probe: does this Node recognize the strict-loader flag? Run an empty program with it.
const flagSupported =
  spawnSync(process.execPath, [FLAG, '-e', ''], { stdio: 'ignore' }).status === 0;

const args = flagSupported ? [FLAG, '-e', program] : ['-e', program];
const result = spawnSync(process.execPath, args, { stdio: 'inherit' });

if (result.status !== 0) {
  console.error(
    `\nCJS runtime smoke test FAILED (node ${process.versions.node}, strict loader forced: ${flagSupported}).`
  );
  console.error(
    'The compiled dist/ could not be require()d under the CommonJS loader — a shipped ' +
      'dependency is likely ESM-only. See #864.'
  );
  process.exit(result.status === null ? 1 : result.status);
}
