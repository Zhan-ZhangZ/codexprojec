import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import nock from 'nock';
import dotenv from 'dotenv';
import * as fs from 'fs';
import type * as FsModule from 'fs';
import { mkdtempSync, promises as fsPromises, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { EbayOAuthClient } from '../../../src/auth/oauth.js';
import type { EbayConfig } from '../../../src/types/ebay.js';
import { mockOAuthTokenEndpoint, cleanupMocks } from '../../helpers/mock-http.js';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof FsModule>('fs');

  return {
    ...actual,
    writeFileSync: vi.fn(),
  };
});

describe('EbayOAuthClient', () => {
  let oauthClient: EbayOAuthClient;
  let config: EbayConfig;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    cleanupMocks();

    // Clear environment variables to prevent automatic token loading
    delete process.env.EBAY_USER_REFRESH_TOKEN;
    delete process.env.EBAY_USER_ACCESS_TOKEN;
    delete process.env.EBAY_APP_ACCESS_TOKEN;
    // Disable proxy to prevent axios from using it
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.http_proxy;
    delete process.env.https_proxy;

    // Enable nock to intercept HTTP requests
    nock.disableNetConnect();

    // Default config
    config = {
      clientId: 'test_client_id',
      clientSecret: 'test_client_secret',
      environment: 'sandbox',
      redirectUri: 'https://localhost/callback',
    };

    oauthClient = new EbayOAuthClient(config);
  });

  afterEach(() => {
    cleanupMocks();
    nock.enableNetConnect();
  });

  describe('initialize', () => {
    it('should load user tokens from environment if EBAY_USER_REFRESH_TOKEN is set', async () => {
      process.env.EBAY_USER_REFRESH_TOKEN = 'test_refresh_token';

      // Mock the refresh token endpoint
      mockOAuthTokenEndpoint('sandbox', {
        access_token: 'refreshed_access_token',
        token_type: 'Bearer',
        expires_in: 7200,
        refresh_token: 'test_refresh_token',
        refresh_token_expires_in: 47304000,
      });

      // Mock the app access token endpoint (called after user token refresh)
      mockOAuthTokenEndpoint('sandbox', {
        access_token: 'app_access_token',
        token_type: 'Bearer',
        expires_in: 7200,
      });

      await oauthClient.initialize();

      expect(oauthClient.hasUserTokens()).toBe(true);
    });

    it('should not load tokens if EBAY_USER_REFRESH_TOKEN is not set', async () => {
      await oauthClient.initialize();

      expect(oauthClient.hasUserTokens()).toBe(false);
    });

    it('should handle invalid refresh token in environment', async () => {
      process.env.EBAY_USER_REFRESH_TOKEN = 'invalid_refresh_token';

      // Mock failed refresh
      nock('https://api.sandbox.ebay.com')
        .post('/identity/v1/oauth2/token')
        .reply(400, { error: 'invalid_grant' });

      await oauthClient.initialize();

      expect(oauthClient.hasUserTokens()).toBe(false);
    });
  });

  describe('hasUserTokens', () => {
    it('should return true when user tokens are set via setUserTokens', async () => {
      await oauthClient.setUserTokens('access_token', 'refresh_token');

      expect(oauthClient.hasUserTokens()).toBe(true);
    });

    it('should return false when no user tokens are set', () => {
      expect(oauthClient.hasUserTokens()).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    it('should return valid user access token', async () => {
      const accessToken = 'user_access_token';
      const refreshToken = 'user_refresh_token';

      // Set tokens with future expiry
      const futureExpiry = Date.now() + 7200 * 1000;
      await oauthClient.setUserTokens(accessToken, refreshToken, futureExpiry);

      const token = await oauthClient.getAccessToken();

      expect(token).toBe(accessToken);
    });

    it('should refresh expired access token using valid refresh token', async () => {
      const newAccessToken = 'new_access_token';
      const refreshToken = 'user_refresh_token';

      // Set tokens with expired access token but valid refresh token
      const pastExpiry = Date.now() - 1000;
      const futureRefreshExpiry = Date.now() + 18 * 30 * 24 * 60 * 60 * 1000;
      await oauthClient.setUserTokens(
        'expired_token',
        refreshToken,
        pastExpiry,
        futureRefreshExpiry
      );

      // Mock refresh token API call
      mockOAuthTokenEndpoint('sandbox', {
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: 7200,
        refresh_token: refreshToken,
        refresh_token_expires_in: 47304000,
      });

      const token = await oauthClient.getAccessToken();

      expect(token).toBe(newAccessToken);
    });

    it('should throw error when both access and refresh tokens are expired', async () => {
      // Set tokens with both expired
      const pastExpiry = Date.now() - 1000;
      await oauthClient.setUserTokens('expired_access', 'expired_refresh', pastExpiry, pastExpiry);

      await expect(oauthClient.getAccessToken()).rejects.toThrow();
    });

    it('should fallback to client credentials when no user tokens', async () => {
      const clientToken = 'client_credentials_token';
      mockOAuthTokenEndpoint('sandbox', {
        access_token: clientToken,
        token_type: 'Bearer',
        expires_in: 7200,
      });

      const token = await oauthClient.getAccessToken();

      expect(token).toBe(clientToken);
    });

    it('should reuse cached client credentials token if still valid', async () => {
      const clientToken = 'client_credentials_token';
      mockOAuthTokenEndpoint('sandbox', {
        access_token: clientToken,
        token_type: 'Bearer',
        expires_in: 7200,
      });

      // First call - should fetch token
      const token1 = await oauthClient.getAccessToken();
      expect(token1).toBe(clientToken);

      // Second call - should use cached token (no new HTTP call)
      const token2 = await oauthClient.getAccessToken();
      expect(token2).toBe(clientToken);

      // Verify only one HTTP call was made
      expect(nock.pendingMocks().length).toBe(0);
    });
  });

  describe('setUserTokens', () => {
    it('should store user tokens in memory', async () => {
      const accessToken = 'user_access_token';
      const refreshToken = 'user_refresh_token';

      await oauthClient.setUserTokens(accessToken, refreshToken);

      expect(oauthClient.hasUserTokens()).toBe(true);

      // Verify tokens work by getting access token
      const token = await oauthClient.getAccessToken();
      expect(token).toBe(accessToken);
    });

    it('should set default expiry times when not provided', async () => {
      const accessToken = 'user_access_token';
      const refreshToken = 'user_refresh_token';

      await oauthClient.setUserTokens(accessToken, refreshToken);

      // Verify token is available (not expired)
      const token = await oauthClient.getAccessToken();
      expect(token).toBe(accessToken);
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should exchange authorization code for user tokens', async () => {
      const code = 'authorization_code_12345';
      const accessToken = 'exchanged_access_token';
      const refreshToken = 'exchanged_refresh_token';

      mockOAuthTokenEndpoint('sandbox', {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 7200,
        refresh_token: refreshToken,
        refresh_token_expires_in: 47304000,
        scope: 'https://api.ebay.com/oauth/api_scope/sell.inventory',
      });

      const result = await oauthClient.exchangeCodeForToken(code);

      expect(result.access_token).toBe(accessToken);
      expect(result.refresh_token).toBe(refreshToken);
      expect(oauthClient.hasUserTokens()).toBe(true);
    });

    it('should throw error if redirect URI is not configured', async () => {
      const configWithoutRedirect = { ...config, redirectUri: undefined };
      const clientWithoutRedirect = new EbayOAuthClient(configWithoutRedirect);

      await expect(clientWithoutRedirect.exchangeCodeForToken('code_12345')).rejects.toThrow(
        'Redirect URI is required'
      );
    });

    it('should handle OAuth exchange errors', async () => {
      const code = 'invalid_code';

      nock('https://api.sandbox.ebay.com').post('/identity/v1/oauth2/token').reply(400, {
        error: 'invalid_grant',
        error_description: 'Invalid authorization code',
      });

      await expect(oauthClient.exchangeCodeForToken(code)).rejects.toThrow(
        'Invalid authorization code'
      );
    });
  });

  describe('clearAllTokens', () => {
    it('should clear all tokens from memory', async () => {
      // Set tokens first
      await oauthClient.setUserTokens('access_token', 'refresh_token');
      expect(oauthClient.hasUserTokens()).toBe(true);

      await oauthClient.clearAllTokens();

      expect(oauthClient.hasUserTokens()).toBe(false);
    });
  });

  describe('getTokenInfo', () => {
    it('should return token status information when tokens are set', async () => {
      await oauthClient.setUserTokens('access_token', 'refresh_token');
      const info = oauthClient.getTokenInfo();

      expect(info.hasUserToken).toBe(true);
    });

    it('should return info when no tokens are available', () => {
      const info = oauthClient.getTokenInfo();

      expect(info.hasUserToken).toBe(false);
      expect(info.hasAppAccessToken).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when valid user tokens exist', async () => {
      const futureExpiry = Date.now() + 7200 * 1000;
      await oauthClient.setUserTokens('access_token', 'refresh_token', futureExpiry);

      expect(oauthClient.isAuthenticated()).toBe(true);
    });

    it('should return false when tokens are expired', async () => {
      const pastExpiry = Date.now() - 1000;
      await oauthClient.setUserTokens('expired_access', 'expired_refresh', pastExpiry, pastExpiry);

      expect(oauthClient.isAuthenticated()).toBe(false);
    });

    it('should return false when no tokens are available', () => {
      expect(oauthClient.isAuthenticated()).toBe(false);
    });
  });

  describe('OAuth token persistence (issues #113, #114)', () => {
    let originalCwd: string;
    let tempDir: string;

    const writeFileSyncMock = vi.mocked(fs.writeFileSync);

    /**
     * Locate the most recent fs.writeFileSync call targeting `.env`
     * and return its parsed content. Used to verify token persistence.
     */
    const getLastEnvWrite = (): {
      filePath: string;
      content: string;
      parsed: Record<string, string>;
    } => {
      const envWrite = [...writeFileSyncMock.mock.calls]
        .reverse()
        .find(([filePath]) => String(filePath).endsWith(`${path.sep}.env`));

      expect(envWrite).toBeDefined();

      const [filePath, content] = envWrite!;
      expect(String(filePath)).toMatch(/[\\/]\.env$/);
      expect(typeof content).toBe('string');

      const envContent = content as string;
      return {
        filePath: String(filePath),
        content: envContent,
        parsed: dotenv.parse(envContent),
      };
    };

    beforeEach(() => {
      originalCwd = process.cwd();
      tempDir = mkdtempSync(path.join(tmpdir(), 'ebay-oauth-persistence-'));
      process.chdir(tempDir);
      writeFileSyncMock.mockClear();
    });

    afterEach(() => {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
      writeFileSyncMock.mockClear();
      delete process.env.EBAY_USER_REFRESH_TOKEN;
      delete process.env.EBAY_USER_ACCESS_TOKEN;
    });

    it('exchangeCodeForToken persists both access and refresh tokens to .env (issue #113)', async () => {
      mockOAuthTokenEndpoint('sandbox', {
        access_token: 'AT1',
        token_type: 'Bearer',
        expires_in: 7200,
        refresh_token: 'RT1',
        refresh_token_expires_in: 47304000,
      });

      await oauthClient.exchangeCodeForToken('auth_code');

      const envWrite = getLastEnvWrite();
      expect(envWrite.content).toContain('EBAY_USER_ACCESS_TOKEN=AT1');
      expect(envWrite.content).toContain('EBAY_USER_REFRESH_TOKEN=RT1');
    });

    it('refreshUserToken persists in-memory refresh token to .env even when eBay omits refresh_token (issue #114)', async () => {
      process.env.EBAY_USER_REFRESH_TOKEN = 'stale_env_refresh';
      oauthClient.setUserTokens('old_access_token', 'in_memory_refresh');
      writeFileSyncMock.mockClear();

      mockOAuthTokenEndpoint('sandbox', {
        access_token: 'new_access_token',
        expires_in: 7200,
      });

      await oauthClient.refreshUserToken();

      const envWrite = getLastEnvWrite();
      expect(envWrite.parsed.EBAY_USER_ACCESS_TOKEN).toBe('new_access_token');
      expect(envWrite.parsed.EBAY_USER_REFRESH_TOKEN).toBe('in_memory_refresh');
      expect(envWrite.parsed.EBAY_USER_REFRESH_TOKEN).not.toBe('stale_env_refresh');
    });

    it('refreshUserToken persists same refresh token when in-memory differs from env (issue #114, no rotation case)', async () => {
      process.env.EBAY_USER_REFRESH_TOKEN = 'old_env_refresh';
      oauthClient.setUserTokens('old_access_token', 'fresh_oauth_refresh');
      writeFileSyncMock.mockClear();

      mockOAuthTokenEndpoint('sandbox', {
        access_token: 'new_access_token',
        expires_in: 7200,
        refresh_token: 'fresh_oauth_refresh',
      });

      await oauthClient.refreshUserToken();

      const envWrite = getLastEnvWrite();
      expect(envWrite.parsed.EBAY_USER_ACCESS_TOKEN).toBe('new_access_token');
      expect(envWrite.parsed.EBAY_USER_REFRESH_TOKEN).toBe('fresh_oauth_refresh');
    });

    it('refreshUserToken does NOT rewrite refresh token when in-memory matches env', async () => {
      process.env.EBAY_USER_REFRESH_TOKEN = 'same_refresh';
      await fsPromises.writeFile(
        path.join(tempDir, '.env'),
        'EBAY_USER_REFRESH_TOKEN=same_refresh\nEBAY_USER_ACCESS_TOKEN=old_access\n'
      );
      oauthClient.setUserTokens('old_access_token', 'same_refresh');
      writeFileSyncMock.mockClear();

      mockOAuthTokenEndpoint('sandbox', {
        access_token: 'new_access_token',
        expires_in: 7200,
      });

      await oauthClient.refreshUserToken();

      const envWrite = getLastEnvWrite();
      expect(envWrite.parsed.EBAY_USER_ACCESS_TOKEN).toBe('new_access_token');
      expect(envWrite.parsed.EBAY_USER_REFRESH_TOKEN).toBe('same_refresh');
    });
  });
});
