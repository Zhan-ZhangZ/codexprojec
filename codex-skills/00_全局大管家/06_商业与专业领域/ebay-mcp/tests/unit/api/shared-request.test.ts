import { describe, expect, it } from 'vitest';
import {
  buildContinuationParams,
  buildOptionalStringParams,
  buildValidatedPaginatedParams,
  optionalStringParam,
  requireObject,
  requireString,
  withApiError,
} from '@/api/shared/request.js';

describe('shared API request helpers', () => {
  it('validates required endpoint values', () => {
    expect(() => requireString('', 'sku')).toThrow('sku is required and must be a string');
    expect(() => requireObject(null, 'body')).toThrow('body is required and must be an object');
  });

  it('builds optional string query params with the existing truthy behavior', () => {
    expect(buildOptionalStringParams({ filter: 'status:ACTIVE', empty: '' })).toEqual({
      filter: 'status:ACTIVE',
    });
    expect(optionalStringParam(undefined, 'filter')).toBeUndefined();
    expect(() => optionalStringParam(1, 'filter')).toThrow('filter must be a string when provided');
  });

  it('builds validated pagination params', () => {
    expect(buildValidatedPaginatedParams('status:ACTIVE', 50, 0)).toEqual({
      filter: 'status:ACTIVE',
      limit: 50,
      offset: 0,
    });

    expect(() => buildValidatedPaginatedParams(undefined, 0, 0)).toThrow(
      'limit must be a positive number when provided'
    );
    expect(() => buildValidatedPaginatedParams(undefined, 1, -1)).toThrow(
      'offset must be a non-negative number when provided'
    );
  });

  it('builds continuation-token params', () => {
    expect(buildContinuationParams(25, 'next-page')).toEqual({
      limit: 25,
      continuation_token: 'next-page',
    });
    expect(() => buildContinuationParams(0)).toThrow(
      'limit must be a positive number when provided'
    );
    expect(() => buildContinuationParams(25, 1 as never)).toThrow(
      'continuationToken must be a string when provided'
    );
  });

  it('wraps lower-level request errors with endpoint context', async () => {
    await expect(
      withApiError('Failed to get inventory item', () =>
        Promise.reject(new Error('eBay API Error: missing sku'))
      )
    ).rejects.toThrow('Failed to get inventory item: eBay API Error: missing sku');
  });
});
