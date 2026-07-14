/**
 * Minimal HTTP client built on the native `fetch` API (Node ≥ 18).
 *
 * Why this exists: the project previously used axios. axios drags in transitive
 * dependencies (`follow-redirects`, `form-data`, `proxy-from-env`) and hides
 * request/response handling behind interceptors. Native `fetch` covers every
 * use case here with zero dependencies, but it has sharp edges this module
 * centralizes so call sites never repeat them:
 *
 *  1. `fetch` does NOT reject on 4xx/5xx — we throw {@link HttpError} on `!res.ok`.
 *  2. `fetch` does NOT parse JSON — and `res.json()` throws on an empty (204) body.
 *  3. Timeouts need an `AbortController`.
 *  4. Query params need explicit `URLSearchParams` serialization.
 *  5. Error narrowing replaces `axios.isAxiosError` with {@link isHttpError}.
 *
 * Keeping these in one place is the single source of truth that lets the rest of
 * the codebase treat HTTP like the old axios calls without the dependency.
 */

import { isRecord } from '@/utils/type-guards.js';

/** How to decode a successful response body. Defaults to `json`. */
export type ResponseType = 'json' | 'text' | 'arraybuffer';

/**
 * Options for {@link httpRequest}. Mirrors the subset of axios config the
 * codebase actually used, expressed in fetch-native terms.
 */
export interface HttpRequestOptions {
  /** HTTP method. Defaults to `GET`. */
  method?: string;
  /** Absolute URL, or a path to be joined onto `baseUrl`. */
  url: string;
  /** Optional base URL prepended to `url` when `url` is a path. */
  baseUrl?: string;
  /** Query parameters; `null`/`undefined` values are skipped. */
  params?: Record<string, unknown>;
  /** Request headers. Caller-provided values win over inferred defaults. */
  headers?: Record<string, string>;
  /**
   * Request body. An object is JSON-stringified (with a JSON content-type when
   * none is set); a `URLSearchParams` is form-encoded; strings/`Buffer` are sent
   * as-is. `undefined` sends no body.
   */
  body?: unknown;
  /** Abort the request after this many milliseconds. */
  timeoutMs?: number;
  /** Decoding for the success body. Defaults to `json`. */
  responseType?: ResponseType;
}

/**
 * Normalized successful response. `headers` keys are lowercased so callers can
 * read them case-insensitively (the same guarantee axios gave).
 */
export interface HttpResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * Thrown for any non-2xx response, network failure, or timeout. Carries the
 * parsed error body and response headers so callers can react to eBay error
 * shapes, `retry-after`, and rate-limit headers.
 *
 * `status` is `undefined` for network/timeout failures (no response received).
 */
export class HttpError extends Error {
  readonly status?: number;
  readonly statusText?: string;
  readonly url: string;
  /** Parsed response body (JSON when decodable, otherwise the raw text). */
  readonly data: unknown;
  /** Lowercased response headers, empty for network/timeout failures. */
  readonly headers: Record<string, string>;
  /** True when the failure was our own timeout aborting the request. */
  readonly isTimeout: boolean;

  constructor(
    message: string,
    init: {
      url: string;
      status?: number;
      statusText?: string;
      data?: unknown;
      headers?: Record<string, string>;
      isTimeout?: boolean;
    }
  ) {
    super(message);
    this.name = 'HttpError';
    this.url = init.url;
    this.status = init.status;
    this.statusText = init.statusText;
    this.data = init.data;
    this.headers = init.headers ?? {};
    this.isTimeout = init.isTimeout ?? false;
  }
}

/** Type guard replacing `axios.isAxiosError`. */
export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

/**
 * Extract a human-readable message from an error, understanding both the eBay
 * REST error shape (`errors[].longMessage`) and the OAuth error shape
 * (`error_description`). Falls back to the error message, then `fallback`.
 */
