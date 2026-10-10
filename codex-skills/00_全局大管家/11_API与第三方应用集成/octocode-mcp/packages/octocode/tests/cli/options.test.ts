import { describe, it, expect } from 'vitest';
import { nonNegIntOption, posIntOption } from '../../src/cli/options.js';

describe('nonNegIntOption', () => {
  it('returns undefined for empty/absent', () => {
    expect(nonNegIntOption('')).toBeUndefined();
  });

  it('accepts zero and positive integers', () => {
    expect(nonNegIntOption('0')).toBe(0);
    expect(nonNegIntOption('42')).toBe(42);
  });

  it('rejects negatives and non-integers', () => {
    expect(nonNegIntOption('-1')).toBeUndefined();
    expect(nonNegIntOption('abc')).toBeUndefined();
  });
});

describe('posIntOption', () => {
  it('rejects zero', () => {
    expect(posIntOption('0')).toBeUndefined();
  });

  it('accepts positive integers', () => {
    expect(posIntOption('7')).toBe(7);
  });

  it('rejects negatives and empty', () => {
    expect(posIntOption('-3')).toBeUndefined();
    expect(posIntOption('')).toBeUndefined();
  });

  it('is lenient about trailing junk (matches legacy parseInt behavior)', () => {
    // The copy-pasted helpers it replaces all used Number.parseInt, which
    // stops at the first non-digit — preserve that to avoid behavior drift.
    expect(posIntOption('5x')).toBe(5);
    expect(nonNegIntOption('5x')).toBe(5);
  });
});
