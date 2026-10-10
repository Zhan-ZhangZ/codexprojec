import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../../src/utils/colors.js', () => ({
  c: (_color: string, s: string) => s,
  bold: (s: string) => s,
  dim: (s: string) => s,
}));

import { markDirectToolFailure } from '../../../src/cli/commands/direct-tool-output.js';
import { EXIT } from '../../../src/cli/exit-codes.js';

function errorResult(text: string) {
  return {
    isError: true,
    content: [{ type: 'text', text }],
  };
}

describe('markDirectToolFailure', () => {
  beforeEach(() => {
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  it('leaves exit code unset on success', () => {
    markDirectToolFailure({ isError: false, content: [] });
    expect(process.exitCode).toBeUndefined();
  });

  it('classifies an auth-ish error as EXIT.AUTH', () => {
    markDirectToolFailure(
      errorResult('HTTP 401 Unauthorized: Bad credentials')
    );
    expect(process.exitCode).toBe(EXIT.AUTH);
  });

  it('classifies a rate-limit error as EXIT.RATE_LIMIT', () => {
    markDirectToolFailure(errorResult('API rate limit exceeded (429)'));
    expect(process.exitCode).toBe(EXIT.RATE_LIMIT);
  });

  it('falls back to EXIT.TOOL for a generic error', () => {
    markDirectToolFailure(errorResult('something unexpected broke'));
    expect(process.exitCode).toBe(EXIT.TOOL);
  });
});
