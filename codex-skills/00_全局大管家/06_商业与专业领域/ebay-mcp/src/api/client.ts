import { EbayOAuthClient } from '@/auth/oauth.js';
import { getBaseUrl } from '@/config/environment.js';
import type { EbayConfig } from '@/types/ebay.js';
import { httpRequest, isHttpError } from '@/utils/http.js';
import { isRecord } from '@/utils/type-guards.js';
import { apiLogger, logRequest, logResponse, logErrorResponse } from '@/utils/logger.js';

/**
 * Per-request overrides accepted by the verb helpers ({@link EbayApiClient.get}
 * et al). `headers` are merged over the client defaults (the auth header is
 * always applied last and cannot be overridden); `params` are appended to the
 * query string — useful for POSTs that also take query parameters.
 */
export interface EbayRequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
}

/**
 * Rate limit tracking
 */
class RateLimitTracker {
  private requestTimestamps: number[] = [];
  private readonly windowMs = 60000; // 1 minute window
  private readonly maxRequests = 5000; // Conservative limit

  canMakeRequest(): boolean {
    const now = Date.now();
    // Remove timestamps older than window
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.windowMs
    );
    return this.requestTimestamps.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  getStats(): { current: number; max: number; windowMs: number } {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.windowMs
    );
    return {
      current: this.requestTimestamps.length,
      max: this.maxRequests,
      windowMs: this.windowMs,
    };
  }
}

/**
 * Base client for making eBay API requests.
 *
 * Wraps the native-`fetch` helper ({@link httpRequest}) with eBay-specific
 * concerns the old axios interceptors used to handle: per-request auth-token
 * injection, a sliding-window rate-limit guard, request/response logging, and
 * retry/refresh handling for 401 (refresh once), 429, and 5xx (exponential
 * backoff) responses.
 */
export class EbayApiClient {
  private authClient: EbayOAuthClient;
  private baseUrl: string;
  private rateLimitTracker: RateLimitTracker;
  private config: EbayConfig;
  private readonly timeoutMs = 30000;

