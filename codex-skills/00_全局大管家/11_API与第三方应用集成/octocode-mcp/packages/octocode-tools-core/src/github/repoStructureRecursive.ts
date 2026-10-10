import { RequestError } from 'octokit';
import type { GitHubApiFileItem } from '../tools/github_view_repo_structure/types.js';
import {
  attachRawResponseChars,
  countSerializedChars,
  getRawResponseChars,
} from '../utils/response/charSavings.js';
import { OctokitWithThrottling } from './client.js';

const RECURSIVE_FETCH_FAILURES = Symbol.for('octocode.recursiveFetchFailures');

/**
 * HTTP statuses that must propagate rather than be swallowed into a
 * partial/empty tree: a rate-limited or auth-denied subtree is NOT the same
 * as an empty directory, and presenting it as such hides the real failure.
 */
const PROPAGATE_STATUSES = new Set([401, 403, 429]);

function shouldPropagate(error: unknown): boolean {
  return error instanceof RequestError && PROPAGATE_STATUSES.has(error.status);
}

function attachFailureCount<T extends object>(result: T, failures: number): T {
  try {
    Object.defineProperty(result, RECURSIVE_FETCH_FAILURES, {
      value: failures,
      enumerable: false,
      configurable: true,
    });
  } catch {
    void 0;
  }
  return result;
}

/**
 * Number of subtrees that failed to fetch (non-propagating errors) while
 * building this recursive listing. Lets callers surface a "partial tree"
 * warning instead of presenting a partial tree as complete.
 */
export function getRecursiveFetchFailureCount(value: unknown): number {
  if (typeof value !== 'object' || value === null) return 0;
  const raw = (value as Record<typeof RECURSIVE_FETCH_FAILURES, unknown>)[
    RECURSIVE_FETCH_FAILURES
  ];
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0;
}

export async function fetchDirectoryContentsRecursivelyAPI(
  octokit: InstanceType<typeof OctokitWithThrottling>,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  currentDepth: number,
  maxDepth: number,
  visitedPaths: Set<string> = new Set()
): Promise<GitHubApiFileItem[]> {
  if (currentDepth > maxDepth || visitedPaths.has(path)) {
    return attachFailureCount(attachRawResponseChars([], 0), 0);
  }

  visitedPaths.add(path);

  let result;
  try {
    result = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: path || '',
      ref: branch,
    });
  } catch (error) {
    // Rate-limit / auth failures must propagate; other failures degrade to an
    // empty listing but are counted so callers can warn about a partial tree.
    if (shouldPropagate(error)) {
      throw error;
    }
    return attachFailureCount(attachRawResponseChars([], 0), 1);
  }

  let rawResponseChars = countSerializedChars(result.data);
  const items = Array.isArray(result.data) ? result.data : [result.data];

  // Narrow on the discriminant: only 'file' and 'dir' entries are real tree
  // nodes. Submodule/symlink entries must be dropped, not mislabeled as files.
  const apiItems: GitHubApiFileItem[] = items
    .filter(item => item.type === 'file' || item.type === 'dir')
    .map(
      item =>
        ({
          name: item.name,
          path: item.path,
          type: item.type,
          size: 'size' in item ? item.size : undefined,
          download_url: 'download_url' in item ? item.download_url : undefined,
          url: item.url,
          html_url: item.html_url,
          git_url: item.git_url,
          sha: item.sha,
          // Projected view of the API entry; the omitted fields (_links, etc.)
          // are not part of the structure listing.
        }) as GitHubApiFileItem
    );

  const allItems: GitHubApiFileItem[] = [...apiItems];
  let failures = 0;

  if (currentDepth < maxDepth) {
    const directories = apiItems.filter(item => item.type === 'dir');

    const concurrencyLimit = 3;
    for (let i = 0; i < directories.length; i += concurrencyLimit) {
      const batch = directories.slice(i, i + concurrencyLimit);

      const settled = await Promise.allSettled(
        batch.map(dir =>
          fetchDirectoryContentsRecursivelyAPI(
            octokit,
            owner,
            repo,
            branch,
            dir.path,
            currentDepth + 1,
            maxDepth,
            visitedPaths
          )
        )
      );

      for (const outcome of settled) {
        if (outcome.status === 'fulfilled') {
          const subItems = outcome.value;
          rawResponseChars += getRawResponseChars(subItems) ?? 0;
          failures += getRecursiveFetchFailureCount(subItems);
          allItems.push(...subItems);
        } else {
          // Rate-limit / auth failures are real and must propagate so the
          // caller does not present a truncated tree as complete.
          if (shouldPropagate(outcome.reason)) {
            throw outcome.reason;
          }
          failures += 1;
        }
      }
    }
  }

  return attachFailureCount(
    attachRawResponseChars(allItems, rawResponseChars),
    failures
  );
}
