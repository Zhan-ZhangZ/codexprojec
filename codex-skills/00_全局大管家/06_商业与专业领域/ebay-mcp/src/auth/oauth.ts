import {
  createAppAccessTokenExpiry,
  createStoredUserTokens,
  createStoredUserTokensFromResponse,
  DotEnvCredentialStore,
  isTokenExpired,
  type CredentialStore,
  type EbayUserTokenResponse,
} from '@/auth/credential-session.js';
import { getBaseUrl, getDefaultScopes } from '@/config/environment.js';
import type {
  EbayAppAccessTokenResponse,
  EbayConfig,
  EbayUserToken,
  StoredTokenData,
} from '@/types/ebay.js';
import { LocaleEnum } from '@/types/ebay-enums.js';
import { describeHttpError, httpRequest, isHttpError } from '@/utils/http.js';
import { authLogger } from '@/utils/logger.js';

/**
 * Manages eBay OAuth 2.0 authentication
 * Loads tokens exclusively from environment variables (.env file)
 * Supports both client credentials (app tokens) and user access tokens with refresh
 */
export class EbayOAuthClient {
  private appAccessToken: string | null = null;
  private appAccessTokenExpiry = 0;
  private userTokens: StoredTokenData | null = null;

  constructor(
    private config: EbayConfig,
    private credentialStore: CredentialStore = new DotEnvCredentialStore()
  ) {}

  /**
   * Initialize user tokens from environment variables only
   * If EBAY_USER_REFRESH_TOKEN exists, automatically refresh to get a valid access token
   */
  async initialize(): Promise<void> {
    const envRefreshToken = process.env.EBAY_USER_REFRESH_TOKEN;
    const envAccessToken = process.env.EBAY_USER_ACCESS_TOKEN;
    const envAppToken = process.env.EBAY_APP_ACCESS_TOKEN ?? '';
    const locale = this.config?.locale || LocaleEnum.en_US;

    if (envRefreshToken) {
      authLogger.info('Loading tokens from environment variables');

      this.userTokens = createStoredUserTokens({
        config: { ...this.config, locale },
        envAppToken,
        accessToken: envAccessToken || '',
        refreshToken: envRefreshToken,
      });

      // Immediately refresh to get a valid access token and scopes
      authLogger.info('Refreshing access token using refresh token from .env');
      try {
        await this.refreshUserToken();
        authLogger.info('Access token refreshed successfully');

        await this.getOrRefreshAppAccessToken();
      } catch (error) {
        authLogger.error('Failed to refresh access token', {
          error: error instanceof Error ? error.message : String(error),
          hint: 'The EBAY_USER_REFRESH_TOKEN in .env may be invalid or expired',
        });
        // Clear invalid tokens
        this.userTokens = null;
      }
    }
  }

  /**
   * Check if user tokens are available
   */
  hasUserTokens(): boolean {
    return this.userTokens !== null;
  }

  /**
   * Check if user access token is expired
   */
  private isUserAccessTokenExpired(tokens: StoredTokenData): boolean {
    return isTokenExpired(tokens.userAccessTokenExpiry);
  }

  /**
   * Check if user refresh token is expired
   */
  private isUserRefreshTokenExpired(tokens: StoredTokenData): boolean {
    return isTokenExpired(tokens.userRefreshTokenExpiry);
  }

  /**
   * Get a valid access token, with priority order:
   * 1. User access token (if available and valid, or refreshable)
   * 2. App access token from client credentials (fallback)
   */
  async getAccessToken(): Promise<string> {
    // Try to use user token first
    if (this.userTokens) {
      // Check if access token is still valid
      if (!this.isUserAccessTokenExpired(this.userTokens)) {
        return this.userTokens.userAccessToken;
      }

      // Try to refresh if refresh token is valid
      if (!this.isUserRefreshTokenExpired(this.userTokens)) {
        try {
          await this.refreshUserToken();
          return this.userTokens.userAccessToken;
        } catch (error) {
          authLogger.error('Failed to refresh user token, falling back to app access token', {
            error: error instanceof Error ? error.message : String(error),
          });
          // Clear invalid tokens
          this.userTokens = null;
        }
      } else {
        // Refresh token expired
        authLogger.error('User refresh token expired. User needs to re-authorize.');
        this.userTokens = null;
        throw new Error(
          'User authorization expired. Please update EBAY_USER_REFRESH_TOKEN in .env with a new refresh token.'
        );
      }
    }

    // Fallback to app access token (client credentials)
    if (this.appAccessToken && !isTokenExpired(this.appAccessTokenExpiry)) {
      return this.appAccessToken;
    }

    await this.getOrRefreshAppAccessToken();
    return this.appAccessToken!;
  }

