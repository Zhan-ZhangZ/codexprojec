import { z } from 'zod';
import { buildCredentialDisplay, maskToken } from '@/auth/credential-session.js';
import { getOAuthAuthorizationUrl, validateScopes } from '@/config/environment.js';
import { defineTool } from '@/tools/define-tool.js';
import type { ToolEntry } from '@/tools/registry.js';
import { convertToTimestamp, validateTokenExpiry } from '@/utils/date-converter.js';
import { getErrorMessage } from '@/utils/errors.js';

/**
 * OAuth token management tools for consent URLs, token storage, refresh, status,
 * and date/expiry helpers. Several handlers read configuration from `process.env`
 * (e.g. `EBAY_CLIENT_ID`, `EBAY_REDIRECT_URI`) rather than the eBay API client.
 */
export const tokenManagementEntries: ToolEntry[] = [
  defineTool({
    name: 'ebay_get_oauth_url',
    description:
      'Generate the eBay OAuth authorization URL for user consent. The user should open this URL in a browser to grant permissions to the application. This supports the OAuth 2.0 Authorization Code grant flow. The redirect URI can be provided as a parameter or will be read from EBAY_REDIRECT_URI environment variable.\n\n' +
      'IMPORTANT: eBay has different OAuth scopes available for production vs sandbox environments:\n' +
      '- Sandbox includes additional Buy API scopes (e.g., buy.order.readonly, buy.guest.order, buy.shopping.cart) and extended Identity scopes\n' +
      '- Production includes sell.edelivery, commerce.message (explicit), and commerce.shipping scopes not available in sandbox\n' +
      '- If you provide custom scopes, they will be validated against the current environment (set via EBAY_ENVIRONMENT). Any scopes not valid for the environment will generate warnings.\n\n' +
      'OAUTH FLOW INSTRUCTIONS:\n' +
      '1. Generate OAuth URL with this tool (optionally specify scopes)\n' +
      '2. User opens URL in browser, authorizes, and gets redirected with a code parameter\n' +
      '3. Use ebay_exchange_authorization_code tool with the code (URL-encoded format accepted)\n' +
      '4. Tokens are automatically stored and will auto-refresh every 2 hours\n\n' +
      'COMMON SCOPES:\n' +
      '- Basic (always included): https://api.ebay.com/oauth/api_scope\n' +
      '- Inventory: https://api.ebay.com/oauth/api_scope/sell.inventory\n' +
      '- Inventory (readonly): https://api.ebay.com/oauth/api_scope/sell.inventory.readonly\n' +
      '- Account: https://api.ebay.com/oauth/api_scope/sell.account\n' +
      '- Fulfillment: https://api.ebay.com/oauth/api_scope/sell.fulfillment\n\n' +
      'TROUBLESHOOTING:\n' +
      '- Authorization codes expire in ~5 minutes - get fresh code if "invalid grant" error\n' +
      '- "Insufficient permissions" errors mean you need to re-authorize with additional scopes\n' +
      '- OAuth URL format: Use + to separate scopes (e.g., scope=scope1+scope2), not %2B\n' +
      '- Refresh tokens last 18 months and are saved to .env file for persistence',
    inputSchema: {
      redirectUri: z
        .string()
        .optional()
        .describe(
          'Optional redirect URI registered with your eBay application (RuName). If not provided, will use EBAY_REDIRECT_URI from .env file.'
        ),
      scopes: z
        .array(z.string())
        .optional()
        .describe(
          'Optional array of OAuth scopes. If not provided, uses environment-specific default scopes (production or sandbox based on EBAY_ENVIRONMENT). Custom scopes will be validated against the environment.'
        ),
      state: z.string().optional().describe('Optional state parameter for CSRF protection'),
    },
    handler: (_api, args) => {
      const clientId = process.env.EBAY_CLIENT_ID ?? '';
      const environment = (process.env.EBAY_ENVIRONMENT ?? 'sandbox') as 'production' | 'sandbox';
      const envRedirectUri = process.env.EBAY_REDIRECT_URI;

      const redirectUri = args.redirectUri ?? envRedirectUri;
      const scopes = args.scopes;
      const state = args.state;

      if (!clientId) {
        throw new Error('EBAY_CLIENT_ID environment variable is required to generate OAuth URL');
      }

      if (!redirectUri) {
        throw new Error(
          'Redirect URI is required. Either provide it as a parameter or set EBAY_REDIRECT_URI in your .env file.'
        );
      }

      let scopeWarnings: string[] = [];
      let validatedScopes = scopes;

      if (scopes && scopes.length > 0) {
        const validation = validateScopes(scopes, environment);
        scopeWarnings = validation.warnings;
        validatedScopes = validation.validScopes;
      }

      const authUrl = getOAuthAuthorizationUrl(
        clientId,
        redirectUri,
        environment,
        validatedScopes,
        state
      );

      const result: Record<string, unknown> = {
        authorizationUrl: authUrl,
        redirectUri,
        instructions:
          'Open this URL in a browser to authorize the application. After authorization, you will be redirected to your redirect URI with an authorization code that can be exchanged for an access token.',
        environment,
        scopes: scopes ?? 'default (all Sell API scopes)',
      };

      if (scopeWarnings.length > 0) {
        result.warnings = scopeWarnings;
      }

      return result;
    },
  }),
  defineTool({
    name: 'ebay_set_user_tokens',
    description:
      'Set the user access token and refresh token for authenticated API requests. These tokens should be obtained through the OAuth authorization code flow. Tokens will be persisted to disk and automatically refreshed when needed. User tokens provide higher rate limits (10,000-50,000 requests/day) compared to client credentials (1,000 requests/day).',
    inputSchema: {
      accessToken: z.string().describe('The user access token obtained from OAuth flow'),
      refreshToken: z.string().describe('The refresh token obtained from OAuth flow'),
    },
    handler: async (api, args) => {
      const { accessToken, refreshToken } = args;

      if (!accessToken || !refreshToken) {
        throw new Error('Both accessToken and refreshToken are required');
      }

      await api.setUserTokens(accessToken, refreshToken);

      return {
        success: true,
        message:
          'User tokens successfully stored. These tokens will be used for all subsequent API requests and will be automatically refreshed when needed.',
        tokenInfo: api.getTokenInfo(),
      };
    },
  }),
  defineTool({
    name: 'ebay_set_user_tokens_with_expiry',
    description:
      "Set user access and refresh tokens with custom expiry times. This is an enhanced version of ebay_set_user_tokens that accepts expiry times and can automatically refresh the access token if it's expired but the refresh token is valid. Useful when user provides tokens that may already be partially expired.",
    inputSchema: {
      accessToken: z.string().min(1).describe('eBay user access token'),
      refreshToken: z.string().min(1).describe('eBay user refresh token'),
      accessTokenExpiry: z
        .union([z.string(), z.number()])
        .optional()
        .describe(
          'Optional: Access token expiry time. If not provided, defaults to 2 hours from now. Can be ISO date string, Unix timestamp, or relative time (e.g., "in 7200 seconds")'
        ),
      refreshTokenExpiry: z
        .union([z.string(), z.number()])
        .optional()
        .describe(
          'Optional: Refresh token expiry time. If not provided, defaults to 18 months from now. Can be ISO date string, Unix timestamp, or relative time'
        ),
      autoRefresh: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          'If true and access token is expired but refresh token is valid, automatically refresh the access token. Default: true'
        ),
    },
    handler: async (api, args) => {
      const { accessToken, refreshToken, accessTokenExpiry, refreshTokenExpiry, autoRefresh } =
        args;

      if (!accessToken || !refreshToken) {
        throw new Error('Both accessToken and refreshToken are required');
      }

      try {
        let accessExpiry: number | undefined;
        let refreshExpiry: number | undefined;

        if (accessTokenExpiry !== undefined) {
          accessExpiry = convertToTimestamp(accessTokenExpiry);
        }

        if (refreshTokenExpiry !== undefined) {
          refreshExpiry = convertToTimestamp(refreshTokenExpiry);
        }

        await api.setUserTokens(accessToken, refreshToken, accessExpiry, refreshExpiry);

        // The OAuth client refreshes internally if the access token is expired.
        if (autoRefresh) {
          try {
            const authClient = api.getAuthClient().getOAuthClient();
            await authClient.getAccessToken();

            return {
              success: true,
              message:
                'User tokens stored successfully in memory. Access token validated and refreshed if needed. To persist tokens, update EBAY_USER_REFRESH_TOKEN in .env file.',
              tokenInfo: api.getTokenInfo(),
              refreshed: true,
            };
          } catch (refreshError) {
            return {
              success: true,
              message:
                'User tokens stored, but failed to validate/refresh access token. You may need to re-authorize.',
              tokenInfo: api.getTokenInfo(),
              refreshed: false,
              refreshError: getErrorMessage(refreshError),
            };
          }
        }

        return {
          success: true,
          message:
            'User tokens successfully stored in memory. These tokens will be used for all subsequent API requests and will be automatically refreshed when needed. To persist tokens, update EBAY_USER_REFRESH_TOKEN in .env file.',
          tokenInfo: api.getTokenInfo(),
          refreshed: false,
        };
      } catch (error) {
        throw new Error(`Failed to set user tokens: ${getErrorMessage(error, String(error))}`);
      }
    },
  }),
  defineTool({
    name: 'ebay_get_token_status',
    description:
      'Check the current OAuth token status. Returns information about whether user tokens or client credentials are being used, and whether tokens are valid.',
    inputSchema: {},
    handler: (api) => {
      const tokenInfo = api.getTokenInfo();
      const hasUserTokens = api.hasUserTokens();

      return {
        hasUserToken: tokenInfo.hasUserToken,
        hasAppAccessToken: tokenInfo.hasAppAccessToken,
        authenticated: api.isAuthenticated(),
        currentTokenType: tokenInfo.hasUserToken
          ? 'user_token (10,000-50,000 req/day)'
          : tokenInfo.hasAppAccessToken
            ? 'app_access_token (1,000 req/day)'
            : 'none',
        message: hasUserTokens
          ? 'Using user access token with automatic refresh'
          : 'Using app access token from client credentials flow (lower rate limits). Consider setting user tokens for higher rate limits.',
      };
    },
  }),
  defineTool({
    name: 'ebay_clear_tokens',
    description:
      'Clear all stored OAuth tokens (both user tokens and client credentials). This will require re-authentication for subsequent API calls.',
    inputSchema: {},
    handler: (api) => {
      const authClient = api.getAuthClient().getOAuthClient();
      authClient.clearAllTokens();

      return {
        success: true,
        message:
          'All tokens cleared successfully. You will need to re-authenticate for subsequent API calls.',
      };
    },
  }),
  defineTool({
    name: 'ebay_validate_token_expiry',
    description:
      'Validate token expiry times and get recommendations. Checks if access/refresh tokens are expired or expiring soon, and provides actionable recommendations (e.g., refresh access token, re-authorize user).',
    inputSchema: {
      accessTokenExpiry: z
        .union([z.string(), z.number()])
        .describe(
          'Access token expiry time. Can be ISO date string, Unix timestamp (seconds or milliseconds), or relative time'
        ),
      refreshTokenExpiry: z
        .union([z.string(), z.number()])
        .describe(
          'Refresh token expiry time. Can be ISO date string, Unix timestamp (seconds or milliseconds), or relative time'
        ),
    },
    handler: (_api, args) => {
      try {
        const accessExpiry = convertToTimestamp(args.accessTokenExpiry);
        const refreshExpiry = convertToTimestamp(args.refreshTokenExpiry);

        const validation = validateTokenExpiry(accessExpiry, refreshExpiry);

        return {
          ...validation,
          accessTokenExpiryTimestamp: accessExpiry,
          refreshTokenExpiryTimestamp: refreshExpiry,
          accessTokenExpiryDate: new Date(accessExpiry).toISOString(),
          refreshTokenExpiryDate: new Date(refreshExpiry).toISOString(),
        };
      } catch (error) {
        throw new Error(
          `Failed to validate token expiry: ${getErrorMessage(error, String(error))}`
        );
      }
    },
  }),
  defineTool({
    name: 'ebay_convert_date_to_timestamp',
    description:
      'Convert a date string or number to Unix timestamp (milliseconds). Supports ISO 8601 dates, Unix timestamps (seconds or milliseconds), and relative time (e.g., "in 2 hours", "in 7200 seconds"). Useful when setting token expiry times from user input.',
    inputSchema: {
      dateInput: z
        .union([z.string(), z.number()])
        .describe(
          'Date to convert. Supports ISO 8601 strings (e.g., "2025-01-15T10:30:00Z"), Unix timestamps (seconds or milliseconds), or relative time (e.g., "in 2 hours")'
        ),
    },
    handler: (_api, args) => {
      const { dateInput } = args;

      try {
        const timestamp = convertToTimestamp(dateInput);

        return {
          success: true,
          timestamp,
          input: dateInput,
          formattedDate: new Date(timestamp).toISOString(),
          message: `Successfully converted to timestamp: ${timestamp}ms (${new Date(timestamp).toISOString()})`,
        };
      } catch (error) {
        throw new Error(`Failed to convert date: ${getErrorMessage(error, String(error))}`);
      }
    },
  }),
  defineTool({
    name: 'ebay_display_credentials',
    description:
      'Display all eBay API credentials and current token information. Shows client ID, client secret (masked), environment (production/sandbox), redirect URI, and current token status including access token (masked), refresh token (masked), app token (masked), and their expiry times. Useful for debugging authentication issues and verifying configuration.',
    inputSchema: {},
    handler: (api) => {
      const tokenInfo = api.getTokenInfo();
      const authClient = api.getAuthClient().getOAuthClient();

      return buildCredentialDisplay({
        appAccessToken: authClient.getCachedAppAccessToken(),
        appAccessTokenExpiry: authClient.getCachedAppAccessTokenExpiry(),
        authenticated: api.isAuthenticated(),
        env: process.env,
        tokenInfo,
        userTokens: authClient.getUserTokens(),
      });
    },
  }),
  defineTool({
    name: 'ebay_refresh_access_token',
    description:
      'Manually refresh the user access token using the stored refresh token. This is useful when you want to proactively refresh an access token before it expires, or when recovering from authentication errors. Requires that user tokens are already set (either via EBAY_USER_REFRESH_TOKEN in .env or via ebay_set_user_tokens_with_expiry). Returns the new access token and expiry time.',
    inputSchema: {},
    outputSchema: {
      type: 'object',
      properties: {},
      description: 'Success response',
    },
    handler: async (api) => {
      const authClient = api.getAuthClient().getOAuthClient();

      if (!api.hasUserTokens()) {
        throw new Error(
          'No user tokens available. Please set user tokens first using ebay_set_user_tokens_with_expiry or add EBAY_USER_REFRESH_TOKEN to your .env file.'
        );
      }

      try {
        await authClient.refreshUserToken();

        const internalTokens = authClient.getUserTokens();

        return {
          success: true,
          message: 'Access token refreshed successfully',
          accessToken: internalTokens?.userAccessToken
            ? maskToken(internalTokens.userAccessToken)
            : 'Not available',
          accessTokenExpiry: internalTokens?.userAccessTokenExpiry
            ? {
                timestamp: internalTokens.userAccessTokenExpiry,
                date: new Date(internalTokens.userAccessTokenExpiry).toISOString(),
                expiresInSeconds: Math.floor(
                  (internalTokens.userAccessTokenExpiry - Date.now()) / 1000
                ),
              }
            : 'Not available',
          tokenInfo: api.getTokenInfo(),
        };
      } catch (error) {
        throw new Error(`Failed to refresh access token: ${getErrorMessage(error, String(error))}`);
      }
    },
  }),
  defineTool({
    name: 'ebay_exchange_authorization_code',
    description:
      'Exchange an OAuth authorization code for access and refresh tokens. This completes the OAuth 2.0 Authorization Code grant flow. After the user authorizes the application using the URL from ebay_get_oauth_url, eBay redirects back with an authorization code in the URL. Use this tool to exchange that code for tokens that can be used to make API calls. The tokens will be automatically stored and used for subsequent API requests.\n\n' +
      'IMPORTANT NOTES:\n' +
      '- Authorization codes expire in ~5 minutes - if you get "invalid grant" error, get a fresh code\n' +
      '- Codes can be URL-encoded (e.g., v%5E1.1%23...) - this tool automatically decodes them\n' +
      '- Extract the code parameter from the redirect URL (your RuName Accept URL): https://your-redirect-uri?code=YOUR_CODE&expires_in=299\n' +
      '- Tokens are saved to .env file and will auto-refresh every 2 hours\n' +
      '- Refresh tokens last 18 months before requiring re-authorization\n\n' +
      'COMMON ERRORS:\n' +
      '- "invalid or was issued to another client": Code expired, get fresh code\n' +
      '- "Insufficient permissions": Re-run OAuth flow with additional scopes in ebay_get_oauth_url\n\n' +
      'For complete OAuth guide with scopes, troubleshooting, and examples, see: docs/auth/OAUTH_QUICK_REFERENCE.md',
    inputSchema: {
      code: z
        .string()
        .min(1)
        .describe(
          'The authorization code received from eBay after user authorization. This is the "code" parameter in the redirect URL.'
        ),
    },
    outputSchema: {
      type: 'object',
      properties: {},
      description:
        'Token exchange response including access token, refresh token, and expiry times',
    },
    handler: async (api, args) => {
      const { code } = args;

      if (!code) {
        throw new Error('Authorization code is required');
      }

      try {
        // Codes arriving from a redirect URL may be percent-encoded.
        const decodedCode = code.includes('%') ? decodeURIComponent(code) : code;

        const authClient = api.getAuthClient().getOAuthClient();
        const tokenData = await authClient.exchangeCodeForToken(decodedCode);

        return {
          success: true,
          message:
            'Authorization code successfully exchanged for tokens. Tokens have been stored and will be used for subsequent API requests.',
          tokenData: {
            accessToken: maskToken(tokenData.access_token),
            refreshToken: maskToken(tokenData.refresh_token),
            expiresIn: tokenData.expires_in,
            refreshTokenExpiresIn: tokenData.refresh_token_expires_in,
            tokenType: tokenData.token_type,
            scope: tokenData.scope,
          },
          note: 'The refresh token has been saved to your .env file for future use.',
        };
      } catch (error) {
        throw new Error(
          `Failed to exchange authorization code: ${getErrorMessage(error, String(error))}`
        );
      }
    },
  }),
];
