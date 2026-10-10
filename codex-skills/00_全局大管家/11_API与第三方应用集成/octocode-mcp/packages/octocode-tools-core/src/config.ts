export const GITHUB_SEARCH_DEFAULT_LIMIT = 30;

export const GITHUB_SEARCH_MAX_LIMIT = 100;

export const GITHUB_SEARCH_MAX_PAGES = 10;

export const GITHUB_STRUCTURE_DEFAULT_ENTRIES_PER_PAGE = 100;

export const GITHUB_STRUCTURE_MAX_ENTRIES_PER_PAGE = 200;

export const PR_CONTENT_DEFAULT_ITEMS_PER_PAGE = 20;

export const PR_CONTENT_MAX_ITEMS_PER_PAGE = 100;

export const LOCAL_DEFAULT_FILES_PER_PAGE = 20;

export const LOCAL_MAX_FILES_PER_PAGE = 50;

export const LOCAL_MAX_LIMIT = 10_000;

export const LOCAL_MAX_DEPTH = 20;

export const MAX_PAGE_NUMBER = 1_000;

export const MAX_CONTEXT_LINES = 100;

export const MAX_CHAR_LENGTH = 50_000;

export const GITHUB_FILE_CONTENT_DEFAULT_CHAR_LENGTH = 8_000;

export const MAX_MATCH_CONTENT_LENGTH = 100_000;

/**
 * Default per-match snippet length (Unicode scalars). Mirrors the Rust engine's
 * `DEFAULT_MAX_SNIPPET_CHARS` so GitHub code-search fragments are bounded by the
 * same rule that bounds local ripgrep snippets — char-safe truncation with `...`.
 * The render layer must not re-truncate; this is the single data-layer bound.
 */
export const DEFAULT_MATCH_SNIPPET_CHARS = 500;
