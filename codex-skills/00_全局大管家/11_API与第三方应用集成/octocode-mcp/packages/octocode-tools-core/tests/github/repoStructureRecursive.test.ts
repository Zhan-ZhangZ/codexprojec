import { describe, expect, it, vi } from 'vitest';
import { RequestError } from 'octokit';

import {
  fetchDirectoryContentsRecursivelyAPI,
  getRecursiveFetchFailureCount,
} from '../../src/github/repoStructureRecursive.js';

interface Entry {
  name: string;
  path: string;
  type: string;
  size?: number;
  download_url?: string | null;
  url?: string;
  html_url?: string;
  git_url?: string;
  sha?: string;
}

function dirEntry(name: string, path: string): Entry {
  return {
    name,
    path,
    type: 'dir',
    url: 'u',
    html_url: 'h',
    git_url: 'g',
    sha: 's',
  };
}

function fileEntry(name: string, path: string): Entry {
  return {
    name,
    path,
    type: 'file',
    size: 1,
    download_url: 'd',
    url: 'u',
    html_url: 'h',
    git_url: 'g',
    sha: 's',
  };
}

function makeOctokit(responses: Record<string, Entry[] | Error>) {
  const getContent = vi.fn(async ({ path }: { path: string }) => {
    const key = path || '';
    const value = responses[key];
    if (value === undefined) {
      throw new Error(`no stub for path "${key}"`);
    }
    if (value instanceof Error) {
      throw value;
    }
    return { data: value };
  });
  return { rest: { repos: { getContent } } } as never;
}

describe('fetchDirectoryContentsRecursivelyAPI - finding 2 (entry-type narrowing)', () => {
  it('keeps file and dir entries but drops submodule/symlink entries', async () => {
    const octokit = makeOctokit({
      '': [
        fileEntry('a.txt', 'a.txt'),
        dirEntry('sub', 'sub'),
        { name: 'mod', path: 'mod', type: 'submodule', url: 'u' },
        { name: 'link', path: 'link', type: 'symlink', url: 'u' },
      ],
      sub: [fileEntry('b.txt', 'sub/b.txt')],
    });

    const items = await fetchDirectoryContentsRecursivelyAPI(
      octokit,
      'o',
      'r',
      'main',
      '',
      1,
      2
    );

    const types = new Set(items.map(i => i.type));
    expect(types).toEqual(new Set(['file', 'dir']));
    expect(items.find(i => i.path === 'mod')).toBeUndefined();
    expect(items.find(i => i.path === 'link')).toBeUndefined();
    expect(items.find(i => i.path === 'sub/b.txt')).toBeDefined();
  });
});

describe('fetchDirectoryContentsRecursivelyAPI - finding 1 (partial-tree errors)', () => {
  it('counts failed subtrees instead of silently returning a complete-looking tree', async () => {
    const octokit = makeOctokit({
      '': [dirEntry('ok', 'ok'), dirEntry('bad', 'bad')],
      ok: [fileEntry('f.txt', 'ok/f.txt')],
      bad: new Error('boom 500'),
    });

    const items = await fetchDirectoryContentsRecursivelyAPI(
      octokit,
      'o',
      'r',
      'main',
      '',
      1,
      2
    );

    // ok/f.txt is present, bad/* failed
    expect(items.find(i => i.path === 'ok/f.txt')).toBeDefined();
    // The failure is surfaced as a count, not swallowed to an empty tree.
    expect(getRecursiveFetchFailureCount(items)).toBeGreaterThanOrEqual(1);
  });

  it('propagates a 403 rate-limit/auth error rather than masquerading as empty', async () => {
    const rateLimit = new RequestError('forbidden', 403, {
      request: { method: 'GET', url: 'x', headers: {} },
      response: {
        status: 403,
        url: 'x',
        headers: { 'x-ratelimit-remaining': '0' } as never,
        data: {},
      },
    });

    const octokit = makeOctokit({
      '': [dirEntry('locked', 'locked')],
      locked: rateLimit,
    });

    await expect(
      fetchDirectoryContentsRecursivelyAPI(octokit, 'o', 'r', 'main', '', 1, 2)
    ).rejects.toBeInstanceOf(RequestError);
  });

  it('propagates a top-level 403 error', async () => {
    const rateLimit = new RequestError('forbidden', 403, {
      request: { method: 'GET', url: 'x', headers: {} },
      response: {
        status: 403,
        url: 'x',
        headers: { 'x-ratelimit-remaining': '0' } as never,
        data: {},
      },
    });

    const octokit = makeOctokit({ '': rateLimit });

    await expect(
      fetchDirectoryContentsRecursivelyAPI(octokit, 'o', 'r', 'main', '', 1, 2)
    ).rejects.toBeInstanceOf(RequestError);
  });
});