  /**
   * Set user access token and refresh token
   * Stores tokens in memory and updates .env file for persistence
   */
  setUserTokens(
    accessToken: string,
    refreshToken: string,
    accessTokenExpiry?: number,
    refreshTokenExpiry?: number
  ): void {
    this.userTokens = createStoredUserTokens({
      config: this.config,
      accessToken,
      refreshToken,
      accessTokenExpiry,
      refreshTokenExpiry,
    });

    // Update .env file with new tokens
    this.credentialStore.write({
      EBAY_USER_ACCESS_TOKEN: accessToken,
      EBAY_USER_REFRESH_TOKEN: refreshToken,
    });
  }

  /**
   * Get or refresh the app access token using the client credentials flow.
   * This method ensures that a valid app access token is always available.
   * Rate limit: 1,000 requests/day
   */
  async getOrRefreshAppAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.appAccessToken && !isTokenExpired(this.appAccessTokenExpiry)) {
      return this.appAccessToken;
    }

    const authUrl = `${getBaseUrl(this.config.environment, this.config.apiBaseUrl)}/identity/v1/oauth2/token`;
    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64'
    );

    // Client credentials flow only supports basic scope
    // User authorization flows can request additional scopes
    const scopeParam = 'https://api.ebay.com/oauth/api_scope';

    try {
      const response = await httpRequest<EbayAppAccessTokenResponse>({
        method: 'POST',
        url: authUrl,
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: scopeParam,
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
      });

      this.appAccessToken = response.data.access_token;
      this.appAccessTokenExpiry = createAppAccessTokenExpiry(response.data.expires_in);

      // Update .env file with app access token
      this.credentialStore.write({
        EBAY_APP_ACCESS_TOKEN: this.appAccessToken,
      });

      return this.appAccessToken;
    } catch (error) {
      if (isHttpError(error)) {
        throw new Error(`Failed to get app access token: ${describeHttpError(error)}`);
      }
      throw error;
    }
  }

  /**
   * Exchange authorization code for user access token
   * Persists received tokens to .env automatically
   */
  async exchangeCodeForToken(code: string): Promise<EbayUserToken> {
    if (!this.config.redirectUri) {
      throw new Error('Redirect URI is required for authorization code exchange');
    }

    const tokenUrl = `${getBaseUrl(this.config.environment, this.config.apiBaseUrl)}/identity/v1/oauth2/token`;
    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64'
    );

    try {
      const response = await httpRequest<EbayUserToken>({
        method: 'POST',
        url: tokenUrl,
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.config.redirectUri,
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
      });

      const tokenData: EbayUserToken = response.data;

      this.userTokens = createStoredUserTokensFromResponse({
        config: this.config,
        tokenData,
      });

      // Persist tokens to .env so they survive process restarts.
      this.credentialStore.write({
        EBAY_USER_ACCESS_TOKEN: tokenData.access_token,
        EBAY_USER_REFRESH_TOKEN: tokenData.refresh_token,
      });

      return tokenData;
    } catch (error) {
      if (isHttpError(error)) {
        throw new Error(`Failed to exchange code for token: ${describeHttpError(error)}`);
      }
      throw error;
    }
  }

  /**
   * Refresh user access token using refresh token from .env
   * This method is public and can be called by LLMs when encountering authentication errors
   */
  async refreshUserToken(): Promise<void> {
    if (!this.userTokens) {
      throw new Error('No user tokens available to refresh');
    }

    // Use the token endpoint, not the authorization endpoint
    const authUrl = `${getBaseUrl(this.config.environment, this.config.apiBaseUrl)}/identity/v1/oauth2/token`;
    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64'
    );

    try {
      // Prepare refresh token request parameters
      // Note: We do NOT include scopes in refresh requests as eBay will return
      // the scopes that were originally granted to the refresh token
      const params: Record<string, string> = {
        grant_type: 'refresh_token',
        refresh_token: this.userTokens.userRefreshToken,
      };

      const response = await httpRequest<EbayUserTokenResponse>({
        method: 'POST',
        url: authUrl,
        body: new URLSearchParams(params),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
      });

      const tokenData = response.data;

      this.userTokens = createStoredUserTokensFromResponse({
        config: this.config,
        previousTokens: this.userTokens,
        tokenData,
      });

      // Update .env file with new tokens
      const envUpdates: Record<string, string> = {
        EBAY_USER_ACCESS_TOKEN: tokenData.access_token,
      };

      // Reconcile .env with the authoritative in-memory refresh token.
      if (this.userTokens.userRefreshToken !== process.env.EBAY_USER_REFRESH_TOKEN) {
        envUpdates.EBAY_USER_REFRESH_TOKEN = this.userTokens.userRefreshToken;
      }

      // Write updates to .env file
      this.credentialStore.write(envUpdates);
    } catch (error) {
      if (isHttpError(error)) {
        throw new Error(`Failed to refresh token: ${describeHttpError(error)}`);
      }
      throw error;
    }
  }

  /**
   * Check if currently authenticated (either user or app credentials)
   */
  isAuthenticated(): boolean {
    if (this.userTokens && !this.isUserAccessTokenExpired(this.userTokens)) {
      return true;
    }
    return this.appAccessToken !== null && !isTokenExpired(this.appAccessTokenExpiry);
  }

  /**
   * Clear all authentication tokens from memory
   * Note: To persist this change, remove EBAY_USER_REFRESH_TOKEN from .env
   */
  clearAllTokens(): void {
    this.appAccessToken = null;
    this.appAccessTokenExpiry = 0;
    this.userTokens = null;
  }

  /**
   * Get current token info for debugging
   */
  getTokenInfo(): {
    hasUserToken: boolean;
    hasAppAccessToken: boolean;
    scopeInfo?: { tokenScopes: string[]; environmentScopes: string[]; missingScopes: string[] };
  } {
    const info: {
      hasUserToken: boolean;
      hasAppAccessToken: boolean;
      scopeInfo?: { tokenScopes: string[]; environmentScopes: string[]; missingScopes: string[] };
    } = {
      hasUserToken: this.userTokens !== null && !this.isUserAccessTokenExpired(this.userTokens),
      hasAppAccessToken: this.appAccessToken !== null && Date.now() < this.appAccessTokenExpiry,
    };

    // Add scope comparison info if user tokens are available
    if (this.userTokens?.scope) {
      const tokenScopes = this.userTokens.scope.split(' ');
      const environmentScopes = getDefaultScopes(this.config.environment);
      const tokenScopeSet = new Set(tokenScopes);
      const missingScopes = environmentScopes.filter((scope) => !tokenScopeSet.has(scope));

      info.scopeInfo = {
        tokenScopes,
        environmentScopes,
        missingScopes,
      };
    }

    return info;
  }

  /**
   * Get internal user tokens (for debugging/status tools)
   * @internal
   */
  getUserTokens(): StoredTokenData | null {
    return this.userTokens;
  }

  /**
   * Get internal app access token cached value (for debugging/status tools)
   * @internal
   */
  getCachedAppAccessToken(): string | null {
    return this.appAccessToken;
  }

  /**
   * Get internal app access token expiry (for debugging/status tools)
   * @internal
   */
  getCachedAppAccessTokenExpiry(): number {
    return this.appAccessTokenExpiry;
  }
}
