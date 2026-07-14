import dotenv from 'dotenv';
import stringify from 'dotenv-stringify';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { EbayConfig, EbayUserToken, StoredTokenData } from '@/types/ebay.js';

/**
 * Default lifetime for stored eBay user access tokens when eBay omits an expiry.
 */
export const DEFAULT_USER_ACCESS_TOKEN_TTL_SECONDS = 7200;

/**
 * Default lifetime for stored eBay user refresh tokens when eBay omits an expiry.
 */
export const DEFAULT_USER_REFRESH_TOKEN_TTL_SECONDS = 18 * 30 * 24 * 60 * 60;

/**
 * Safety buffer removed from app-token expiry to avoid using near-expired tokens.
 */
export const APP_ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS = 60;

/**
 * eBay user-token response shape with the required access token fields enforced.
 */
export type EbayUserTokenResponse = Pick<EbayUserToken, 'access_token' | 'expires_in'> &
  Partial<Omit<EbayUserToken, 'access_token' | 'expires_in'>>;

/**
 * Persistence boundary for writing refreshed credential values.
 */
export interface CredentialStore {
  write(updates: Record<string, string>): void;
}

/**
 * Credential store that merges token updates into the project .env file.
 */
export class DotEnvCredentialStore implements CredentialStore {
  constructor(private readonly getEnvPath: () => string = () => join(process.cwd(), '.env')) {}

  write(updates: Record<string, string>): void {
    try {
      const envPath = this.getEnvPath();
      const existingEnv = existsSync(envPath) ? dotenv.parse(readFileSync(envPath, 'utf-8')) : {};
      const safeEnvContent = stringify({ ...existingEnv, ...updates });

      writeFileSync(envPath, safeEnvContent, 'utf-8');
    } catch (_error) {
      // Silent failure keeps MCP stdout clean for JSON-RPC clients.
    }
  }
}

/**
 * Redact token values for status and credential display output.
 */
export function maskToken(token: string): string {
  if (!token || token.length < 12) {
    return '***';
  }

  return `${token.substring(0, 6)}...${token.substring(token.length - 6)}`;
}

/**
 * Convert an expires-in duration from eBay into an absolute timestamp.
 */
export function createExpiryTimestamp(expiresInSeconds: number, now = Date.now()): number {
  return now + expiresInSeconds * 1000;
}

/**
 * Create the fallback expiry timestamp for a stored eBay user access token.
 */
export function createDefaultAccessTokenExpiry(now = Date.now()): number {
  return createExpiryTimestamp(DEFAULT_USER_ACCESS_TOKEN_TTL_SECONDS, now);
}

/**
 * Create the fallback expiry timestamp for a stored eBay user refresh token.
 */
export function createDefaultRefreshTokenExpiry(now = Date.now()): number {
  return createExpiryTimestamp(DEFAULT_USER_REFRESH_TOKEN_TTL_SECONDS, now);
}

/**
 * Create the cached app-token expiry timestamp with an early refresh buffer.
 */
export function createAppAccessTokenExpiry(expiresInSeconds: number, now = Date.now()): number {
  return createExpiryTimestamp(
    Math.max(0, expiresInSeconds - APP_ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS),
    now
  );
}

/**
 * Determine whether a stored token expiry is missing or no longer valid.
 */
export function isTokenExpired(expiry: number | null | undefined, now = Date.now()): boolean {
  return expiry ? now >= expiry : true;
}

/**
 * Inputs for constructing the stored credential snapshot after user auth.
 */
export interface CreateStoredUserTokensInput {
  accessToken: string;
  accessTokenExpiry?: number;
  config: EbayConfig;
  envAppToken?: string;
  now?: number;
  refreshToken: string;
  refreshTokenExpiry?: number;
  scope?: string;
  tokenType?: string;
}

/**
 * Build a StoredTokenData object from normalized eBay user-token fields.
 */
export function createStoredUserTokens(input: CreateStoredUserTokensInput): StoredTokenData {
  const now = input.now ?? Date.now();

  return {
    clientId: input.config.clientId,
    clientSecret: input.config.clientSecret,
    redirectUri: input.config.redirectUri,
    locale: input.config.locale,
    marketplaceId: input.config.marketplaceId,
    contentLanguage: input.config.contentLanguage,
    envAppToken: input.envAppToken ?? input.config.appAccessToken,
    userAccessToken: input.accessToken,
    userRefreshToken: input.refreshToken,
    tokenType: input.tokenType ?? 'Bearer',
    userAccessTokenExpiry: input.accessTokenExpiry ?? createDefaultAccessTokenExpiry(now),
    userRefreshTokenExpiry: input.refreshTokenExpiry ?? createDefaultRefreshTokenExpiry(now),
    scope: input.scope,
  };
}