export function describeHttpError(error: unknown, fallback = 'Unknown error'): string {
  if (isHttpError(error)) {
    const { data } = error;
    if (isRecord(data)) {
      if (typeof data.error_description === 'string') {
        return data.error_description;
      }
      const firstError = Array.isArray(data.errors) ? data.errors[0] : undefined;
      if (isRecord(firstError)) {
        const detail = firstError.longMessage ?? firstError.message;
        if (typeof detail === 'string') {
          return detail;
        }
      }
    }
    return error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

/** Coerce a query-param value to a string without producing `[object Object]`. */
function stringifyParam(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return JSON.stringify(value);
}

/** Build the final request URL, appending serialized query params. */
function buildUrl(url: string, baseUrl?: string, params?: Record<string, unknown>): string {
  let full = baseUrl ? `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}` : url;

  if (params) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value == null) {
        continue;
      }
      const entries = Array.isArray(value) ? value : [value];
      for (const entry of entries) {
        search.append(key, stringifyParam(entry));
      }
    }
    const query = search.toString();
    if (query) {
      full += (full.includes('?') ? '&' : '?') + query;
    }
  }

  return full;
}

/** Result of {@link prepareBody}: the wire body plus any content-type to infer. */
interface PreparedBody {
  body: BodyInit | undefined;
  contentType?: string;
}

/** Serialize the request body and infer a content-type when the caller omitted one. */
function prepareBody(body: unknown): PreparedBody {
  if (body == null) {
    return { body: undefined };
  }
  if (typeof body === 'string') {
    return { body };
  }
  if (body instanceof URLSearchParams) {
    return { body: body.toString(), contentType: 'application/x-www-form-urlencoded' };
  }
  if (body instanceof Uint8Array || body instanceof ArrayBuffer) {
    return { body: body as BodyInit };
  }
  return { body: JSON.stringify(body), contentType: 'application/json' };
}

/** Lowercase response header names into a plain record for case-insensitive reads. */
function collectHeaders(response: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  return headers;
}

/** Decode a successful body per `responseType`, treating an empty body as `undefined`. */
async function decodeBody<T>(response: Response, responseType: ResponseType): Promise<T> {
  if (responseType === 'arraybuffer') {
    return Buffer.from(await response.arrayBuffer()) as T;
  }
  const text = await response.text();
  if (responseType === 'text') {
    return text as T;
  }
  // JSON: an empty body (e.g. 204 No Content) is not valid JSON — return undefined.
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Parse an error body as JSON when possible, otherwise keep the raw text. */
function parseErrorData(text: string): unknown {
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Perform an HTTP request with timeout, query/body serialization, and uniform
 * error semantics. Resolves on 2xx; throws {@link HttpError} otherwise (and on
 * network/timeout failures).
 *
 * @typeParam T - Shape of the decoded success body.
 */
export async function httpRequest<T = unknown>(
  options: HttpRequestOptions
): Promise<HttpResponse<T>> {
  const { method = 'GET', responseType = 'json', timeoutMs } = options;
  const url = buildUrl(options.url, options.baseUrl, options.params);
  const { body, contentType } = prepareBody(options.body);

  const headers: Record<string, string> = { ...options.headers };
  if (contentType && !Object.keys(headers).some((key) => key.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = contentType;
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = timeoutMs
    ? setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs)
    : undefined;

  let response: Response;
  try {
    response = await fetch(url, { method, headers, body, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      throw new HttpError(`Request to ${url} timed out after ${timeoutMs}ms`, {
        url,
        isTimeout: true,
      });
    }
    throw new HttpError(error instanceof Error ? error.message : `Request to ${url} failed`, {
      url,
    });
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }

  const responseHeaders = collectHeaders(response);

  if (!response.ok) {
    const data = parseErrorData(await response.text());
    throw new HttpError(`Request to ${url} failed with status ${response.status}`, {
      url,
      status: response.status,
      statusText: response.statusText,
      data,
      headers: responseHeaders,
    });
  }

  return {
    data: await decodeBody<T>(response, responseType),
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  };
}
