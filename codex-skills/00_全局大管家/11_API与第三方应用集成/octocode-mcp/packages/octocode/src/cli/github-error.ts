import {
  isAuthErrorText,
  isNotFoundErrorText,
  isRateLimitErrorText,
} from './exit-codes.js';

export interface GithubFailureOptions {
  /** Human-readable `owner/repo[/path]` the call targeted. */
  target: string;
  /** Label for the generic fallback, e.g. "GitHub search error". */
  genericLabel?: string;
}

/**
 * Turn a raw GitHub tool error into a precise, non-misleading CLI message.
 *
 * Only genuine credential failures (401/403/unauthorized/forbidden/bad
 * credentials) get the "set a token" hint. An ambiguous "repo may not exist,
 * require authentication, or be inaccessible" — which is what a nonexistent or
 * private repo returns even when the user IS authenticated — is reported as
 * not-found, so we never tell an authenticated user to set a token they already
 * have. Detection is shared with classifyToolErrorText so the message and the
 * exit code agree.
 */
export function formatGithubFailure(
  errText: string,
  opts: GithubFailureOptions
): string {
  const { target, genericLabel = 'GitHub API error' } = opts;

  if (isRateLimitErrorText(errText)) {
    return `GitHub rate limit hit for ${target}: ${errText}`;
  }
  if (isAuthErrorText(errText)) {
    return `GitHub auth error: ${errText}. Set GITHUB_TOKEN, OCTOCODE_TOKEN, or GH_TOKEN.`;
  }
  if (isNotFoundErrorText(errText)) {
    return `Not found on GitHub: ${target} — check the owner/repo, branch, and path (it may be private, renamed, or nonexistent).`;
  }
  return `${genericLabel}: ${errText}`;
}