  /**
   * Build default request headers based on configured marketplace and language.
   */
  private getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.config.contentLanguage) {
      headers['Content-Language'] = this.config.contentLanguage;
    }

    if (this.config.marketplaceId) {
      headers['X-EBAY-C-MARKETPLACE-ID'] = this.config.marketplaceId;
    }

    return headers;
  }

  constructor(config: EbayConfig) {
    this.config = config;
    this.authClient = new EbayOAuthClient(config);
    this.baseUrl = getBaseUrl(config.environment, config.apiBaseUrl);
    this.rateLimitTracker = new RateLimitTracker();
  }

  /**
   * Validate that access token is available before making API request
   */
  private validateAccessToken(): void {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error(
        'Missing required eBay credentials. Please set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in your .env file.'
      );
    }
  }

  /**
   * Pull the most descriptive eBay error string from a response body when present.
   * eBay REST errors arrive as `{ errors: [{ message, longMessage }] }`.
   */
  private ebayErrorDetail(data: unknown): string | undefined {
    if (isRecord(data) && Array.isArray(data.errors)) {
      const firstError = data.errors[0];
      if (isRecord(firstError)) {
        const detail = firstError.longMessage ?? firstError.message;
        if (typeof detail === 'string') {
          return detail;
        }
      }
    }
    return undefined;
  }

  /**
   * Core request path shared by every verb. Injects auth + default headers,
   * enforces the rate limit, logs, and applies eBay's retry/refresh semantics.
   * Resolves with the decoded response body; throws an `Error` with a
   * caller-friendly message on failure.
   *
   * @param absolute - When true, `endpoint` is treated as a full URL (used by
   *   APIs on a different host, e.g. Identity on `apiz.ebay.com`).
   */
  private async request<T>(
    method: string,
    endpoint: string,
    options: {
      params?: Record<string, unknown>;
      data?: unknown;
      headers?: Record<string, string>;
      absolute?: boolean;
    }
  ): Promise<T> {
    // In proxy auth mode the upstream proxy supplies credentials, so the server
    // neither requires nor validates its own. See EBAY_MCP_DISABLE_AUTH_HEADER.
    if (!this.config.disableAuthHeader) {
      this.validateAccessToken();
    }

    const url = options.absolute ? endpoint : `${this.baseUrl}${endpoint}`;
    let authRetried = false;
    let serverRetries = 0;

    // Retry loop: each pass either returns the body (success), `continue`s to
    // retry, or throws. Retries are bounded so this can never spin forever —
    // `authRetried` allows one token-refresh retry on 401, and `serverRetries`
    // allows up to three backoff retries on 5xx. Once both are spent, the next
    // failure throws and the loop exits.
    //
    // Example: a 401 then two 503s then success runs four passes —
    //   pass 1: 401  → refresh token, continue   (authRetried → true)
    //   pass 2: 503  → backoff, continue          (serverRetries → 1)
    //   pass 3: 503  → backoff, continue          (serverRetries → 2)
    //   pass 4: 200  → return response.data
    while (true) {
      if (!this.rateLimitTracker.canMakeRequest()) {
        const stats = this.rateLimitTracker.getStats();
        throw new Error(
          `Rate limit exceeded: ${stats.current}/${stats.max} requests in ${stats.windowMs}ms window. Please wait before making more requests.`
        );
      }

      const headers: Record<string, string> = {
        ...this.getDefaultHeaders(),
        ...options.headers,
      };

      // Proxy auth mode: attach no Authorization header and acquire no token —
      // the upstream proxy injects whatever credentials eBay requires.
      if (!this.config.disableAuthHeader) {
        const token = await this.authClient.getAccessToken();
        if (!token) {
          throw new Error(
            'Access token is missing. Provide EBAY_USER_REFRESH_TOKEN or valid app credentials, then retry.'
          );
        }
        headers.Authorization = `Bearer ${token}`;
      }

      this.rateLimitTracker.recordRequest();
      logRequest(method, url, options.params, options.data);

      try {
        const response = await httpRequest<T>({
          method,
          url,
          params: options.params,
          headers,
          body: options.data,
          timeoutMs: this.timeoutMs,
        });

        logResponse(
          response.status,
          response.statusText,
          response.data,
          response.headers['x-ebay-c-ratelimit-remaining'],
          response.headers['x-ebay-c-ratelimit-limit']
        );

        return response.data;
      } catch (error) {
        if (!isHttpError(error)) {
          throw error;
        }

        if (error.status != null) {
          logErrorResponse(error.status, error.statusText, url, error.data);
        } else {
          apiLogger.error('No response received from server', { url });
        }

        // 401 — refresh the token once, then retry the request. Skipped in proxy
        // auth mode: the server holds no token to refresh, so a 401 (the proxy's
        // own auth failing) is surfaced directly rather than retried.
        if (error.status === 401 && !this.config.disableAuthHeader) {
          if (!authRetried) {
            authRetried = true;
            apiLogger.warn('Authentication error (401). Attempting to refresh user token...');

            try {
              await this.authClient.getAccessToken();
            } catch (refreshError) {
              const reason = refreshError instanceof Error ? refreshError.message : 'Unknown error';
              apiLogger.error('Failed to refresh token', { error: reason });

              const detail = this.ebayErrorDetail(error.data) ?? 'Invalid access token';
              throw new Error(
                `${detail}. Token refresh failed: ${reason}. ` +
                  `Please use the ebay_set_user_tokens_with_expiry tool to provide valid tokens.`
              );
            }

            apiLogger.info('Token refreshed successfully. Retrying request...');
            continue;
          }

          const detail = this.ebayErrorDetail(error.data) ?? 'Invalid access token';
          throw new Error(
            `${detail}. Automatic token refresh failed. ` +
              `Please use the ebay_set_user_tokens_with_expiry tool to provide valid tokens.`
          );
        }

        // 429 — surface a clear rate-limit message with the server's retry hint.
        if (error.status === 429) {
          const retryAfter = error.headers['retry-after'];
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000;
          throw new Error(
            `eBay API rate limit exceeded. Retry after ${waitTime / 1000} seconds. ` +
              `Consider reducing request frequency or upgrading to user tokens for higher limits.`
          );
        }

        // 5xx — retry up to three times with exponential backoff.
        if (error.status != null && error.status >= 500 && serverRetries < 3) {
          const delay = Math.pow(2, serverRetries) * 1000;
          serverRetries++;
          apiLogger.warn(`Server error (${error.status}). Retrying...`, {
            attempt: `${serverRetries}/3`,
            delayMs: Math.min(delay, 5000),
          });
          await new Promise<void>((resolve) => {
            setTimeout(resolve, Math.min(delay, 5000));
          });
          continue;
        }

        if (error.status != null) {
          throw new Error(`eBay API Error: ${this.ebayErrorDetail(error.data) ?? error.message}`);
        }

        throw error;
      }
    }
  }

  /**
   * Make a GET request to eBay API
   */
  async get<T = unknown>(
    endpoint: string,
    params?: Record<string, unknown>,
    config?: EbayRequestConfig
  ): Promise<T> {
    return await this.request<T>('GET', endpoint, {
      params: { ...params, ...config?.params },
      headers: config?.headers,
    });
  }

  /**
   * Make a POST request to eBay API
   */
  async post<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: EbayRequestConfig
  ): Promise<T> {
    return await this.request<T>('POST', endpoint, {
      data,
      params: config?.params,
      headers: config?.headers,
    });
  }

  /**
   * Make a PUT request to eBay API
   */
  async put<T = unknown>(endpoint: string, data?: unknown, config?: EbayRequestConfig): Promise<T> {
    return await this.request<T>('PUT', endpoint, {
      data,
      params: config?.params,
      headers: config?.headers,
    });
  }

  /**
   * Make a DELETE request to eBay API
   */
  async delete<T = unknown>(endpoint: string, config?: EbayRequestConfig): Promise<T> {
    return await this.request<T>('DELETE', endpoint, {
      params: config?.params,
      headers: config?.headers,
    });
  }

  /**
   * Initialize the client (load user tokens from storage)
   */
  async initialize(): Promise<void> {
    await this.authClient.initialize();
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return this.authClient.isAuthenticated();
  }

  /**
   * Check if user tokens are available
   */
  hasUserTokens(): boolean {
    return this.authClient.hasUserTokens();
  }

  /**
   * Set user access and refresh tokens
   */
  setUserTokens(
    accessToken: string,
    refreshToken: string,
    accessTokenExpiry?: number,
    refreshTokenExpiry?: number
  ): Promise<void> {
    this.authClient.setUserTokens(accessToken, refreshToken, accessTokenExpiry, refreshTokenExpiry);
    return Promise.resolve();
  }

  /**
   * Get token information for debugging
   */
  getTokenInfo() {
    return this.authClient.getTokenInfo();
  }

  /**
   * Get the OAuth client instance for advanced operations
   */
  getOAuthClient(): EbayOAuthClient {
    return this.authClient;
  }

  /**
   * Get rate limit statistics
   */
  getRateLimitStats() {
    return this.rateLimitTracker.getStats();
  }

  /**
   * Get the config object (for accessing environment, etc.)
   */
  getConfig(): EbayConfig {
    return this.config;
  }

  /**
   * Manually refresh user access token using the refresh token
   * This is useful when you encounter "Invalid access token" errors
   * The token will be automatically saved to storage after refresh
   */
  async refreshUserToken(): Promise<void> {
    await this.authClient.refreshUserToken();
  }

  /**
   * Make a GET request with a full URL (for APIs that use different base URLs)
   * Used by Identity API which uses the apiz subdomain
   */
  async getWithFullUrl<T = unknown>(fullUrl: string, params?: Record<string, unknown>): Promise<T> {
    return await this.request<T>('GET', fullUrl, { params, absolute: true });
  }
}
