import { describe, expect, it } from 'vitest';

import { compactLocation } from '../../../src/tools/lsp/shared/semanticTypes.js';

describe('compactLocation', () => {
  it('derives a 1-based displayRange from a 0-based LSP range (references/definitions)', () => {
    // Regression: references carry `range` (0-based) but no displayRange, so the
    // CLI printed `file:?`. compactLocation must surface the line.
    const result = compactLocation({
      uri: 'lines.ts',
      content: 'export function splitLines() {}',
      range: {
        start: { line: 10, character: 0 },
        end: { line: 10, character: 9 },
      },
    });
    expect(result.displayRange).toEqual({ startLine: 11, endLine: 11 });
    expect(result.uri).toBe('lines.ts');
    expect(result.content).toBe('export function splitLines() {}');
  });

  it('prefers an explicit displayRange over deriving from range', () => {
    const result = compactLocation({
      uri: 'a.ts',
      displayRange: { startLine: 5, endLine: 7 },
      range: {
        start: { line: 99, character: 0 },
        end: { line: 99, character: 1 },
      },
    });
    expect(result.displayRange).toEqual({ startLine: 5, endLine: 7 });
  });

  it('omits displayRange when neither range nor displayRange is present', () => {
    const result = compactLocation({ uri: 'a.ts', content: 'x' });
    expect(result.displayRange).toBeUndefined();
  });

  it('carries the isDefinition flag', () => {
    const result = compactLocation({
      uri: 'a.ts',
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 3 },
      },
      isDefinition: true,
    });
    expect(result.isDefinition).toBe(true);
    expect(result.displayRange).toEqual({ startLine: 1, endLine: 1 });
  });
});
