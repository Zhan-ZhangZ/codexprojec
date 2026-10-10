import { describe, expect, it, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

import { getLanguageServerForFile } from '../../src/lsp/config.js';

/**
 * Track-T (tsgo) backend resolution.
 *
 * The deterministic test below needs no real `tsgo` binary: it points
 * `OCTOCODE_TS_SERVER_PATH` at a dummy file whose basename is `tsgo` and asserts
 * the resolver selects it with `--lsp -stdio` (tsgo's stdio invocation), proving
 * the arg-selection branch. A second, environment-guarded test runs the real
 * backend only when `tsgo` is actually installed — so CI covers the live path
 * wherever tsgo exists, and skips cleanly where it does not.
 */
const TS_ENV = 'OCTOCODE_TS_SERVER_PATH';

function tsgoOnPath(): boolean {
  try {
    execFileSync('tsgo', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe('tsgo backend resolution (Track T)', () => {
  const prevEnv = process.env[TS_ENV];
  afterEach(() => {
    if (prevEnv === undefined) delete process.env[TS_ENV];
    else process.env[TS_ENV] = prevEnv;
  });

  it('selects tsgo with `--lsp -stdio` when the override basename is tsgo', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'octocode-tsgo-'));
    const fake = join(dir, 'tsgo');
    writeFileSync(fake, '#!/bin/sh\nexit 0\n');
    chmodSync(fake, 0o755);
    process.env[TS_ENV] = fake;

    const config = (await getLanguageServerForFile('demo.ts', dir)) as {
      command: string;
      args?: string[];
      languageId?: string;
    };
    expect(config.command).toBe(fake);
    expect(config.args).toEqual(['--lsp', '-stdio']);
    expect(config.languageId).toBe('typescript');
  });

  it('keeps `--stdio` for a non-tsgo override (typescript-language-server)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'octocode-tsls-'));
    const fake = join(dir, 'typescript-language-server');
    writeFileSync(fake, '#!/bin/sh\nexit 0\n');
    chmodSync(fake, 0o755);
    process.env[TS_ENV] = fake;

    const config = (await getLanguageServerForFile('demo.ts', dir)) as {
      args?: string[];
    };
    expect(config.args).toEqual(['--stdio']);
  });

  // Live integration: only runs where a real `tsgo` is installed.
  const liveIt = tsgoOnPath() ? it : it.skip;
  liveIt(
    'resolves a real tsgo on PATH to `tsgo --lsp -stdio`',
    async () => {
      delete process.env[TS_ENV]; // force PATH discovery (step 2 of the ladder)
      const config = (await getLanguageServerForFile(
        'demo.ts',
        process.cwd()
      )) as { command: string; args?: string[] };
      expect(config.command.toLowerCase()).toContain('tsgo');
      expect(config.args).toEqual(['--lsp', '-stdio']);
    }
  );
});
