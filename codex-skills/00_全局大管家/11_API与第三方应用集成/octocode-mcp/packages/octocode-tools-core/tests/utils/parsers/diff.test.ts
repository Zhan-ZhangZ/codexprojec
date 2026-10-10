import { describe, expect, it } from 'vitest';

import {
  buildDiffPreview,
  DIFF_PREVIEW_MAX_LINES,
} from '../../../src/utils/parsers/diff.js';

describe('buildDiffPreview', () => {
  it('returns no lines and zero moreCount for an empty/undefined patch', () => {
    expect(buildDiffPreview(undefined)).toEqual({ lines: [], moreCount: 0 });
    expect(buildDiffPreview('')).toEqual({ lines: [], moreCount: 0 });
  });

  it('returns all lines when under the limit', () => {
    expect(buildDiffPreview('@@ -1 +1 @@\n+a\n-b', 10)).toEqual({
      lines: ['@@ -1 +1 @@', '+a', '-b'],
      moreCount: 0,
    });
  });

  it('does not over-count or surface a phantom line for a trailing newline', () => {
    // Regression: a raw split('\n') would make this 3 lines + moreCount 1.
    expect(buildDiffPreview('+a\n+b\n', 5)).toEqual({
      lines: ['+a', '+b'],
      moreCount: 0,
    });
  });

  it('truncates to maxLines and reports the remainder', () => {
    const patch = Array.from({ length: 8 }, (_, i) => `+line${i}`).join('\n');
    expect(buildDiffPreview(patch, 3)).toEqual({
      lines: ['+line0', '+line1', '+line2'],
      moreCount: 5,
    });
  });

  it('defaults to DIFF_PREVIEW_MAX_LINES', () => {
    const patch = Array.from(
      { length: DIFF_PREVIEW_MAX_LINES + 4 },
      (_, i) => `+l${i}`
    ).join('\n');
    const preview = buildDiffPreview(patch);
    expect(preview.lines).toHaveLength(DIFF_PREVIEW_MAX_LINES);
    expect(preview.moreCount).toBe(4);
  });
});