/**
 * Inputs for merging a fresh eBay token response with any existing stored tokens.
 */
export interface CreateStoredUserTokensFromResponseInput {
  config: EbayConfig;
  envAppToken?: string;
  previousTokens?: StoredTokenData | null;
  tokenData: EbayUserTokenResponse;
  now?: number;
}

/**
 * Build stored token data from an eBay token endpoint response.
 */
export function createStoredUserTokensFromResponse(
  input: CreateStoredUserTokensFromResponseInput
): StoredTokenData {
  const now = input.now ?? Date.now();
  const previousTokens = input.previousTokens;

  return createStoredUserTokens({
    config: input.config,
    envAppToken: input.envAppToken ?? previousTokens?.envAppToken,
    accessToken: input.tokenData.access_token,
    refreshToken: input.tokenData.refresh_token ?? previousTokens?.userRefreshToken ?? '',
    tokenType: input.tokenData.token_type ?? previousTokens?.tokenType,
    accessTokenExpiry: createExpiryTimestamp(input.tokenData.expires_in, now),
    refreshTokenExpiry: input.tokenData.refresh_token_expires_in
      ? createExpiryTimestamp(input.tokenData.refresh_token_expires_in, now)
      : previousTokens?.userRefreshTokenExpiry,
    scope: input.tokenData.scope ?? previousTokens?.scope,
    now,
  });
}

function tokenExpiry(expiry: number | null | undefined) {
  if (!expiry) {
    return 'Not available';
  }

  return {
    timestamp: expiry,
    date: new Date(expiry).toISOString(),
    expired: Date.now() >= expiry,
  };
}

/**
 * Inputs used to render redacted credential and token status details.
 */
export interface CredentialDisplayInput {
  appAccessToken: string | null | undefined;
  appAccessTokenExpiry: number | null | undefined;
  authenticated: boolean;
  env: NodeJS.ProcessEnv;
  tokenInfo: {
    hasAppAccessToken: boolean;
    hasUserToken: boolean;
  };
  userTokens: StoredTokenData | null;
}

/**
 * Build redacted credential and token status data for auth diagnostics.
 */
export function buildCredentialDisplay(input: CredentialDisplayInput) {
  const { appAccessToken, appAccessTokenExpiry, authenticated, env, tokenInfo, userTokens } = input;
  const clientId = env.EBAY_CLIENT_ID ?? '';
  const clientSecret = env.EBAY_CLIENT_SECRET ?? '';
  const environment = env.EBAY_ENVIRONMENT ?? 'sandbox';
  const redirectUri = env.EBAY_REDIRECT_URI ?? '';
  const refreshToken = env.EBAY_USER_REFRESH_TOKEN ?? '';

  return {
    credentials: {
      clientId: clientId ? maskToken(clientId) : 'Not set',
      clientSecret: clientSecret ? '****** (set)' : 'Not set',
      environment,
      redirectUri: redirectUri || 'Not set',
    },
    tokens: {
      refreshToken: refreshToken ? maskToken(refreshToken) : 'Not set (in .env)',
      accessToken: userTokens?.userAccessToken
        ? maskToken(userTokens.userAccessToken)
        : 'Not available',
      accessTokenExpiry: tokenExpiry(userTokens?.userAccessTokenExpiry),
      refreshTokenExpiry: tokenExpiry(userTokens?.userRefreshTokenExpiry),
      appToken: appAccessToken ? maskToken(appAccessToken) : 'Not cached',
      appTokenExpiry: tokenExpiry(appAccessTokenExpiry),
    },
    status: {
      hasUserToken: tokenInfo.hasUserToken,
      hasAppAccessToken: tokenInfo.hasAppAccessToken,
      authenticated,
      currentTokenType: tokenInfo.hasUserToken
        ? 'user_token (10,000-50,000 req/day)'
        : tokenInfo.hasAppAccessToken
          ? 'app_access_token (1,000 req/day)'
          : 'none',
    },
    scopes: userTokens?.scope ? userTokens.scope.split(' ') : [],
  };
}
