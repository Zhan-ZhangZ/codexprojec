import type { QueryParams } from './request.js';

/**
 * Build legacy paginated query parameters, omitting falsy values.
 */
export function buildTruthyPaginatedParams(
  filter?: string,
  limit?: number,
  offset?: number
): QueryParams {
  const params: QueryParams = {};

  if (filter) {
    params.filter = filter;
  }

  if (limit) {
    params.limit = limit;
  }

  if (offset) {
    params.offset = offset;
  }

  return params;
}
