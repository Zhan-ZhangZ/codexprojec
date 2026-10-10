import { describe, it, expect } from 'vitest';
import { EXIT, classifyToolErrorText } from '../../src/cli/exit-codes.js';

describe('exit codes', () => {
  it('defines the typed contract', () => {
    expect(EXIT.OK).toBe(0);
    expect(EXIT.GENERAL).toBe(1);
    expect(EXIT.USAGE).toBe(2);
    expect(EXIT.NOT_FOUND).toBe(3);
    expect(EXIT.AUTH).toBe(4);
    expect(EXIT.TOOL).toBe(5);
    expect(EXIT.RATE_LIMIT).toBe(7);
  });

  describe('classifyToolErrorText', () => {
    it('detects rate limiting', () => {
      expect(classifyToolErrorText('API rate limit exceeded')).toBe(
        EXIT.RATE_LIMIT
      );
      expect(classifyToolErrorText('HTTP 429 Too Many Requests')).toBe(
        EXIT.RATE_LIMIT
      );
    });

    it('detects auth failures', () => {
      expect(classifyToolErrorText('HTTP 401 Unauthorized')).toBe(EXIT.AUTH);
      expect(classifyToolErrorText('403 Forbidden')).toBe(EXIT.AUTH);
      expect(classifyToolErrorText('Bad credentials')).toBe(EXIT.AUTH);
    });

    it('detects not-found failures', () => {
      expect(
        classifyToolErrorText(
          'Repository, resource, or path not found (HTTP 404)'
        )
      ).toBe(EXIT.NOT_FOUND);
      expect(
        classifyToolErrorText(
          'Could not determine default branch for a/b. The repository may not exist, require authentication, or be inaccessible.'
        )
      ).toBe(EXIT.NOT_FOUND);
    });

    // The bare word "authentication" in an ambiguous not-found message must not
    // be misclassified as an auth failure.
    it('does not treat ambiguous "authentication" wording as an auth failure', () => {
      expect(
        classifyToolErrorText(
          'The repository may not exist, require authentication, or be inaccessible.'
        )
      ).not.toBe(EXIT.AUTH);
    });

    it('defaults to TOOL for other errors', () => {
      expect(classifyToolErrorText('something broke')).toBe(EXIT.TOOL);
      expect(classifyToolErrorText('')).toBe(EXIT.TOOL);
    });
  });
});
