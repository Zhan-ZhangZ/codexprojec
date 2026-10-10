import { describe, it, expect } from 'vitest';
import { formatGithubFailure } from '../../src/cli/github-error.js';

describe('formatGithubFailure', () => {
  const target = 'octocat/hello';

  it('flags genuine auth failures and suggests a token', () => {
    expect(formatGithubFailure('HTTP 401 Unauthorized', { target })).toMatch(
      /auth error/i
    );
    expect(formatGithubFailure('403 Forbidden', { target })).toMatch(
      /GITHUB_TOKEN/
    );
    expect(formatGithubFailure('Bad credentials', { target })).toMatch(
      /GITHUB_TOKEN/
    );
  });

  // Regression: a nonexistent repo while authenticated comes back as an
  // ambiguous "may not exist, require authentication, or be inaccessible".
  // The word "authentication" must NOT trip the auth branch — an already
  // authenticated user should never be told to set a token.
  it('treats the ambiguous "may not exist / authentication" message as not-found', () => {
    const ambiguous =
      'Failed to explore repository structure: Could not determine default branch for octocat/nope. The repository may not exist, require authentication, or be inaccessible.';
    const msg = formatGithubFailure(ambiguous, { target });
    expect(msg).not.toMatch(/GITHUB_TOKEN/);
    expect(msg).not.toMatch(/auth error/i);
    expect(msg).toMatch(/not found/i);
    expect(msg).toContain(target);
  });

  it('formats plain 404 / not found as not-found with the target', () => {
    expect(
      formatGithubFailure(
        'Repository, resource, or path not found (HTTP 404)',
        {
          target,
        }
      )
    ).toMatch(/not found on github/i);
  });

  it('surfaces rate limiting distinctly', () => {
    expect(formatGithubFailure('API rate limit exceeded', { target })).toMatch(
      /rate limit/i
    );
  });

  it('falls back to the generic label for unrecognized errors', () => {
    expect(
      formatGithubFailure('something exploded', {
        target,
        genericLabel: 'GitHub search error',
      })
    ).toBe('GitHub search error: something exploded');
  });
});
