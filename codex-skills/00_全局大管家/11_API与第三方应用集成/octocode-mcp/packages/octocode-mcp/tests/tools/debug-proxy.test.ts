import { describe, it, expect } from 'vitest';
import { TOOL_NAMES } from '../../../octocode-tools-core/src/tools/toolMetadata/proxies.js';
import { STATIC_TOOL_NAMES } from '../../../octocode-tools-core/src/tools/toolNames.js';

describe('Debug proxy', () => {
  it('should show values', () => {
    expect(TOOL_NAMES.LOCAL_RIPGREP).toBe(STATIC_TOOL_NAMES.LOCAL_RIPGREP);
  });
});
